from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field 

class WorkOrderCreate(BaseModel):
    title: str = Field(min_length =1, max_length = 200,)
    supplier: str = Field(min_length =1, max_length = 200,)
    amount: Decimal = Field(gt =0)
    priority: Literal ["Low","Medium","High"]
    type: Literal ["Normal", "Emergency"]
    category: str = Field (default= None, min_length=1, max_length=100,)
    location: str  = Field (default= None, min_length=1, max_length=100,)
    description: str = Field (
        default = None,
        max_length = 2000,
    )
    target_date: date = None

class WorkOrderRead (WorkOrderCreate):

    created_at: datetime 
    id:str
    status: Literal ["Draft",
    "Pending President Approval",
    "Pending Treasurer Approval",
    "Approved",
    "Rejected",
    "In Progress",
    "Completed",]

#######################################
#######################################

class SupplierCreate(BaseModel):

    supplier_type:  str = Field (min_length=1, max_length=200,)
    supplier_name:  str = Field (min_length=1, max_length=200,)
    service_category:  str  = Field (min_length=1, max_length=200,)
    contact:  str = Field (min_length=1, max_length=200,)
    phone:  str = Field (min_length=1, max_length=30,)
    email:  str = Field (min_length=1, max_length=200,)
    RFC:  str = Field (min_length=12, max_length=13,)
    address:  str = Field (min_length=1, max_length=500,)
    clabe:  str = Field (min_length=18, max_length=18,)
    payment_method:  str  = Field (min_length=1, max_length=200,)
    Notes: str | None = Field (default=None, min_length=1, max_length=2000,)

class SupplierRead(SupplierCreate):   

    created_at: datetime
    supplier_id: str
    #status: str


class WorkEmergencyCreate (BaseModel):

    wo_emergency_what:  str = Field (min_length=1, max_length=500,)
    wo_emergency_where:  str = Field (min_length=1, max_length=500,)
    wo_emergency_when: date
    wo_emergency_who:  str = Field (min_length=1, max_length=500,)
    wo_emergency_why:  str = Field (min_length=1, max_length=500,)
    wo_emergency_howmany:  str = Field (min_length=1, max_length=500,)
    wo_emergency_howmuch:  str = Field (min_length=1, max_length=500,)

class WorkEmergencyRead (WorkEmergencyCreate): 

    created_at: datetime
    id:int
    status: str




class WorkCompletionCreate (BaseModel):
#   
    work_order_id: int = Field (gt =0)
    work_performed_date: date
    work_performed_description: str = Field (min_length=1, max_length=500,)
    work_performed_observation: str = Field (min_length=1, max_length=500,)


class WorkCompletionRead (WorkCompletionCreate):
#
    id:int
    work_order_id: int
    created_at: datetime = None

