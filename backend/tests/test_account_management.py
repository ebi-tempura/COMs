"""Exercise onboarding against an isolated DB; never call real Supabase."""
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'test-key')
os.environ.setdefault('SUPABASE_SECRET_KEY', 'test-secret')
from auth import get_supabase_user
from database import Base, get_db
from models import User, AuditLog, UserInvitation, BuildingAccount
from routers.building_account import router as accounts
from users import router as users, get_current_user

@pytest.fixture
def context():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
    # Scope the fixture to onboarding and referenced tables. The existing PO
    # model has an unrelated malformed CHECK expression (status IN (, ...)).
    Base.metadata.create_all(engine, tables=[Base.metadata.tables[n] for n in
        ('building_account', 'User_table', 'suppliers', 'work_orders', 'audit_trail', 'user_invitations')])
    identity = SimpleNamespace(id='admin-auth', email='admin@example.com', email_confirmed_at='confirmed')
    app = FastAPI()
    app.include_router(accounts)
    app.include_router(users)
    @app.get('/api/me')
    def me(user=__import__('fastapi').Depends(get_current_user)):
        return {'role': user.user_role}
    def db():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_db] = db
    app.dependency_overrides[get_supabase_user] = lambda: identity
    with TestClient(app) as client:
        yield client, engine, identity
    engine.dispose()

BODY = {'account_name': 'Condominium', 'building_name': 'Tower A', 'building_address': 'Mexico City',
        'first_name': 'First', 'last_name': 'Admin', 'user_name': 'Administrator'}

def register(client):
    response = client.post('/api/register', json=BODY)
    assert response.status_code == 201, response.text
    return response.json()

def invite(client, email='staff@example.com', role='Staff'):
    response = client.post('/api/users/invitations', json={'email': email, 'user_role': role})
    assert response.status_code == 201, response.text
    return response.json()

def accept(client, token):
    return client.post('/api/users/invitations/accept', json={'token': token,
        'first_name': 'New', 'last_name': 'User', 'user_name': 'New user'})

def test_registration_atomic_verified_and_server_owned(context):
    client, engine, identity = context
    identity.email_confirmed_at = None
    assert client.post('/api/register', json=BODY).status_code == 403
    identity.email_confirmed_at = 'confirmed'
    assert client.post('/api/register', json={**BODY, 'user_role': 'Super Admin'}).status_code == 422
    account = register(client)
    assert client.post('/api/register', json=BODY).status_code == 409
    with Session(engine) as db:
        assert len(db.scalars(select(BuildingAccount)).all()) == 1
        user = db.scalar(select(User))
        assert user.account_id == account['account_id'] and user.user_role == 'Admin'
        assert db.scalar(select(AuditLog)).action == 'Registered building account'
    assert client.get('/api/building-accounts').json()[0]['account_id'] == account['account_id']
    assert client.post('/api/users', json={}).status_code in (404, 405)
    anonymous = FastAPI(); anonymous.include_router(accounts)
    with TestClient(anonymous) as anon:
        assert anon.get('/api/building-accounts').status_code in (401, 403)

def test_invitation_identity_hash_single_use_and_rbac(context):
    client, engine, identity = context
    register(client)
    invitation = invite(client)
    assert client.post('/api/users/invitations', json={'email': 'staff@example.com', 'user_role': 'Staff'}).status_code == 409
    assert accept(client, invitation['token']).status_code == 403
    identity.id, identity.email = 'staff-auth', 'staff@example.com'
    identity.email_confirmed_at = None
    assert accept(client, invitation['token']).status_code == 403
    identity.email_confirmed_at = 'confirmed'
    user = accept(client, invitation['token'])
    assert user.status_code == 201, user.text
    assert accept(client, invitation['token']).status_code == 409
    assert client.post('/api/users/invitations', json={'email': 'x@example.com', 'user_role': 'Admin'}).status_code == 403
    assert client.patch('/api/users/1/role', json={'user_role': 'Manager'}).status_code == 403
    with Session(engine) as db:
        stored = db.scalar(select(UserInvitation))
        assert stored.token_hash != invitation['token'] and len(stored.token_hash) == 64
        assert stored.accepted_at
        assert invitation['token'] not in '\n'.join(a.details for a in db.scalars(select(AuditLog)))

