from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = {"sqlite_autoincrement": True}

    database_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    work_order_number: Mapped[str | None] = mapped_column(
    String(20),
    unique=True,
    index=True,
    nullable=True,
    )
    created_year: Mapped[int]

    title: Mapped[str] = mapped_column(String(200))
    supplier: Mapped[str] = mapped_column(String(200))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    priority: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(
        String(50),
        default="Draft",
    )
    description: Mapped[str] = mapped_column(String(2000), nullable = True,)
    