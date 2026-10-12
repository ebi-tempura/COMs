from datetime import date, datetime,timezone
from pydantic import BaseModel, Field, ConfigDict

class AuditLogCreate (BaseModel):
    account_id: str = Field (min_length=1, max_length=50)
    user_id: str = Field (min_length=1, max_length=50)
    #
    user_name: str = Field (min_length=1, max_length= 50)
    user_role: str = Field (min_length=1, max_length= 50)
    #
    action: str = Field (min_length=1, max_length=50)
    table_name: str = Field (min_length=1, max_length=50)
    record_id: str = Field (min_length=1, max_length=50)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLogRead (AuditLogCreate):
    database_id: int
    account_id: str
    user_id: str
    user_name: str
    user_role: str
    action: str
    table_name: str
    record_id: str
    details: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

