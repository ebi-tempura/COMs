from datetime import datetime

from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import WorkOrder
from schemas import WorkOrderCreate, WorkOrderRead


app = FastAPI(title="COMS API")


def to_work_order_read(record: WorkOrder) -> WorkOrderRead:
    return WorkOrderRead(
        title=record.title,
        supplier=record.supplier,
        amount=record.amount,
        priority=record.priority,
        id=record.work_order_number,
        description=record.description,
        status=record.status,
    )


@app.get("/")
def read_root():
    return {"message": "COMS API is running"}


@app.post(
    "/api/work-orders",
    response_model=WorkOrderRead,
    status_code=201,
)
def create_work_order(
    work_order: WorkOrderCreate,
    database: Session = Depends(get_db),
):
    record = WorkOrder(
        title=work_order.title,
        supplier=work_order.supplier,
        amount=work_order.amount,
        priority=work_order.priority,
        status="Draft",
        description=work_order.description,
        created_year=datetime.now().year,
    )

    database.add(record)
    database.flush()

    record.work_order_number = (
        f"WO-{record.created_year}-"
        f"{record.database_id:04d}"
    )

    database.commit()
    database.refresh(record)

    return to_work_order_read(record)


@app.get(
    "/api/work-orders",
    response_model=list[WorkOrderRead],
)
def read_work_orders(
    database: Session = Depends(get_db),
):
    statement = select(WorkOrder).order_by(
        WorkOrder.database_id
    )

    records = database.scalars(statement).all()

    return [
        to_work_order_read(record)
        for record in records
    ]