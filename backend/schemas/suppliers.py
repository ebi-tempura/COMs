from datetime import  datetime


from pydantic import BaseModel, Field, ConfigDict


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
    status: str
    created_by_user_id: int| None=None
    created_at: datetime = None
    supplier_id: str | None = None

    model_config = ConfigDict(from_attributes=True)
