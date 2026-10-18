-- Data-integrity constraints that Prisma's schema language cannot express.

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_quantity_nonnegative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "Product_price_positive" CHECK ("priceCents" > 0),
  ADD CONSTRAINT "Product_sale_price_valid" CHECK ("salePriceCents" IS NULL OR ("salePriceCents" > 0 AND "salePriceCents" < "priceCents")),
  ADD CONSTRAINT "Product_costs_nonnegative" CHECK (COALESCE("acquisitionCostCents", 0) >= 0 AND COALESCE("refurbishmentCostCents", 0) >= 0);

ALTER TABLE "StockReservation"
  ADD CONSTRAINT "StockReservation_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_amounts_valid" CHECK ("subtotalCents" >= 0 AND "discountCents" >= 0 AND "totalCents" >= 0 AND "totalCents" = "subtotalCents" - "discountCents");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_amounts_valid" CHECK ("quantity" > 0 AND "unitPriceCents" >= 0 AND "lineTotalCents" = "unitPriceCents" * "quantity");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_positive" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Payment_target_exclusive" CHECK (
    ("purpose" = 'ORDER' AND "orderId" IS NOT NULL AND "repairRequestId" IS NULL) OR
    ("purpose" = 'REPAIR' AND "repairRequestId" IS NOT NULL AND "orderId" IS NULL)
  );

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amount_positive" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Refund_completed_requires_gateway_ref" CHECK ("status" <> 'COMPLETED' OR "gatewayReference" IS NOT NULL);

ALTER TABLE "DiscountCode"
  ADD CONSTRAINT "DiscountCode_value_valid" CHECK ("value" > 0 AND ("type" <> 'PERCENTAGE' OR "value" <= 100)),
  ADD CONSTRAINT "DiscountCode_used_nonnegative" CHECK ("usedCount" >= 0);

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "PurchaseOffer"
  ADD CONSTRAINT "PurchaseOffer_amount_positive" CHECK ("amountCents" > 0);

ALTER TABLE "RepairQuote"
  ADD CONSTRAINT "RepairQuote_amounts_valid" CHECK ("labourCents" >= 0 AND "partsCents" >= 0 AND "totalCents" = "labourCents" + "partsCents");

ALTER TABLE "RepairPayment"
  ADD CONSTRAINT "RepairPayment_amount_positive" CHECK ("amountCents" > 0);

-- A product may have at most one active reservation per order.
CREATE UNIQUE INDEX "StockReservation_one_active_per_order_product"
  ON "StockReservation" ("orderId", "productId") WHERE "status" = 'ACTIVE';

-- Only one quote per repair may be awaiting the customer's decision at a time.
CREATE UNIQUE INDEX "RepairQuote_one_sent_per_repair"
  ON "RepairQuote" ("repairId") WHERE "status" = 'SENT';

-- Case-insensitive uniqueness for user emails and discount codes.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (LOWER("email"));
CREATE UNIQUE INDEX "DiscountCode_code_upper_key" ON "DiscountCode" (UPPER("code"));
