import logging
import os

from urllib.parse import quote
from services.notifications.email_sender import (
    send_notification_email,
    EmailSendError,
)

from fastapi import Depends, HTTPException, APIRouter
from pydantic import BaseModel, ConfigDict, Field

from sqlalchemy import  select
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.users import UserRead
from models import BuildingAccount

from auth import get_supabase_user
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from sqlalchemy import update, func
from sqlalchemy.exc import IntegrityError
from models import AuditLog, UserInvitation
from schemas.auth import UserInvitationCreate, UserRoleChange, UserStatusChange
from routers.building_account import verified_identity



router = APIRouter()

audit_logger = logging.getLogger(__name__)

#######################################
#Get current user  
#######################################

def get_current_user(request_user = Depends(get_supabase_user),
                      database: Session = Depends(get_db)) -> User:
    statement = select(User).where(
        User.auth_user_id == request_user.id
    )
    current_user = database.scalar(statement)

    if current_user is None:
        raise HTTPException(
            status_code=403,
            detail="COMS User not found",
        )

    if current_user.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="COMS User is not active"
        )

    if current_user.status is None:
        raise HTTPException(
            status_code=403,
            detail="COMS User not found"
        )

    account = database.scalar(select(BuildingAccount).where(BuildingAccount.account_id == current_user.account_id))
    if account is None or account.account_status != "Active":
        raise HTTPException(403, "Building account is not active")
    return current_user

def require_roles(*allowed_roles: str):
    def role_checker(
            current_user: User = Depends(get_current_user)):

        if current_user.user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="User does not have the required role"
            )
        return current_user
    return role_checker

def to_user_read(record: User) ->UserRead:
    return UserRead(
        database_id=record.database_id,
        account_id=record.account_id,
        user_name=record.user_name,
        email=record.email,
        first_name=record.first_name,
        last_name=record.last_name,
        user_role=record.user_role,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        last_login_at= record.last_login_at,
    )


# Legacy arbitrary identity creation is replaced by verified invitation acceptance.

router.tags = ["Users"]

def lock_account(database, account_id):
    # SQLite serializes writers; PostgreSQL locks this row until commit.
    database.execute(update(BuildingAccount).where(BuildingAccount.account_id == account_id)
                     .values(account_status=BuildingAccount.account_status))

def audit(database, actor, action, target, details, table="User_table"):
    database.add(AuditLog(account_id=actor.account_id, user_id=actor.auth_user_id,
        user_name=actor.user_name, user_role=actor.user_role, action=action,
        table_name=table, record_id=str(target), details=details))

def lock_admin(database, actor):
    lock_account(database, actor.account_id)
    database.refresh(actor)
    if actor.user_role != "Admin" or actor.status != "Active":
        raise HTTPException(403, "An active Admin is required")

def target_user(database, actor, user_id):
    lock_admin(database, actor)
    target = database.scalar(select(User).where(User.account_id == actor.account_id,
                                              User.database_id == user_id).execution_options(populate_existing=True))
    if target is None:
        raise HTTPException(404, "User not found")
    return target

def protect_last_admin(database, target):
    if target.status == "Active" and target.user_role == "Admin":
        others = database.scalar(select(User.database_id).where(User.account_id == target.account_id,
            User.user_role == "Admin", User.status == "Active", User.database_id != target.database_id))
        if others is None:
            raise HTTPException(409, "Keep at least one active Admin")

@router.get("/api/users", response_model=list[UserRead])
def read_user(current_user: User = Depends(require_roles("Admin", "Manager", "President", "Board Member")),
              database: Session = Depends(get_db)):
    return [to_user_read(u) for u in database.scalars(select(User).where(
        User.account_id == current_user.account_id).order_by(User.database_id)).all()]

