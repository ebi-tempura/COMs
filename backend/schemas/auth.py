from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


# Account onboarding never accepts tenant IDs, roles or authentication IDs.
UserRole = Literal["Resident", "Staff", "Manager", "President", "Board Member", "Treasurer", "Admin"]

class AccountRegistration(BaseModel):
    
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    account_name: str = Field(min_length=1, max_length=200)
    building_name: str = Field(min_length=1, max_length=200)
    building_address: str = Field(min_length=1, max_length=200)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    user_name: str = Field(min_length=1, max_length=50)

class UserInvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=3, max_length=50, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    user_role: UserRole

class InvitationAccept(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    token: str = Field(min_length=32, max_length=200)
    user_name: str = Field(min_length=1, max_length=50)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)

class UserRoleChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_role: UserRole

class UserStatusChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["Active", "Inactive"]

class AuthSignupCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

class AuthSignupRead(BaseModel):
    message: str
    access_token: str | None = None
    token_type: str | None = None

class AuthSignupCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

class AuthSignupRead(BaseModel):
    message: str
    access_token: str | None = None
    token_type: str | None = None

class AuthLoginCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class AuthSessionRead(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class AuthLogoutCreate(BaseModel):
    refresh_token: str = Field(min_length=1)

class AuthPasswordResetCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)

class AuthPasswordUpdateCreate(BaseModel):
    refresh_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

class AuthMessageRead(BaseModel):
    message: str    