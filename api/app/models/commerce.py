from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base



class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_cart_user_course"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="cart_items")
    course: Mapped["Course"] = relationship()


class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    kind: Mapped[str] = mapped_column(String(16), default="discount", server_default="discount")
    percent_off: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_off_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    complimentary: Mapped[bool] = mapped_column(Boolean, default=False)
    max_redemptions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    redemption_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course: Mapped["Course | None"] = relationship()
    orders: Mapped[list["Order"]] = relationship(back_populates="promotion")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    subtotal_cents: Mapped[int] = mapped_column(Integer, default=0)
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer, default=0)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="usd")
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True)
    promo_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="orders")
    promotion: Mapped[Promotion | None] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    membership_kind: Mapped[str | None] = mapped_column(String(20), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    item_kind: Mapped[str] = mapped_column(String(16), default="course", server_default="course")
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped[Order] = relationship(back_populates="items")
    course: Mapped[Course | None] = relationship()


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    bill_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="open")

    order: Mapped[Order] = relationship(back_populates="invoices")
    user: Mapped[User] = relationship(back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="stripe")
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    receipt_printed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="payments")
    invoice: Mapped[Invoice | None] = relationship(back_populates="payments")
    user: Mapped[User] = relationship(back_populates="payments", foreign_keys=[user_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])


class SavedCard(Base):
    __tablename__ = "saved_cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stripe_payment_method_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand: Mapped[str] = mapped_column(String(32), default="card")
    last4: Mapped[str] = mapped_column(String(4))
    exp_month: Mapped[int] = mapped_column(Integer)
    exp_year: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(String(80), default="")
    last_name: Mapped[str] = mapped_column(String(80), default="")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="saved_cards")


