from datetime import  datetime
from pydantic import BaseModel, Field, ConfigDict


class UserCreate (BaseModel):
#
    #database_id: int =Field(min_length=1, max_length=200)
    account_id: str = Field(min_length=1, max_length=50)
    #account_database_id:   str = Field (min_length=1, max_length=18) 
    user_name: str = Field (min_length=1, max_length=50)
    email:str = Field (min_length=1, max_length=50)
    #
    auth_user_id: str = Field (min_length=1, max_length=100)
    #
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
