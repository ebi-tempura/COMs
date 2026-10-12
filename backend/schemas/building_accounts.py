
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class BuildingAccountCreate (BaseModel):    
#
    #database_id: int = Field(min_length=1, max_length=50)
    account_id: str = Field (pattern=r"ACC-\d{3,}$", max_length=50)
    account_name: str = Field (min_length=1, max_length=200)
    building_name: str = Field (min_length=1, max_length=200)
    building_address: str = Field (min_length=1, max_length=200)
    account_status: str = Field (min_length=1, max_length=200)

class BuildingAccountRead (BuildingAccountCreate):
#
    database_id: int
    created_at: datetime = None
    
    model_config = ConfigDict(from_attributes = True)

