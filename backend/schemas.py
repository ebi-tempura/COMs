from datetime import date   
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
    category: str | None = Field (min_length=1, max_length=100)
    location: str | None  = Field (min_length=1, max_length=100)
    type: Literal ["Normal", "Emergency"] | None = None
    target_date: date | None = None

class WorkOrderRead (WorkOrderCreate):

    id:str
    status: Literal ["Draft"] = "Draft"
    type: Literal["Normal", "Emergency"] | None = None

#class WorkCompletitonCreate(BaseModel):

 #   workcompletiton: str = Field(min_length =1, max_length = 200)
  #  observations: str = Field(min_length =1, max_length = 200)
    # date_completion: date | None = Field ( default=None, alias="targetDate",)
