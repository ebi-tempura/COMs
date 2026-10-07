import logging

from fastapi import Depends, HTTPException, APIRouter

from sqlalchemy import  select
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserRead
from models import BuildingAccount

from auth import get_supabase_user


router = APIRouter()

audit_logger = logging.getLogger(__name__)

#######################################
#Get current user  
#######################################

def get_current_user(request_user = Depends(get_supabase_user),
                      database: Session = Depends(get_db)) -> User:
    statement = select(User).where(
        User.auth_user_id == request_user.id
    )
    current_user = database.scalar(statement)

    if current_user is None:
        raise HTTPException(
            status_code=403,
            detail="COMS User not found",
        )

    if current_user.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="COMS User is not active"
        )

    if current_user.status is None:
        raise HTTPException(
            status_code=403,
            detail="COMS User not found"
        )

    account = database.scalar(select(BuildingAccount).where(BuildingAccount.account_id == current_user.account_id))
    if account is None or account.account_status != "Active":
        raise HTTPException(403, "Building account is not active")
    return current_user

def require_roles(*allowed_roles: str):
    def role_checker(
            current_user: User = Depends(get_current_user)):

        if current_user.user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="User does not have the required role"
            )
        return current_user
    return role_checker


def to_user_read(record: User) ->UserRead:
    return UserRead(
        database_id=record.database_id,
        account_id=record.account_id,
        user_name=record.user_name,
        email=record.email,
        first_name=record.first_name,
        last_name=record.last_name,
        user_role=record.user_role,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        last_login_at= record.last_login_at,
    )


# Legacy arbitrary identity creation is replaced by verified invitation acceptance.
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from sqlalchemy import update, func
from sqlalchemy.exc import IntegrityError
from models import AuditLog, UserInvitation
from schemas import (UserInvitationCreate, InvitationAccept, UserRoleChange, UserStatusChange)
from routers.building_account import verified_identity

router.tags = ["Users"]

def lock_account(database, account_id):
    # SQLite serializes writers; PostgreSQL locks this row until commit.
    database.execute(update(BuildingAccount).where(BuildingAccount.account_id == account_id)
                     .values(account_status=BuildingAccount.account_status))

def audit(database, actor, action, target, details, table="User_table"):
    database.add(AuditLog(account_id=actor.account_id, user_id=actor.auth_user_id,
        user_name=actor.user_name, user_role=actor.user_role, action=action,
        table_name=table, record_id=str(target), details=details))

def lock_admin(database, actor):
    lock_account(database, actor.account_id)
    database.refresh(actor)
    if actor.user_role != "Admin" or actor.status != "Active":
        raise HTTPException(403, "An active Admin is required")

def target_user(database, actor, user_id):
    lock_admin(database, actor)
    target = database.scalar(select(User).where(User.account_id == actor.account_id,
                                              User.database_id == user_id).execution_options(populate_existing=True))
    if target is None:
        raise HTTPException(404, "User not found")
    return target

def protect_last_admin(database, target):
    if target.status == "Active" and target.user_role == "Admin":
        others = database.scalar(select(User.database_id).where(User.account_id == target.account_id,
            User.user_role == "Admin", User.status == "Active", User.database_id != target.database_id))
        if others is None:
            raise HTTPException(409, "Keep at least one active Admin")

@router.get("/api/users", response_model=list[UserRead])
def read_user(current_user: User = Depends(require_roles("Admin", "Manager", "President", "Board Member")),
              database: Session = Depends(get_db)):
    return [to_user_read(u) for u in database.scalars(select(User).where(
        User.account_id == current_user.account_id).order_by(User.database_id)).all()]

@router.post("/api/users/invitations", status_code=201)
def invite_user(body: UserInvitationCreate, actor: User = Depends(require_roles("Admin")),
                database: Session = Depends(get_db)):
    lock_admin(database, actor)
    email = body.email.lower()
    now = datetime.now(timezone.utc)
    if database.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(409, "This email already belongs to a COMs account")
    if database.scalar(select(UserInvitation).where(UserInvitation.account_id == actor.account_id,
        UserInvitation.email == email, UserInvitation.accepted_at.is_(None),
        UserInvitation.revoked_at.is_(None), UserInvitation.expires_at > now)):
        raise HTTPException(409, "An unexpired invitation already exists; revoke it before inviting again")
    token = secrets.token_urlsafe(32)
    invitation = UserInvitation(account_id=actor.account_id, email=email, user_role=body.user_role,
        token_hash=sha256(token.encode()).hexdigest(), created_by_user_id=actor.database_id,
        expires_at=now + timedelta(days=7))
    database.add(invitation)
    database.flush()
    audit(database, actor, "Invited user", invitation.database_id,
          f"Invited {email} as {body.user_role}", "user_invitations")
    database.commit()
    # Only the creator receives the secret. It is never saved in plaintext or audited.
    return {"database_id": invitation.database_id, "email": email, "user_role": body.user_role,
            "expires_at": invitation.expires_at, "token": token}

