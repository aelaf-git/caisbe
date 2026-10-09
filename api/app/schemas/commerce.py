from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class CartItemIn(BaseModel):
    course_id: int = Field(gt=0)


class CartItemOut(BaseModel):
    id: int
    course_id: int
    course_code: str
    course_title: str
    cover_url: str | None = None
    price_cents: int
    currency: str
    created_at: datetime


class CartOut(BaseModel):
    items: list[CartItemOut] = Field(default_factory=list)
    subtotal_cents: int = 0
    currency: str = "usd"
    count: int = 0


class PromoPreviewIn(BaseModel):
    course_id: int | None = Field(default=None, gt=0)
    course_ids: list[int] | None = None
    from_cart: bool = False

    @model_validator(mode="after")
    def require_source(self) -> "PromoPreviewIn":
        if self.from_cart:
            return self
        if self.course_id:
            return self
        if self.course_ids:
            return self
        raise ValueError("Provide course_id, course_ids, or from_cart=true")


class PromoPreviewOut(BaseModel):
    course_id: int | None = None
    course_title: str | None = None
    currency: str
    subtotal_cents: int
    discount_cents: int = 0
    total_cents: int
    complimentary: bool = False
    promo_code: str | None = None
    message: str | None = None
    items: list["OrderItemOut"] = Field(default_factory=list)


class CheckoutIn(BaseModel):
    course_id: int | None = Field(default=None, gt=0)
    course_ids: list[int] | None = None
    from_cart: bool = False
    promo_code: str | None = Field(default=None, max_length=40)
    order_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def require_source(self) -> "CheckoutIn":
        if self.order_id:
            return self
        if self.from_cart:
            return self
        if self.course_id:
            return self
        if self.course_ids:
            return self
        raise ValueError("Provide course_id, course_ids, from_cart=true, or order_id")


class CheckoutOut(BaseModel):
    order_id: int
    order_number: str
    enrollment_id: int | None = None
    enrollment_ids: list[int] = Field(default_factory=list)
    total_cents: int
    currency: str
    complimentary: bool = False
    checkout_url: str | None = None
    publishable_key: str | None = None
    status: str


class MembershipCheckoutIn(BaseModel):
    membership_type: str = Field(min_length=2, max_length=40)
    kind: str | None = Field(default="application", max_length=20)


class OrderItemOut(BaseModel):
    course_id: int | None = None
    membership_type: str | None = None
    title: str
    unit_price_cents: int
    quantity: int = 1


class OrderOut(BaseModel):
    id: int
    number: str
    name: str
    status: str
    created_at: datetime
    total_cents: int
    amount_paid_cents: int
    balance_cents: int
    currency: str
    promo_code: str | None = None
    invoice_number: str | None = None
    items: list[OrderItemOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    number: str
    bill_date: datetime
    period_start: datetime | None = None
    period_end: datetime | None = None
    amount_cents: int
    amount_paid_cents: int
    balance_cents: int
    status: str
    order_number: str | None = None

    model_config = {"from_attributes": True}


class StudentPaymentOut(BaseModel):
    id: int
    description: str
    amount_cents: int
    currency: str
    status: str
    method: str
    created_at: datetime
    order_number: str


class PaymentOut(BaseModel):
    id: int
    status: str
    provider: str
    amount_cents: int
    created_at: datetime
    order_number: str
    student_name: str
    student_email: str
    course_title: str
    currency: str = "usd"
    invoice_number: str | None = None
    items: list[OrderItemOut] = Field(default_factory=list)
    receipt_printed_at: datetime | None = None
    reviewed_at: datetime | None = None

    model_config = {"from_attributes": True}


class PromotionIn(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    description: str = Field(default="", max_length=255)
    kind: str = "discount"
    percent_off: int | None = Field(default=None, ge=1, le=100)
    amount_off_cents: int | None = Field(default=None, ge=1)
    complimentary: bool = False
    max_redemptions: int | None = Field(default=None, ge=1)
    expires_at: datetime | None = None
    course_id: int | None = None
    active: bool = True


class PromotionOut(BaseModel):
    id: int
    code: str
    description: str
    kind: str = "discount"
    percent_off: int | None = None
    amount_off_cents: int | None = None
    complimentary: bool
    max_redemptions: int | None = None
    redemption_count: int
    expires_at: datetime | None = None
    course_id: int | None = None
    active: bool

    model_config = {"from_attributes": True}


class CourseFeeOut(BaseModel):
    id: int
    code: str
    title: str
    status: str
    currency: str
    price_cents: int
    exam_fee_cents: int
    retake_fee_cents: int


class CourseFeeUpdate(BaseModel):
    price_cents: int | None = Field(default=None, ge=0)
    exam_fee_cents: int | None = Field(default=None, ge=0)
    retake_fee_cents: int | None = Field(default=None, ge=0)


class OutstandingPaymentOut(BaseModel):
    order_id: int
    order_number: str
    student_name: str
    student_email: str
    description: str
    item_kind: str
    amount_due_cents: int
    currency: str
    created_at: datetime


class FeesOverviewOut(BaseModel):
    courses: list[CourseFeeOut]
    promotions: list[PromotionOut]
    outstanding: list[OutstandingPaymentOut]


PromoPreviewOut.model_rebuild()
