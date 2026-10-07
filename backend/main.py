from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import User
from users import router as users_router, get_current_user

from auth import get_supabase_user

from routers.attachments import router as attachment_router
from routers.building_account import router as building_account_router
from routers.suppliers import router as supplier_router
from routers.work_orders import router as work_orders_router
from routers.work_orders_com_eme import router as work_orders_com_eme_router
from routers.purchase_orders import router as purchase_order_router
from routers.audit import router as audit_router
from routers.purchase_orders_attachments import router as purchase_orders_attachment_router
from routers import reports

app = FastAPI(title="COMS API")

app = FastAPI(title="COMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "COMS API is running"}

@app.get("/api/me")
def read_me(user: User = Depends(get_current_user)):
    return {"auth_user_id": user.auth_user_id, "account_id": user.account_id,
            "database_id": user.database_id, "email": user.email,
            "user_name": user.user_name, "first_name": user.first_name,
            "last_name": user.last_name, "user_role": user.user_role, "status": user.status}

app.include_router(users_router)
app.include_router(building_account_router)
app.include_router(supplier_router)
app.include_router(work_orders_router)
app.include_router(work_orders_com_eme_router)
app.include_router(attachment_router)
app.include_router(purchase_order_router)
app.include_router(audit_router)
app.include_router(purchase_orders_attachment_router)
app.include_router(reports.router)
