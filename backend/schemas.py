from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field 

class WorkOrderCreate(BaseModel):

    title: str = Field(min_length =1, max_length = 200)
    supplier: str = Field(min_length =1, max_length = 200)
    amount: Decimal = Field(gt =0)
    prioritys: Literal ["Low","Medium","High"]