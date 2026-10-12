from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class WorkOrderCreate(BaseModel):

    title: str = Field(min_length=1, max_length=200)
    # Human/API reference, e.g. SUP-2026-0004
    supplier_id: str = Field(min_length=1, max_length=20)
    amount: Decimal = Field(gt=0)
    priority: Literal["Low", "Medium", "High"]
    type: Literal["Normal", "Emergency"]
    category: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    target_date: date

class WorkOrderRead(BaseModel):

    database_id: int
    account_id: str
    work_order_number: str
    created_by_user_id: int | None = None

    title: str

    # What the API exposes
    supplier_id: str
    supplier_name: str

    amount: Decimal
    priority: Literal["Low", "Medium", "High"]
    type: Literal["Normal", "Emergency"]
    category: str
    location: str
    description: str
    target_date: date

    created_at: datetime | None = None

    status: Literal[
        "Draft",
        "Pending President Approval",
        "Pending Treasurer Approval",
        "Pending Board Member Approval",
        "Approved",
        "Rejected",
        "Rejected by President",
        "Rejected by Treasurer",
        "Rejected by Board Member",
        "In Progress",
        "Completed",
        "Needs Emergency Information",
    ]

    model_config = ConfigDict(from_attributes=True)



class WorkOrderAttachmentRead(BaseModel):
    database_id: int
    work_order_id: int
    attachment_number: str
    account_id: str
    uploaded_by_user_id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkOrderAttachmentUploadResult(BaseModel):
    file_index: int
    original_filename: str
    status_code: int
    error: str | None = None
    attachment: WorkOrderAttachmentRead | None = None

class WorkOrderAttachmentBatchRead(BaseModel):
    uploaded_count: int
    failed_count: int
    results: list[WorkOrderAttachmentUploadResult]


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
    emergency_number: str
    work_order_id:int
    status:str
    created_at: datetime
    created_by_user_id:int

    model_config = ConfigDict(from_attributes=True)

class WorkCompletionCreate (BaseModel):
#   
    #work_order_id: int = Field (gt =0)
    work_performed_date: date
    work_performed_description: str = Field (min_length=1, max_length=500,)
    work_performed_observation: str = Field (min_length=1, max_length=500,)

class WorkCompletionRead (WorkCompletionCreate):
#
    database_id: int
    completion_number: str
    work_order_id: int
    status:str
    created_at: datetime
    created_by_user_id: int

    model_config = ConfigDict(from_attributes=True)