@router.get("/api/users/invitations")
def list_invitations(actor: User = Depends(require_roles("Admin")), database: Session = Depends(get_db)):
    return [{"database_id": i.database_id, "email": i.email, "user_role": i.user_role,
             "expires_at": i.expires_at, "accepted_at": i.accepted_at, "revoked_at": i.revoked_at}
            for i in database.scalars(select(UserInvitation).where(UserInvitation.account_id == actor.account_id))]

@router.delete("/api/users/invitations/{invitation_id}", status_code=204)
def revoke_invitation(invitation_id: int, actor: User = Depends(require_roles("Admin")),
                      database: Session = Depends(get_db)):
    lock_admin(database, actor)
    invitation = database.scalar(select(UserInvitation).where(UserInvitation.account_id == actor.account_id,
        UserInvitation.database_id == invitation_id).execution_options(populate_existing=True))
    if invitation is None:
        raise HTTPException(404, "Invitation not found")
    if invitation.accepted_at:
        raise HTTPException(409, "Invitation already accepted")
    if invitation.revoked_at is None:
        invitation.revoked_at = datetime.now(timezone.utc)
        audit(database, actor, "Revoked invitation", invitation_id, "Invitation revoked", "user_invitations")
        database.commit()

@router.post("/api/users/invitations/accept", response_model=UserRead, status_code=201)
def accept_invitation(body: InvitationAccept, identity=Depends(get_supabase_user),
                      database: Session = Depends(get_db)):
    email = verified_identity(identity)
    invitation = database.scalar(select(UserInvitation).where(
        UserInvitation.token_hash == sha256(body.token.encode()).hexdigest()))
    if invitation is None:
        raise HTTPException(404, "Invitation not found")
    lock_account(database, invitation.account_id)
    database.refresh(invitation)
    now = datetime.now(timezone.utc)
    if invitation.accepted_at or invitation.revoked_at or invitation.expires_at.replace(tzinfo=timezone.utc) <= now:
        raise HTTPException(409, "Invitation has expired or is no longer available")
    if email != invitation.email:
        raise HTTPException(403, "Sign in with the invited email")
    account = database.scalar(select(BuildingAccount).where(BuildingAccount.account_id == invitation.account_id))
    if account.account_status != "Active":
        raise HTTPException(403, "Building account is not active")
    if database.scalar(select(User).where(User.auth_user_id == identity.id)):
        raise HTTPException(409, "This identity already belongs to a building account")
    user = User(account_id=invitation.account_id, auth_user_id=identity.id, email=email,
        user_role=invitation.user_role, status="Active", user_name=body.user_name,
        first_name=body.first_name, last_name=body.last_name)
    try:
        database.add(user)
        database.flush()
        invitation.accepted_at = now
        audit(database, user, "Accepted invitation", user.database_id, "User activated through verified invitation")
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(409, "This identity already belongs to a building account")
    return to_user_read(user)

@router.patch("/api/users/{user_id}/role", response_model=UserRead)
def change_role(user_id: int, body: UserRoleChange, actor: User = Depends(require_roles("Admin")),
                database: Session = Depends(get_db)):
    target = target_user(database, actor, user_id)
    old = target.user_role
    if old != body.user_role:
        protect_last_admin(database, target)
        audit(database, actor, "Changed user role", user_id, f"{old} -> {body.user_role}")
        target.user_role = body.user_role
        database.commit()
    return to_user_read(target)

@router.patch("/api/users/{user_id}/status", response_model=UserRead)
def change_status(user_id: int, body: UserStatusChange, actor: User = Depends(require_roles("Admin")),
                  database: Session = Depends(get_db)):
    target = target_user(database, actor, user_id)
    old = target.status
    if old != body.status:
        protect_last_admin(database, target)
        audit(database, actor, "Changed user status", user_id, f"{old} -> {body.status}")
        target.status = body.status
        database.commit()
    return to_user_read(target)