def test_last_admin_deactivation_role_and_history(context):
    client, engine, identity = context
    register(client)
    admin = client.get('/api/users').json()[0]
    assert client.patch(f"/api/users/{admin['database_id']}/status", json={'status': 'Inactive'}).status_code == 409
    assert client.patch(f"/api/users/{admin['database_id']}/role", json={'user_role': 'Staff'}).status_code == 409
    invitation = invite(client)
    identity.id, identity.email = 'staff-auth', 'staff@example.com'
    user = accept(client, invitation['token']).json()
    identity.id, identity.email = 'admin-auth', 'admin@example.com'
    uid = user['database_id']
    assert client.patch(f'/api/users/{uid}/role', json={'user_role': 'Super Admin'}).status_code == 422
    assert client.patch(f'/api/users/{uid}/role', json={'user_role': 'Manager'}).status_code == 200
    assert client.patch(f'/api/users/{uid}/status', json={'status': 'Inactive'}).status_code == 200
    identity.id, identity.email = 'staff-auth', 'staff@example.com'
    assert client.get('/api/me').status_code == 403
    identity.id, identity.email = 'admin-auth', 'admin@example.com'
    assert client.patch(f'/api/users/{uid}/status', json={'status': 'Active'}).status_code == 200
    with Session(engine) as db:
        assert db.get(User, uid)
        actions = [a.action for a in db.scalars(select(AuditLog))]
        assert 'Changed user role' in actions and actions.count('Changed user status') == 2

def test_invitation_expiry_revocation_and_tenant_isolation(context):
    client, engine, identity = context
    first = register(client)
    expired = invite(client, 'expired@example.com')
    with Session(engine) as db:
        db.get(UserInvitation, expired['database_id']).expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    identity.id, identity.email = 'expired-auth', 'expired@example.com'
    assert accept(client, expired['token']).status_code == 409
    identity.id, identity.email = 'admin-auth', 'admin@example.com'
    revoked = invite(client, 'revoked@example.com')
    assert client.delete(f"/api/users/invitations/{revoked['database_id']}").status_code == 204
    identity.id, identity.email = 'revoked-auth', 'revoked@example.com'
    assert accept(client, revoked['token']).status_code == 409
    identity.id, identity.email = 'other-auth', 'other@example.com'
    second = register(client)
    assert second['account_id'] != first['account_id']
    assert len(client.get('/api/users').json()) == 1
    assert client.patch('/api/users/1/role', json={'user_role': 'Staff'}).status_code == 404
    assert client.delete(f"/api/users/invitations/{revoked['database_id']}").status_code == 404
    with Session(engine) as db:
        db.scalar(select(BuildingAccount).where(BuildingAccount.account_id == second['account_id'])).account_status = 'Inactive'
        db.commit()
    assert client.get('/api/me').status_code == 403

def test_admin_handover_allows_demotion_and_new_permissions(context):
    client, engine, identity = context
    register(client)
    invitation = invite(client, 'next@example.com', 'Admin')
    identity.id, identity.email = 'next-auth', 'next@example.com'
    next_admin = accept(client, invitation['token']).json()
    assert client.patch('/api/users/1/role', json={'user_role': 'Manager'}).status_code == 200
    identity.id, identity.email = 'admin-auth', 'admin@example.com'
    assert client.get('/api/users').status_code == 200
    assert client.patch(f"/api/users/{next_admin['database_id']}/status", json={'status': 'Inactive'}).status_code == 403
    assert client.get('/api/building-accounts').status_code == 403


def test_new_migration_upgrade_downgrade_preserves_existing_user(context):
    import importlib.util
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import inspect
    client, engine, identity = context
    register(client)
    path = Path(__file__).resolve().parents[1] / 'migrations/versions/f126a5c70801_user_invitations.py'
    spec = importlib.util.spec_from_file_location('invitation_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    UserInvitation.__table__.drop(engine)
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            module.upgrade()
            assert 'user_invitations' in inspect(connection).get_table_names()
            module.downgrade()
            assert 'user_invitations' not in inspect(connection).get_table_names()
    with Session(engine) as db:
        assert db.scalar(select(User)).user_role == 'Admin'


def test_account_registration_rolls_back_if_audit_fails(context):
    from sqlalchemy import text
    client, engine, identity = context
    with engine.begin() as connection:
        connection.execute(text("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_trail BEGIN SELECT RAISE(ABORT, 'test failure'); END"))
    assert client.post("/api/register", json=BODY).status_code == 409
    with Session(engine) as db:
        assert db.scalar(select(BuildingAccount)) is None
        assert db.scalar(select(User)) is None
