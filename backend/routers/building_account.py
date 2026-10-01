from fastapi import Depends, APIRouter

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import BuildingAccount
from schemas import BuildingAccountCreate, BuildingAccountRead

router = APIRouter(
    prefix="/api/building_account",
    tags=["Building Account"],
)

def to_building_account_read(record: BuildingAccount) ->BuildingAccountRead:
    return BuildingAccountRead(
        database_id=record.database_id,
        account_id=record.account_id,
        account_name=record.account_name,
        building_name=record.building_name,
        building_address=record.building_address,
        account_status=record.account_status,
        created_at=record.created_at,
    )

@router.post (
        "/api/building-accounts",
        response_model=BuildingAccountRead,
        status_code=201,
)

def create_building_account(
    building_account: BuildingAccountCreate,
    database: Session = Depends(get_db),
):
    record = BuildingAccount(
        account_id=building_account.account_id,
        account_name=building_account.account_name,
        building_name=building_account.building_name,
        building_address=building_account.building_address,
        account_status=building_account.account_status,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_building_account_read(record)

@router.get (
        "/api/building-accounts",
        response_model=list[BuildingAccountRead],
)

def read_building_account(
    database: Session = Depends(get_db)
):
    statement =select(BuildingAccount).order_by(
        BuildingAccount.database_id
    )

    records =database.scalars(statement).all()

    return[
        to_building_account_read(record)
        for record in records
    ]