@router.post("/api/users/invitations", status_code=201)
def invite_user(
    body: UserInvitationCreate,
    actor: User = Depends(require_roles("Admin")),
    database: Session = Depends(get_db),
):
    lock_admin(database, actor)

    email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    if database.scalar(
        select(User).where(func.lower(User.email) == email)
    ):
        raise HTTPException(
            409,
            "This email already belongs to a COMs account",
        )

    if database.scalar(
        select(UserInvitation).where(
            UserInvitation.account_id == actor.account_id,
            UserInvitation.email == email,
            UserInvitation.accepted_at.is_(None),
            UserInvitation.revoked_at.is_(None),
            UserInvitation.expires_at > now,
        )
    ):
        raise HTTPException(
            409,
            "An unexpired invitation already exists; "
            "revoke it before inviting again",
        )

    account = database.scalar(
        select(BuildingAccount).where(
            BuildingAccount.account_id == actor.account_id
        )
    )

    token = secrets.token_urlsafe(32)

    invitation = UserInvitation(
        account_id=actor.account_id,
        email=email,
        user_role=body.user_role,
        token_hash=sha256(token.encode()).hexdigest(),
        created_by_user_id=actor.database_id,
        expires_at=now + timedelta(days=7),
    )

    database.add(invitation)
    database.flush()

    invitation_id = invitation.database_id
    expires_at = invitation.expires_at
    building_name = account.building_name

    audit(
        database,
        actor,
        "Invited user",
        invitation_id,
        f"Invited {email} as {body.user_role}",
        "user_invitations",
    )

    # Save before sending so an emailed link refers to a committed invitation.
    database.commit()

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    invitation_url = (
        f"{frontend_url}/accept-invitation"
        f"#token={quote(token, safe='')}"
    )

    message = (
        f"You have been invited to join {building_name} in COMs.\n\n"
        f"Your assigned role: {body.user_role}\n\n"
        f"Accept your invitation:\n{invitation_url}\n\n"
        f"Use this email address to join: {email}\n\n"
        "This invitation expires in seven days. "
        "Your email must be verified before you can join.\n\n"
        "If you were not expecting this invitation, "
        "you can ignore this message."
    )

    try:
        send_notification_email(
            recipient=email,
            subject="You are invited to join your building in COMs",
            message=message,
            idempotency_key=f"user-invitation-{invitation_id}",
        )

        email_status = "submitted"
        result_message = (
            f"Invitation email submitted for delivery to {email}."
        )

    except EmailSendError:
        # Keep the invitation visible so the Admin can revoke it.
        # A timeout can occur even when the provider accepted the email.
        email_status = "unconfirmed"
        result_message = (
            "The invitation was created, but email delivery "
            "could not be confirmed. Check the recipient's inbox. "
            "If needed, revoke this invitation and create a new one."
        )

    return {
        "database_id": invitation_id,
        "email": email,
        "user_role": body.user_role,
        "expires_at": expires_at,
        "email_status": email_status,
        "message": result_message,
    }

@router.get("/api/users/invitations")
def list_invitations(actor: User = Depends(require_roles("Admin")), database: Session = Depends(get_db)):
    return [{"database_id": i.database_id, "email": i.email, "user_role": i.user_role,
             "expires_at": i.expires_at, "accepted_at": i.accepted_at, "revoked_at": i.revoked_at}
            for i in database.scalars(select(UserInvitation).where(UserInvitation.account_id == actor.account_id))]

@router.delete("/api/users/invitations/{invitation_id}", status_code=204)
def revoke_invitation(invitation_id: int, actor: User = Depends(require_roles("Admin")),
                      database: Session = Depends(get_db)):
    lock_admin(database, actor)
    invitation = database.scalar(select(UserInvitation).where(UserInvitation.account_id == actor.account_id,
        UserInvitation.database_id == invitation_id).execution_options(populate_existing=True))
    if invitation is None:
        raise HTTPException(404, "Invitation not found")
    if invitation.accepted_at:
        raise HTTPException(409, "Invitation already accepted")
    if invitation.revoked_at is None:
        invitation.revoked_at = datetime.now(timezone.utc)
        audit(database, actor, "Revoked invitation", invitation_id, "Invitation revoked", "user_invitations")
        database.commit()

INVITATION_TERMS_VERSION = "2026-10-26"


