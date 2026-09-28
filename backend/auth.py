import os

from dotenv import load_dotenv
from pathlib import Path
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client
from supabase.client import ClientOptions

load_dotenv(Path(__file__).resolve().parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables are missing")


supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)

security = HTTPBearer()

SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_SECRET_KEY:
    raise RuntimeError("SUPABASE_SECRET_KEY is not configured")

supabase_storage = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    options=ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
    ),
)

WORK_ORDER_ATTACHMENTS_BUCKET = "work-order-attachments"

def get_supabase_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)

        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return response.user

    except Exception as error:
        print(f"Error validating token: error")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )
