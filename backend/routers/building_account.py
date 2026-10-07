from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from auth import get_supabase_user
from database import get_db
from models import BuildingAccount, User, AuditLog
from schemas import AccountRegistration, BuildingAccountRead

router = APIRouter(tags=["Building Account"])

def verified_identity(identity):
    if not identity.email or not identity.email_confirmed_at:
        raise HTTPException(403, "Confirm your email before joining COMs")
    if len(identity.email) > 50:
        raise HTTPException(422, "Email must contain at most 50 characters")
    return identity.email.strip().lower()

@router.post("/api/register", status_code=201, response_model=BuildingAccountRead)
@router.post("/api/building-accounts", status_code=201, response_model=BuildingAccountRead)
def create_building_account(body: AccountRegistration,
                           identity=Depends(get_supabase_user),
                           database: Session = Depends(get_db)):
    email = verified_identity(identity)
    if database.scalar(select(User).where(User.auth_user_id == identity.id)):
        raise HTTPException(409, "This identity already belongs to a building account")
    account = BuildingAccount(account_id=f"ACC-{uuid4().hex}", account_status="Active",
        account_name=body.account_name, building_name=body.building_name,
        building_address=body.building_address)
    try:
        database.add(account)
        database.flush()
        admin = User(account_id=account.account_id, auth_user_id=identity.id, email=email,
            user_name=body.user_name, first_name=body.first_name, last_name=body.last_name,
            user_role="Admin", status="Active")
        database.add(admin)
        database.flush()
        database.add(AuditLog(account_id=account.account_id, user_id=identity.id,
            user_name=admin.user_name, user_role="Admin", action="Registered building account",
            table_name="building_account", record_id=account.account_id,
            details="Building account and first Admin created together"))
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(409, "Registration could not be completed because of a data conflict")
    return BuildingAccountRead.model_validate(account)

@router.get("/api/building-accounts", response_model=list[BuildingAccountRead])
def read_building_account(identity=Depends(get_supabase_user), database: Session = Depends(get_db)):
    # Import here to avoid a circular dependency with users.
    from users import get_current_user
    user = get_current_user(identity, database)
    if user.user_role != "Admin":
        raise HTTPException(403, "User does not have the required role")
    account = database.scalar(select(BuildingAccount).where(BuildingAccount.account_id == user.account_id))
    return [BuildingAccountRead.model_validate(account)]
