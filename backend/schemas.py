from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict

#######################################

class BuildingAccountCreate (BaseModel):
#
    #database_id: int = Field(min_length=1, max_length=50)
    account_id: str = Field (min_length=1, max_length=50)
    account_name: str = Field (min_length=1, max_length=200)
    building_name: str = Field (min_length=1, max_length=200)
    building_address: str = Field (min_length=1, max_length=200)
    account_status: str = Field (min_length=1, max_length=200)

class BuildingAccountRead (BuildingAccountCreate):
#
    database_id: int
    created_at: datetime = None
    
    model_config = ConfigDict(from_attributes = True)

#######################################
#######################################

class UserCreate (BaseModel):
#
    #database_id: int =Field(min_length=1, max_length=200)
    account_id: str = Field(min_length=1, max_length=50)
    #account_database_id:   str = Field (min_length=1, max_length=18) 
    user_name: str = Field (min_length=1, max_length=50)
    email:str = Field (min_length=1, max_length=50)
    password: str = Field (min_length=1, max_length=50)
    first_name: str = Field (min_length=1, max_length=50)
    last_name: str = Field (min_length=1, max_length=50)
    user_role: str = Field (min_length=1, max_length=50)
    status: str = Field (min_length=1, max_length=50)
    
class UserRead (BaseModel):
#
    database_id: int
    account_id: str
    user_name: str
    email:str
    first_name:str
    last_name:str
    user_role:str
    status:str
    created_at: datetime = None
    updated_at: datetime = None
    last_login_at: datetime | None = None

    model_config = ConfigDict (from_attributes = True)

#######################################
#######################################

class WorkOrderCreate(BaseModel):

    account_id: str = Field(min_length=1, max_length=50)
    #
    title: str = Field(min_length =1, max_length = 200,)
    supplier: str = Field(min_length =1, max_length = 200,)
    amount: Decimal = Field(gt =0)
    priority: Literal ["Low","Medium","High"]
    type: Literal ["Normal", "Emergency"]
    category: str = Field (min_length=1, max_length=100,)
    location: str  = Field ( min_length=1, max_length=100,)
    description: str = Field (min_length=1, max_length = 2000,)
    target_date: date

class WorkOrderRead (WorkOrderCreate):

    database_id: int
    account_id: str
    work_order_number:str
    #
    created_at: datetime = None
    status: Literal ["Draft","Pending President Approval",
    "Pending Treasurer Approval","Approved","Rejected",
    "In Progress","Completed",]

    model_config = ConfigDict(from_attributes=True)

#######################################
#######################################

class SupplierCreate(BaseModel):

    account_id: str = Field(min_length=1, max_length=50)
    #
    supplier_type:  str = Field (min_length=1, max_length=200,)
    supplier_name:  str = Field (min_length=1, max_length=200,)
    service_category:  str  = Field (min_length=1, max_length=200,)
    contact:  str = Field (min_length=1, max_length=200,)
    phone:  str = Field (min_length=1, max_length=30,)
    email:  str = Field (min_length=1, max_length=200,)
    rfc:  str = Field (min_length=12, max_length=13,)
    address:  str = Field (min_length=1, max_length=500,)
    clabe:  str = Field (min_length=18, max_length=18,)
    payment_method:  str  = Field (min_length=1, max_length=200,)
    notes: str | None = Field (default=None, min_length=1, max_length=2000,)

class SupplierRead(SupplierCreate):   

    database_id: int
    account_id: str
    #
    created_at: datetime = None
    supplier_id: str | None = None

    model_config = ConfigDict(from_attributes=True)

#######################################
#######################################

class WorkEmergencyCreate (BaseModel):

    wo_emergency_what:  str = Field (min_length=1, max_length=500,)
    wo_emergency_where:  str = Field (min_length=1, max_length=500,)
    wo_emergency_when: date
    wo_emergency_who:  str = Field (min_length=1, max_length=500,)
    wo_emergency_why:  str = Field (min_length=1, max_length=500,)
    wo_emergency_howmany:  str = Field (min_length=1, max_length=500,)
    wo_emergency_howmuch:  str = Field (min_length=1, max_length=500,)

class WorkEmergencyRead (WorkEmergencyCreate): 

    database_id: int
    work_order_id:int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

#######################################
#######################################

class WorkCompletionCreate (BaseModel):
#   
    #work_order_id: int = Field (gt =0)
    work_performed_date: date
    work_performed_description: str = Field (min_length=1, max_length=500,)
    work_performed_observation: str = Field (min_length=1, max_length=500,)

class WorkCompletionRead (WorkCompletionCreate):
#
    database_id: int
    work_order_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

#######################################
#######################################
