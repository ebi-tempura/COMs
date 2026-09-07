import os

from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables are missing")


supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)

security = HTTPBearer()


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
