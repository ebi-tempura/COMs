from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class PurchaseOrderCreate(BaseModel):
    work_order_number: str | None= None
    supplier_id: str = Field(min_length=1)
    title:str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )
    priority: Literal ["Low","Medium","High"]

class PurchaseOrderReject(BaseModel):
    comment: str = Field(min_length=1)

class PurchaseOrderRead(BaseModel):
    database_id: int
    account_id: str
    purchase_order_number: str
    title: str
    created_year: int
    work_order_number: str | None
    supplier_id: str
    description: str
    amount: Decimal
    status: str
    created_at: datetime
    created_by_user_id: int

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderAttachmentRead(BaseModel):
    database_id: int
    attachment_number: str
    purchase_order_id: int
    account_id: str
    uploaded_by_user_id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderAttachmentUploadResult(BaseModel):
    file_index: int
    original_filename: str
    status_code: int
    error: str | None = None
    attachment: PurchaseOrderAttachmentRead | None = None

class PurchaseOrderAttachmentBatchRead(BaseModel):
    uploaded_count: int
    failed_count: int
    results: list[PurchaseOrderAttachmentUploadResult]


