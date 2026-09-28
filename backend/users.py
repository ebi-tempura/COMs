import logging

from fastapi import Depends, HTTPException, APIRouter

from sqlalchemy import  select
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserRead
from routers.building_account import BuildingAccount

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

@router.post (
        "/api/users",
        response_model=UserRead,
        status_code=201,
)

def create_user(
    user : UserCreate,
    current_user: User = Depends(require_roles("Admin")),
    database: Session = Depends(get_db),
):
    statement = select (BuildingAccount).where(
        BuildingAccount.account_id == user.account_id
    )

    building_account = database.scalar(statement)

    if building_account is None:
        raise HTTPException(
            status_code=404,
            detail= "Building account not found"

        )
    
    record = User(
   #    account_database_id=building_account.account_database_id,
        account_id = current_user.account_id,
        user_name=user.user_name,
        email=user.email,
        #
        auth_user_id=user.auth_user_id,
        #
        first_name=user.first_name,
        last_name=user.last_name,
        user_role=user.user_role,
        status=user.status,
    )

    database.add(record)
    database.commit()
    database.refresh(record)

    return to_user_read(record)

@router.get (
        "/api/users",
        response_model=list[UserRead],
)

def read_user( 
    current_user: User = Depends(require_roles("Admin")),
    database: Session = Depends(get_db),

):
    statement = ( select(User)
    .where(User.account_id == current_user.account_id)
    .order_by(User.database_id)
     )

    records =database.scalars(statement).all()

    return[
        to_user_read(record)
        for record  in records
    ]