class InvitationToken(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    token: str = Field(min_length=32, max_length=200)


class InvitationCheck(InvitationToken):
    email: str = Field(min_length=3, max_length=50)


def invitation_for_token(database, token):
    invitation = database.scalar(select(UserInvitation).where(
        UserInvitation.token_hash == sha256(token.encode()).hexdigest()
    ))
    if invitation is None:
        raise HTTPException(404, "Invitation not found")
    return invitation


def check_invitation_building(database, invitation):
    account = database.scalar(select(BuildingAccount).where(
        BuildingAccount.account_id == invitation.account_id
    ))
    if account is None or account.account_status != "Active":
        raise HTTPException(403, "Building account is not active")


def check_pending_invitation(invitation):
    expires = invitation.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if invitation.accepted_at or invitation.revoked_at or expires <= datetime.now(timezone.utc):
        raise HTTPException(409, "Invitation has expired or is no longer available")


@router.post("/api/users/invitations/validate")
def validate_invitation(body: InvitationCheck, database: Session = Depends(get_db)):
    # Public, token-protected check before creating a Supabase login.
    invitation = invitation_for_token(database, body.token)
    if body.email.strip().lower() != invitation.email.strip().lower():
        raise HTTPException(403, "Use the email address invited by your Admin")
    check_pending_invitation(invitation)
    check_invitation_building(database, invitation)
    if database.scalar(select(User).where(func.lower(User.email) == body.email.lower())):
        raise HTTPException(409, "This email already belongs to a COMs account")
    return {"valid": True}


def signup_names(identity, token):
    metadata = getattr(identity, "user_metadata", None) or {}
    profile = metadata.get("invitation_signup")
    if not isinstance(profile, dict):
        raise HTTPException(422, "Signup details are missing. Use a fresh invitation and signup.")
    if profile.get("invitation_hash") != sha256(token.encode()).hexdigest():
        raise HTTPException(422, "Signup details belong to another invitation")
    if (profile.get("accepted_terms") is not True
            or profile.get("terms_version") != INVITATION_TERMS_VERSION):
        raise HTTPException(422, "Terms acceptance is missing or out of date")
    names = []
    for key in ("first_name", "last_name"):
        value = profile.get(key)
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= 50:
            raise HTTPException(422, "A valid first and last name are required")
        names.append(value.strip())
    return names


@router.post("/api/users/invitations/accept", response_model=UserRead)
def accept_invitation(body: InvitationToken, identity=Depends(get_supabase_user),
                      database: Session = Depends(get_db)):
    # Identity comes from Supabase's verified get_user response, not the request body.
    email = verified_identity(identity).strip().lower()
    invitation = invitation_for_token(database, body.token)
    lock_account(database, invitation.account_id)
    database.refresh(invitation)
    if email != invitation.email.strip().lower():
        raise HTTPException(403, "Sign in with the invited email")
    check_invitation_building(database, invitation)
    existing = database.scalar(select(User).where(User.auth_user_id == identity.id))

    # A retry after successful acceptance returns the same membership.
    if invitation.accepted_at:
        if (existing and existing.account_id == invitation.account_id
                and existing.email.lower() == email):
            if existing.status != "Active":
                raise HTTPException(403, "COMS User is not active")
            return to_user_read(existing)
        raise HTTPException(409, "Invitation already accepted")

    check_pending_invitation(invitation)
    if existing or database.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(409, "This identity or email already belongs to a COMs account")
    first_name, last_name = signup_names(identity, body.token)

    # User-editable signup metadata provides names and stated terms acceptance only.
    # Account and role always come from the Admin's invitation.
    user = User(
        account_id=invitation.account_id, auth_user_id=identity.id, email=email,
        user_role=invitation.user_role, status="Active",
        first_name=first_name, last_name=last_name,
        user_name=f"{first_name} {last_name}"[:50],
    )
    try:
        database.add(user)
        database.flush()
        invitation.accepted_at = datetime.now(timezone.utc)
        audit(database, user, "Accepted invitation", user.database_id,
              "User activated through verified invitation; "
              f"terms version {INVITATION_TERMS_VERSION} reported accepted during signup")
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(409, "This identity or email already belongs to a COMs account") from None
    return to_user_read(user)


@router.patch("/api/users/{user_id}/role", response_model=UserRead)
def change_role(user_id: int, body: UserRoleChange, actor: User = Depends(require_roles("Admin")),
                database: Session = Depends(get_db)):
    target = target_user(database, actor, user_id)
    old = target.user_role
    if old != body.user_role:
        protect_last_admin(database, target)
        audit(database, actor, "Changed user role", user_id, f"{old} -> {body.user_role}")
        target.user_role = body.user_role
        database.commit()
    return to_user_read(target)

@router.patch("/api/users/{user_id}/status", response_model=UserRead)
def change_status(user_id: int, body: UserStatusChange, actor: User = Depends(require_roles("Admin")),
                  database: Session = Depends(get_db)):
    target = target_user(database, actor, user_id)
    old = target.status
    if old != body.status:
        protect_last_admin(database, target)
        audit(database, actor, "Changed user status", user_id, f"{old} -> {body.status}")
        target.status = body.status
        database.commit()
    return to_user_read(target)
