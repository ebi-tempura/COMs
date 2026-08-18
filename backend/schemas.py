from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field 

class WorkOrderCreate(BaseModel):

    title: str = Field(min_length =1, max_length = 200)
    supplier: str = Field(min_length =1, max_length = 200)
    amount: Decimal = Field(gt =0)
    description: str | None = Field (
        default = None,
        max_length = 2000,
    )
    priority: Literal ["Low","Medium","High"]

class WorkOrderRead (WorkOrderCreate):
    id:str
    status: Literal ["Draft"] = "Draft"

    