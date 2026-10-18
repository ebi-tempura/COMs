
import os
import httpx

from dotenv import load_dotenv

load_dotenv()

class EmailSendError(Exception):
    def __init__(self, message: str, retryable: bool = True):
        super().__init__(message)
        self.retryable = retryable


def send_notification_email(
    *,
    recipient: str,
    subject: str,
    message: str,
    idempotency_key: str,
) -> str:
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("EMAIL_FROM")
    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:5173"
    ).rstrip("/")

    if not api_key or not sender:
        raise EmailSendError(
            "Email provider is not configured",
            retryable=False,
        )

    payload = {
        "from": sender,
        "to": [recipient],
        "subject": subject,
        "text": f"{message}\n\nOpen COMs: {frontend_url}",
    }

    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotency_key,
                },
                json=payload,
            )
    except httpx.RequestError as exc:
        raise EmailSendError(
            "Email provider connection failed"
        ) from exc

    if response.status_code >= 400:
        retryable = (
            response.status_code == 429
            or response.status_code >= 500
        )
        raise EmailSendError(
            f"Email provider returned HTTP {response.status_code}",
            retryable=retryable,
        )

    try:
        email_id = response.json()["id"]
    except (ValueError, KeyError, TypeError) as exc:
        raise EmailSendError(
            "Email provider returned an invalid response"
        ) from exc

    return email_id
