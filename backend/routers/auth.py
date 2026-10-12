import logging
import os
from contextlib import contextmanager

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from supabase import create_client
from supabase.client import ClientOptions
from supabase_auth.errors import AuthApiError

from auth import SUPABASE_URL, SUPABASE_KEY

from schemas.auth import (
    AuthSignupCreate,
    AuthSignupRead,
    AuthLoginCreate,
    AuthSessionRead,
    AuthLogoutCreate,
    AuthPasswordResetCreate,
    AuthPasswordUpdateCreate,
    AuthMessageRead,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

logger = logging.getLogger(__name__)
session_security = HTTPBearer()


def create_auth_client():
    # Use a separate client for each request.
    return create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )

def validate_email(value: str) -> str:
    email = value.strip()

    if (
        email.count("@") != 1
        or any(character.isspace() for character in email)
        or not all(email.split("@"))
    ):
        raise HTTPException(
            status_code=422,
            detail="Enter a valid email address.",
        )

    return email

@contextmanager
def handle_auth_errors(
    status_code=400,
    detail="Authentication request failed.",
):
    try:
        yield

    except HTTPException:
        raise

    except AuthApiError as error:
        provider_status = str(error.status)

        if provider_status == "429":
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Try again later.",
            ) from None

        if provider_status.startswith("5"):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Authentication service unavailable. "
                    "Try again later."
                ),
            ) from None

        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from None

    except Exception:
        # Do not log credentials or tokens.
        logger.error("Unexpected authentication service failure.")

        raise HTTPException(
            status_code=502,
            detail=(
                "Authentication service unavailable. "
                "Try again later."
            ),
        ) from None

@router.post(
    "/signup",
    response_model=AuthSignupRead,
    status_code=202,
)
def signup(payload: AuthSignupCreate):
    email = validate_email(payload.email)

    with handle_auth_errors(
        detail=(
            "Signup could not be completed. Check your email, "
            "password, and whether you already have a login."
        ),
    ):
        client = create_auth_client()

        response = client.auth.sign_up(
            {
                "email": email,
                "password": payload.password,
                "options": {"email_redirect_to": "http://localhost:5173/auth/confirm"}
            },
        )

        if response.session is not None:
            return AuthSignupRead(
                message=(
                    "Authentication session created. Use the access "
                    "token to register your building account."
                ),
                access_token=response.session.access_token,
                token_type=response.session.token_type,
            )

        return AuthSignupRead(
            message=(
                "Signup request processed. Check your email for "
                "confirmation. If you already have a login, "
                "sign in instead."
            ),
        )

@router.post(
    "/login",
    response_model=AuthSessionRead,
)
def login(payload: AuthLoginCreate):
    email = validate_email(payload.email)

    with handle_auth_errors(
        status_code=401,
        detail=(
            "Unable to sign in. Check your credentials "
            "and email confirmation."
        ),
    ):
        client = create_auth_client()

        response = client.auth.sign_in_with_password(
            {
                "email": email,
                "password": payload.password,
            }
        )

        if response.session is None:
            raise HTTPException(
                status_code=401,
                detail="Unable to sign in.",
            )

        session = response.session

        return AuthSessionRead(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
        )

@router.post(
    "/logout",
    response_model=AuthMessageRead,
)
def logout(
    payload: AuthLogoutCreate,
    credentials: HTTPAuthorizationCredentials = Security(
        session_security
    ),
):
    with handle_auth_errors(
        status_code=401,
        detail="Invalid or expired authentication session.",
    ):
        client = create_auth_client()

        client.auth.set_session(
            credentials.credentials,
            payload.refresh_token,
        )

        # End this session, keeping sessions on other devices.
        client.auth.sign_out({"scope": "local"})

    return AuthMessageRead(
        message="Session signed out. Clear the tokens from your client.",
    )

@router.post(
    "/password-reset",
    response_model=AuthMessageRead,
    status_code=202,
)
def request_password_reset(payload: AuthPasswordResetCreate):
    email = validate_email(payload.email)
    redirect_url = os.getenv("PASSWORD_RESET_REDIRECT_URL")

    if not redirect_url:
        raise HTTPException(
            status_code=503,
            detail="Password reset redirect URL is not configured.",
        )

    with handle_auth_errors(
        detail="Unable to process the password reset request.",
    ):
        client = create_auth_client()

        client.auth.reset_password_for_email(
            email,
            {"redirect_to": redirect_url},
        )

    return AuthMessageRead(
        message=(
            "If this email has an account, "
            "you will receive a password reset link."
        ),
    )

@router.post(
    "/password-update",
    response_model=AuthMessageRead,
)
def update_password(
    payload: AuthPasswordUpdateCreate,
    credentials: HTTPAuthorizationCredentials = Security(
        session_security
    ),
):
    with handle_auth_errors(
        detail=(
            "Unable to update the password. Check your session "
            "and the password requirements."
        ),
    ):
        client = create_auth_client()

        client.auth.set_session(
            credentials.credentials,
            payload.refresh_token,
        )

        client.auth.update_user(
            {"password": payload.new_password}
        )

    return AuthMessageRead(
        message="Password updated. Sign in with your new password.",
    )