import re

from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from auth import get_supabase_user
from database import get_db
from models import BuildingAccount, User, AuditLog
from schemas.auth import AccountRegistration
from schemas.building_accounts import BuildingAccountRead

router = APIRouter(tags=["Building Account"])

def verified_identity(identity):
    if not identity.email or not identity.email_confirmed_at:
        raise HTTPException(403, "Confirm your email before joining COMs")
    if len(identity.email) > 50:
        raise HTTPException(422, "Email must contain at most 50 characters")
    return identity.email.strip().lower()
@router.post(
    "/api/register",
    status_code=201,
    response_model=BuildingAccountRead,
)
@router.post(
    "/api/building-accounts",
    status_code=201,
    response_model=BuildingAccountRead,
)
def create_building_account(
    body: AccountRegistration,
    identity=Depends(get_supabase_user),
    database: Session = Depends(get_db),
):
    email = verified_identity(identity)

    if database.scalar(
        select(User).where(User.auth_user_id == identity.id)
    ):
        raise HTTPException(
            409,
            "This identity already belongs to a building account",
        )

    try:
        account = BuildingAccount(
            # Temporary internal value, replaced before creating users.
            account_id=f"ACC-{uuid4().hex}",
            account_status="Active",
            account_name=body.account_name,
            building_name=body.building_name,
            building_address=body.building_address,
        )

        database.add(account)
        database.flush()

        # The insert above acquires SQLite's write lock.
        # Read and assign the next number in the same transaction.
        existing_ids = database.scalars(
            select(BuildingAccount.account_id)
        ).all()

        highest_number = 0

        for existing_id in existing_ids:
            match = re.fullmatch(r"ACC-(\d+)", existing_id)

            if match:
                highest_number = max(
                    highest_number,
                    int(match.group(1)),
                )

        account.account_id = f"ACC-{highest_number + 1:03d}"
        database.flush()

        admin = User(
            account_id=account.account_id,
            auth_user_id=identity.id,
            email=email,
            user_name=body.user_name,
            first_name=body.first_name,
            last_name=body.last_name,
            user_role="Admin",
            status="Active",
        )

        database.add(admin)
        database.flush()

        database.add(
            AuditLog(
                account_id=account.account_id,
                user_id=identity.id,
                user_name=admin.user_name,
                user_role="Admin",
                action="Registered building account",
                table_name="building_account",
                record_id=account.account_id,
                details=(
                    "Building account and first Admin created together"
                ),
            )
        )

        database.commit()

    except IntegrityError:
        database.rollback()
        raise HTTPException(
            409,
            "Registration could not be completed because of a data conflict",
        ) from None

    except Exception:
        database.rollback()
        raise

    return BuildingAccountRead.model_validate(account)