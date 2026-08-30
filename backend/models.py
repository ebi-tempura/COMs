from decimal import Decimal
from datetime import date, datetime, timezone

from sqlalchemy import (Date, DateTime, ForeignKey, Integer, Numeric, String)
from sqlalchemy.orm import Mapped, mapped_column,relationship

from database import Base

class BuildingAccount(Base):
    __tablename__="building_account"
    __table_args__={"sqlite_autoincrement":True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(50),unique=True,index=True,nullable=False)
    account_name: Mapped[str] = mapped_column(String(200),nullable=False)
    building_name: Mapped[str] = mapped_column(String(200),nullable=False)
    building_address: Mapped[str] = mapped_column(String(200),nullable=False)
    account_status: Mapped[str] = mapped_column(String(200),nullable=False)

    created_at: Mapped [datetime] = mapped_column (DateTime(timezone = True), 
            default = lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    #Reverse relationships

    users:Mapped [list ["User"]] = relationship(back_populates= "building_account")
    work_orders:Mapped [list ["WorkOrder"]] = relationship(back_populates= "building_account")
    #work_order_completions:Mapped [list ["WorkCompletion"]] = relationship(back_populates= "building_account")
    #emergency_work_orders:Mapped [list ["EmergencyWorkOrder"]] = relationship(back_populates= "building_account")
    suppliers:Mapped [list ["Supplier"]] = relationship(back_populates= "building_account")

class User (Base):
    __tablename__= "User_table"
    __table_args__= {"sqlite_autoincrement":True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("building_account.account_id"),nullable=False,index=True,)
#   account_database_id: Mapped[int] = mapped_column(ForeignKey("building_account.database_id"),index=True, nullable=False)

    user_name: Mapped[str] = mapped_column(String(50),nullable=False)
    email: Mapped[str] = mapped_column(String(50),nullable=False)
    password_hash: Mapped[str] = mapped_column(String(250),nullable=False)
    first_name: Mapped[str] = mapped_column(String(50),nullable=False)
    last_name: Mapped[str] = mapped_column(String(50),nullable=False)
    user_role: Mapped[str] = mapped_column(String(50),nullable=False)
    status: Mapped[str] = mapped_column(String(50),nullable=False)

    created_at: Mapped [datetime] = mapped_column (DateTime(timezone = True), 
            default = lambda: datetime.now(timezone.utc),
            nullable=False,
        )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
)
    last_login_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
    )
#Reverse relationships

    building_account:Mapped ["BuildingAccount"] = relationship(back_populates= "users")
    
class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = {"sqlite_autoincrement": True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_database_id: Mapped[int] = mapped_column(ForeignKey("building_account.database_id"),index=True, nullable=False)

    created_at: Mapped [datetime] = mapped_column (
        DateTime(timezone = True), 
        default = lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    work_order_number: Mapped[str | None] = mapped_column(
    String(20), 
    unique=True,
    index=True,
    nullable=True,
    )
    created_year: Mapped[int]

    title: Mapped[str] = mapped_column(String(200),nullable=False,)
    supplier: Mapped[str] = mapped_column(String(200),nullable=False,)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2),nullable=False,)
    priority: Mapped[str] = mapped_column(String(20),nullable=False,)
    status: Mapped[str] = mapped_column(
        String(50),
        default="Draft",
        server_default="Draft",
        nullable=False,
    )
    description: Mapped[str ] = mapped_column(String(2000), nullable = False,)
    type:Mapped[str] = mapped_column(String(20), nullable=False,)
    category: Mapped[str] =mapped_column(String(100), nullable= False,)
    location:  Mapped[str] =mapped_column(String(200), nullable= False,)
    target_date:  Mapped[date] =mapped_column(Date, nullable= False,)

#Reverse relationships

    building_account:Mapped ["BuildingAccount"] = relationship(back_populates= "work_orders")   

class WorkCompletion(Base):

    __tablename__ = "work_order_completion"
    __table_args__= {"sqlite_autoincrement": True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    
    work_order_id: Mapped[int] = mapped_column(
    ForeignKey("work_orders.database_id"),
    nullable=False,
    index=True,
    )

    created_at: Mapped [datetime] = mapped_column (
        DateTime(timezone=True), 
        default = lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    work_performed_description: Mapped[str] = mapped_column(String(500), nullable= False,)
    work_performed_observation: Mapped[str] = mapped_column(String(500), nullable= False,)
    work_performed_date: Mapped[date] = mapped_column(Date, nullable= False,)

#Reverse relationships

    #building_account:Mapped ["BuildingAccount"] = relationship(back_populates= "work_order_completions")   

class EmergencyWorkOrder(Base):

    __tablename__ = "work_order_emergency"
    __table_args__= {"sqlite_autoincrement": True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    work_order_id: Mapped[int] = mapped_column(
    ForeignKey("work_orders.database_id"),
    nullable=False,
    index=True,
    )
    created_at: Mapped [datetime] = mapped_column (
        DateTime(timezone=True), 
        default = lambda: datetime.now(timezone.utc),
        nullable=False,
    )      
    wo_emergency_what: Mapped[str] = mapped_column(String(500), nullable= False,)
    wo_emergency_where: Mapped[str] = mapped_column(String(500), nullable= False,)
    wo_emergency_when: Mapped[date] = mapped_column(Date, nullable= False,)
    wo_emergency_who: Mapped[str] = mapped_column(String(500), nullable= False,)
    wo_emergency_why: Mapped[str] = mapped_column(String(500), nullable= False,)
    wo_emergency_howmany: Mapped[str] = mapped_column(String(500), nullable= False,)
    wo_emergency_howmuch: Mapped[str] = mapped_column(String(500), nullable= False,)

#Reverse relationships

   # building_account:Mapped ["BuildingAccount"] = relationship(back_populates= "emergency_work_orders")
    
class Supplier(Base):

    __tablename__ = "suppliers"
    __table_args__= {"sqlite_autoincrement": True}

    database_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_database_id: Mapped[int] = mapped_column(ForeignKey("building_account.database_id"),index=True, nullable=False)

    created_at: Mapped [datetime] = mapped_column (
        DateTime(timezone=True), 
        default = lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    supplier_id: Mapped[str| None] = mapped_column( String(20),unique=True,index=True, nullable=True,)    
    supplier_type: Mapped[str] = mapped_column(String(200), nullable = False,)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable = False,)
    service_category: Mapped[str] = mapped_column(String(200), nullable = False,)
    contact: Mapped[str] = mapped_column(String(200), nullable = False,)
    phone: Mapped[str] = mapped_column(String(30), nullable = False,)
    email: Mapped[str] = mapped_column(String(200), unique= True, nullable = False,)
    rfc: Mapped[str] = mapped_column(String(13), unique=True, nullable = False,)
    address: Mapped[str] = mapped_column(String(500), nullable = False,)
    clabe: Mapped[str] = mapped_column( String(18),unique=True,nullable=False,)
    payment_method: Mapped[str] = mapped_column(String(200), nullable = False,)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable = True,)

#Reverse relationships

    building_account:Mapped ["BuildingAccount"] = relationship(back_populates= "suppliers")
    
    