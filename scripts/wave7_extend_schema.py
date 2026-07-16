#!/usr/bin/env python3
"""
Wave 7 — Extend Prisma schema with Inventory + Administration + Transport models.

BTD §4.3:
  #9  inventory      — Items, Stock, PR, PO, GRN (~45 tables)
  #11 administration — Assets, Maintenance, Visitors (~25 tables)
  + Transport (school buses, routes, trips, student assignments)

This script:
  1. Appends new models + enums at the end of schema.prisma
  2. Adds Wave 7 back-relations to School, Branch, Employee, Student, User
  3. Validates schema with `prisma format`
"""
from pathlib import Path
import re
import subprocess
import sys

SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma')

# ─────────────────────────────────────────────────────────────────────────────
# 1. New enums
# ─────────────────────────────────────────────────────────────────────────────
ENUMS = '''
// ─────────────────────────────────────────────────────────────────────────────
// WAVE 7 ENUMS — Inventory + Administration + Transport
// ─────────────────────────────────────────────────────────────────────────────

enum InventoryItemType {
  CONSUMABLE    // paper, glue, crayons — issued + replenished
  ASSET         // chairs, whiteboards — tracked individually
  EQUIPMENT     // projector, printer — tracked + depreciated
  PERISHABLE    // food, milk — expiry tracked
  STATIONERY    // notebooks, pens
  CLEANING      // detergent, soap
  MEDICAL       // first-aid supplies
}

enum InventoryUnit {
  PIECE
  KG
  LITER
  METER
  BOX
  PACK
  BOTTLE
  ROLL
  SET
}

enum PurchaseRequestStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  CANCELLED
  CONVERTED_TO_PO
}

enum PurchaseOrderStatus {
  DRAFT
  ISSUED
  PARTIALLY_RECEIVED
  RECEIVED
  INVOICED
  CLOSED
  CANCELLED
}

enum GrnStatus {
  DRAFT
  POSTED
  CANCELLED
}

enum GoodsIssueStatus {
  DRAFT
  POSTED
  CANCELLED
}

enum StockMovementType {
  RECEIVE   // GRN
  ISSUE     // Goods issue
  ADJUST    // manual adjustment
  RETURN    // return to supplier
  TRANSFER  // branch-to-branch
  WRITEOFF  // damaged/expired
}

enum SupplierStatus {
  ACTIVE
  BLACKLISTED
  INACTIVE
}

enum AssetCategory {
  IT_EQUIPMENT
  FURNITURE
  KITCHEN_EQUIPMENT
  TEACHING_AID
  SPORTS_EQUIPMENT
  SAFETY_EQUIPMENT
  VEHICLE
  BUILDING
  OTHER
}

enum AssetStatus {
  IN_USE
  IN_STORAGE
  UNDER_REPAIR
  DISPOSED
  LOST
  WRITTEN_OFF
  ALLOCATED
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
  EMERGENCY
  INSPECTION
  CALIBRATION
}

enum MaintenanceStatus {
  REQUESTED
  APPROVED
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DEFERRED
}

enum MaintenancePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum VisitorStatus {
  CHECKED_IN
  CHECKED_OUT
  DENIED_ENTRY
  NO_SHOW
}

enum VisitorType {
  PARENT
  VENDOR
  INSPECTOR
  DELIVERY
  GUEST
  INTERVIEW_CANDIDATE
  MAINTENANCE_CONTRACTOR
  OTHER
}

enum VehicleType {
  BUS
  VAN
  CAR
  AUTO_RICKSHAW
  MINI_BUS
}

enum VehicleStatus {
  ACTIVE
  MAINTENANCE
  RETIRED
  SUSPENDED
}

enum RouteStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

enum TripStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DELAYED
  SKIPPED
}

enum TripDirection {
  PICKUP
  DROPOFF
}

enum StudentTransportStatus {
  ENROLLED
  OPTED_OUT
  SUSPENDED
  GRADUATED
}

enum TransportAttendanceStatus {
  BOARDED
  ALIGHTED
  ABSENT
  NO_SHOW
  LATE_BOARDING
}
'''

# ─────────────────────────────────────────────────────────────────────────────
# 2. New models
# ─────────────────────────────────────────────────────────────────────────────
MODELS = '''
// ─────────────────────────────────────────────────────────────────────────────
// WAVE 7 — INVENTORY MODULE (BTD §4.3 #9, ~45 tables)
// Per BRC §11 (Inventory Rules) + ERD v3.0 §19 + API Catalog §16.14
// Aggregates: Item, Stock, Supplier, PurchaseRequest, PurchaseOrder,
//             GoodsReceiptNote, GoodsIssue
// ─────────────────────────────────────────────────────────────────────────────

model InventoryItem {
  id              String            @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String            @map("school_id") @db.Uuid
  branchId        String?           @map("branch_id") @db.Uuid
  itemCode        String            @map("item_code") @db.VarChar(32)
  name            String            @db.VarChar(160)
  description     String?           @db.Text
  category        InventoryItemType @default(CONSUMABLE)
  unit            InventoryUnit     @default(PIECE)
  hsnCode         String?           @map("hsn_code") @db.VarChar(8)

  // Stock policy
  reorderLevel    Int               @default(0) @map("reorder_level")
  reorderQty      Int               @default(0) @map("reorder_qty")
  maxLevel        Int?              @map("max_level")
  currentStock    Int               @default(0) @map("current_stock")
  reservedStock   Int               @default(0) @map("reserved_stock")
  // ^ current - reserved = available for issue

  // Cost tracking (weighted average)
  unitCostCents   Int               @default(0) @map("unit_cost_cents")
  valuationCents  Int               @default(0) @map("valuation_cents") // currentStock * unitCost

  // Perishable support
  isPerishable    Boolean           @default(false) @map("is_perishable")
  shelfLifeDays   Int?              @map("shelf_life_days")

  // Asset/equipment tracking
  isAssetTracked  Boolean           @default(false) @map("is_asset_tracked")
  assetPrefix     String?           @map("asset_prefix") @db.VarChar(8)

  isActive        Boolean           @default(true) @map("is_active")

  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt       DateTime?         @map("deleted_at") @db.Timestamptz

  school          School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?           @relation(fields: [branchId], references: [id])
  stockLots       StockLot[]
  stockMovements  StockMovement[]
  prLines         PurchaseRequestLine[]
  poLines         PurchaseOrderLine[]
  grnLines        GrnLine[]
  issueLines      GoodsIssueLine[]
  assets          Asset[]

  @@unique([schoolId, itemCode])
  @@index([schoolId, category])
  @@index([schoolId, isActive])
  @@index([branchId])
  @@map("inventory_items")
}

model StockLot {
  // A "lot" = a batch of items received together (for FIFO/FEFO)
  id              String           @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String           @map("school_id") @db.Uuid
  branchId        String?          @map("branch_id") @db.Uuid
  itemId          String           @map("item_id") @db.Uuid
  lotNumber       String           @map("lot_number") @db.VarChar(64)
  grnId           String?          @map("grn_id") @db.Uuid
  supplierId      String?          @map("supplier_id") @db.Uuid

  quantityReceived Int             @map("quantity_received")
  quantityIssued   Int             @default(0) @map("quantity_issued")
  quantityOnHand   Int             @map("quantity_on_hand")
  unitCostCents   Int              @map("unit_cost_cents")

  // Expiry (for perishables)
  manufacturedAt  DateTime?        @map("manufactured_at") @db.Date
  expiresAt       DateTime?        @map("expires_at") @db.Date

  receivedAt      DateTime         @map("received_at") @db.Timestamptz
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  item            InventoryItem    @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier        Supplier?        @relation(fields: [supplierId], references: [id])
  grn             GoodsReceiptNote? @relation(fields: [grnId], references: [id])
  school          School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?          @relation(fields: [branchId], references: [id])

  @@index([itemId, expiresAt])
  @@index([schoolId, branchId])
  @@map("stock_lots")
}

model StockMovement {
  // Append-only ledger of every stock change
  id              String            @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String            @map("school_id") @db.Uuid
  branchId        String?           @map("branch_id") @db.Uuid
  itemId          String            @map("item_id") @db.Uuid
  lotId           String?           @map("lot_id") @db.Uuid
  movementType    StockMovementType @map("movement_type")
  quantityDelta   Int               @map("quantity_delta") // +receive / -issue
  balanceAfter    Int               @map("balance_after")
  referenceType   String?           @map("reference_type") @db.VarChar(32) // GRN, ISSUE, etc.
  referenceId     String?           @map("reference_id") @db.Uuid
  reason          String?           @db.Text
  performedById   String?           @map("performed_by_id") @db.Uuid

  occurredAt      DateTime          @default(now()) @map("occurred_at") @db.Timestamptz
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz

  item            InventoryItem     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  school          School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?           @relation(fields: [branchId], references: [id])
  performedBy     User?             @relation(fields: [performedById], references: [id])

  @@index([itemId, occurredAt])
  @@index([schoolId, occurredAt])
  @@index([referenceType, referenceId])
  @@map("stock_movements")
}

model Supplier {
  id              String          @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String          @map("school_id") @db.Uuid

  supplierCode    String          @map("supplier_code") @db.VarChar(32)
  name            String          @db.VarChar(160)
  legalName       String?         @map("legal_name") @db.VarChar(200)
  gstNumber       String?         @map("gst_number") @db.VarChar(15)
  panNumber       String?         @map("pan_number") @db.VarChar(10)
  contactPerson   String?         @map("contact_person") @db.VarChar(120)
  email           String?         @db.Citext
  phone           String?         @db.VarChar(16)
  addressLine1    String?         @map("address_line1") @db.VarChar(255)
  addressLine2    String?         @map("address_line2") @db.VarChar(255)
  city            String?         @db.VarChar(64)
  state           String?         @db.VarChar(64)
  pincode         String?         @db.VarChar(6)

  paymentTerms    Int             @default(15) @map("payment_terms") // days
  status          SupplierStatus  @default(ACTIVE)

  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt       DateTime?       @map("deleted_at") @db.Timestamptz

  school          School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  purchaseOrders  PurchaseOrder[]
  stockLots       StockLot[]

  @@unique([schoolId, supplierCode])
  @@index([schoolId, status])
  @@map("suppliers")
}

model PurchaseRequest {
  // PR = internal "we need to buy X" request, needs approval before PO
  id              String                 @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                 @map("school_id") @db.Uuid
  branchId        String?                @map("branch_id") @db.Uuid
  prNumber        String                 @map("pr_number") @db.VarChar(32)
  requestedById   String                 @map("requested_by_id") @db.Uuid
  department      String?                @db.VarChar(64)
  status          PurchaseRequestStatus  @default(DRAFT)

  justification   String?                @db.Text
  approverId      String?                @map("approver_id") @db.Uuid
  approvedAt      DateTime?              @map("approved_at") @db.Timestamptz
  approvalNotes   String?                @map("approval_notes") @db.Text
  rejectedReason  String?                @map("rejected_reason") @db.Text

  convertedPoId   String?                @unique @map("converted_po_id") @db.Uuid

  requiredBy      DateTime?              @map("required_by") @db.Date
  totalEstCents   Int                    @default(0) @map("total_est_cents")

  createdAt       DateTime               @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime               @updatedAt @map("updated_at") @db.Timestamptz

  school          School                 @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?                @relation(fields: [branchId], references: [id])
  requestedBy     User                   @relation("PRRequestedBy", fields: [requestedById], references: [id])
  approver        User?                  @relation("PRApprover", fields: [approverId], references: [id])
  lines           PurchaseRequestLine[]
  convertedPo     PurchaseOrder?         @relation("PRConvertedPO")

  @@unique([schoolId, prNumber])
  @@index([schoolId, status])
  @@index([requestedById])
  @@map("purchase_requests")
}

model PurchaseRequestLine {
  id              String           @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String           @map("school_id") @db.Uuid
  prId            String           @map("pr_id") @db.Uuid
  itemId          String           @map("item_id") @db.Uuid
  quantity        Int
  unitCostCents   Int              @map("unit_cost_cents")
  estCostCents    Int              @map("est_cost_cents")
  notes           String?          @db.Text

  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz

  pr              PurchaseRequest  @relation(fields: [prId], references: [id], onDelete: Cascade)
  item            InventoryItem    @relation(fields: [itemId], references: [id])
  school          School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([prId])
  @@map("purchase_request_lines")
}

model PurchaseOrder {
  // PO = issued to supplier, after PR approval
  id              String               @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String               @map("school_id") @db.Uuid
  branchId        String?              @map("branch_id") @db.Uuid
  poNumber        String               @map("po_number") @db.VarChar(32)
  supplierId      String               @map("supplier_id") @db.Uuid
  issuedById      String               @map("issued_by_id") @db.Uuid
  status          PurchaseOrderStatus  @default(DRAFT)

  sourcePrId      String?              @unique @map("source_pr_id") @db.Uuid

  // Totals (in paise)
  subtotalCents   Int                  @default(0) @map("subtotal_cents")
  taxCents        Int                  @default(0) @map("tax_cents")
  shippingCents   Int                  @default(0) @map("shipping_cents")
  totalCents      Int                  @default(0) @map("total_cents")

  expectedDate    DateTime?            @map("expected_date") @db.Date
  issuedAt        DateTime?            @map("issued_at") @db.Timestamptz
  closedAt        DateTime?            @map("closed_at") @db.Timestamptz
  notes           String?              @db.Text

  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  school          School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?              @relation(fields: [branchId], references: [id])
  supplier        Supplier             @relation(fields: [supplierId], references: [id])
  issuedBy        User                 @relation("POIssuedBy", fields: [issuedById], references: [id])
  sourcePr        PurchaseRequest?     @relation("PRConvertedPO", fields: [sourcePrId], references: [id])
  lines           PurchaseOrderLine[]
  grns            GoodsReceiptNote[]

  @@unique([schoolId, poNumber])
  @@index([schoolId, status])
  @@index([supplierId])
  @@map("purchase_orders")
}

model PurchaseOrderLine {
  id              String         @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String         @map("school_id") @db.Uuid
  poId            String         @map("po_id") @db.Uuid
  itemId          String         @map("item_id") @db.Uuid
  quantity        Int
  unitCostCents   Int            @map("unit_cost_cents")
  taxRatePercent  Decimal        @default(0) @map("tax_rate_percent") @db.Decimal(5, 2)
  lineTotalCents  Int            @map("line_total_cents")

  receivedQty     Int            @default(0) @map("received_qty")

  po              PurchaseOrder  @relation(fields: [poId], references: [id], onDelete: Cascade)
  item            InventoryItem  @relation(fields: [itemId], references: [id])
  school          School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([poId])
  @@map("purchase_order_lines")
}

model GoodsReceiptNote {
  // GRN = receipt of goods against a PO (or direct receipt)
  id              String       @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String       @map("school_id") @db.Uuid
  branchId        String?      @map("branch_id") @db.Uuid
  grnNumber       String       @map("grn_number") @db.VarChar(32)
  poId            String?      @map("po_id") @db.Uuid
  supplierId      String       @map("supplier_id") @db.Uuid
  receivedById    String       @map("received_by_id") @db.Uuid
  status          GrnStatus    @default(DRAFT)

  invoiceNumber   String?      @map("invoice_number") @db.VarChar(64)
  invoiceDate     DateTime?    @map("invoice_date") @db.Date
  challanNumber   String?      @map("challan_number") @db.VarChar(64)

  receivedAt      DateTime     @default(now()) @map("received_at") @db.Timestamptz
  notes           String?      @db.Text

  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  school          School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?      @relation(fields: [branchId], references: [id])
  po              PurchaseOrder? @relation(fields: [poId], references: [id])
  supplier        Supplier     @relation(fields: [supplierId], references: [id])
  receivedBy      User         @relation("GRNReceivedBy", fields: [receivedById], references: [id])
  lines           GrnLine[]
  stockLots       StockLot[]

  @@unique([schoolId, grnNumber])
  @@index([schoolId, receivedAt])
  @@index([poId])
  @@map("goods_receipt_notes")
}

model GrnLine {
  id              String            @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String            @map("school_id") @db.Uuid
  grnId           String            @map("grn_id") @db.Uuid
  poLineId        String?           @map("po_line_id") @db.Uuid
  itemId          String            @map("item_id") @db.Uuid
  orderedQty      Int               @map("ordered_qty")
  receivedQty     Int               @map("received_qty")
  acceptedQty     Int               @map("accepted_qty") // received - rejected
  rejectedQty     Int               @default(0) @map("rejected_qty")
  rejectionReason String?           @map("rejection_reason") @db.Text
  unitCostCents   Int               @map("unit_cost_cents")
  lotNumber       String?           @map("lot_number") @db.VarChar(64)
  expiresAt       DateTime?         @map("expires_at") @db.Date

  grn             GoodsReceiptNote  @relation(fields: [grnId], references: [id], onDelete: Cascade)
  item            InventoryItem     @relation(fields: [itemId], references: [id])
  school          School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([grnId])
  @@map("grn_lines")
}

model GoodsIssue {
  // Issue goods from inventory to a department/employee
  id              String           @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String           @map("school_id") @db.Uuid
  branchId        String?          @map("branch_id") @db.Uuid
  issueNumber     String           @map("issue_number") @db.VarChar(32)
  issuedToId      String           @map("issued_to_id") @db.Uuid
  issuedById      String           @map("issued_by_id") @db.Uuid
  status          GoodsIssueStatus @default(DRAFT)

  issueDate       DateTime         @default(now()) @map("issue_date") @db.Timestamptz
  department      String?          @db.VarChar(64)
  purpose         String?          @db.Text

  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  school          School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?          @relation(fields: [branchId], references: [id])
  issuedTo        User             @relation("GIssuedTo", fields: [issuedToId], references: [id])
  issuedBy        User             @relation("GIssuedBy", fields: [issuedById], references: [id])
  lines           GoodsIssueLine[]

  @@unique([schoolId, issueNumber])
  @@index([issuedToId])
  @@map("goods_issues")
}

model GoodsIssueLine {
  id              String      @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String      @map("school_id") @db.Uuid
  issueId        String      @map("issue_id") @db.Uuid
  itemId          String      @map("item_id") @db.Uuid
  lotId           String?     @map("lot_id") @db.Uuid
  quantity        Int
  unitCostCents   Int         @map("unit_cost_cents")
  lineTotalCents  Int         @map("line_total_cents")

  issue           GoodsIssue  @relation(fields: [issueId], references: [id], onDelete: Cascade)
  item            InventoryItem @relation(fields: [itemId], references: [id])
  school          School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([issueId])
  @@map("goods_issue_lines")
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 7 — ADMINISTRATION MODULE (BTD §4.3 #11, ~25 tables)
// Per BRC §13 (Facility Rules) + ERD v3.0 §20 + API Catalog §16.15
// Aggregates: Asset, MaintenanceRequest, Visitor
// ─────────────────────────────────────────────────────────────────────────────

model Asset {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  assetTag        String        @map("asset_tag") @db.VarChar(32)
  itemId          String?       @map("item_id") @db.Uuid
  name            String        @db.VarChar(160)
  category        AssetCategory @default(FURNITURE)
  status          AssetStatus   @default(IN_USE)

  // Purchase / valuation
  purchaseDate    DateTime?     @map("purchase_date") @db.Date
  purchaseCostCents Int         @default(0) @map("purchase_cost_cents")
  currentValueCents Int         @default(0) @map("current_value_cents")
  depreciationRatePercent Decimal @default(0) @map("depreciation_rate_percent") @db.Decimal(5, 2)

  // Assignment
  assignedToId    String?       @map("assigned_to_id") @db.Uuid
  assignedAt      DateTime?     @map("assigned_at") @db.Timestamptz
  location        String?       @db.VarChar(255)

  // Warranty
  warrantyStart   DateTime?     @map("warranty_start") @db.Date
  warrantyEnd     DateTime?     @map("warranty_end") @db.Date
  vendorName      String?       @map("vendor_name") @db.VarChar(160)

  // Maintenance
  lastMaintenanceAt DateTime?   @map("last_maintenance_at") @db.Timestamptz
  nextMaintenanceDue DateTime?  @map("next_maintenance_due") @db.Date

  // Disposal
  disposedAt      DateTime?     @map("disposed_at") @db.Timestamptz
  disposalReason  String?       @map("disposal_reason") @db.Text
  scrapValueCents Int?          @map("scrap_value_cents")

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt       DateTime?     @map("deleted_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  item            InventoryItem? @relation(fields: [itemId], references: [id])
  assignedTo      User?         @relation("AssetAssignedTo", fields: [assignedToId], references: [id])
  maintenanceRequests MaintenanceRequest[]

  @@unique([schoolId, assetTag])
  @@index([schoolId, status])
  @@index([schoolId, category])
  @@index([assignedToId])
  @@map("assets")
}

model MaintenanceRequest {
  id              String             @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String             @map("school_id") @db.Uuid
  branchId        String?            @map("branch_id") @db.Uuid
  requestNumber   String             @map("request_number") @db.VarChar(32)
  assetId         String?            @map("asset_id") @db.Uuid
  requestedById   String             @map("requested_by_id") @db.Uuid
  assignedToId    String?            @map("assigned_to_id") @db.Uuid

  type            MaintenanceType    @default(CORRECTIVE)
  status          MaintenanceStatus  @default(REQUESTED)
  priority        MaintenancePriority @default(MEDIUM)

  title           String             @db.VarChar(200)
  description     String             @db.Text

  // Scheduling
  scheduledAt     DateTime?          @map("scheduled_at") @db.Timestamptz
  startedAt       DateTime?          @map("started_at") @db.Timestamptz
  completedAt     DateTime?          @map("completed_at") @db.Timestamptz

  // Cost tracking
  estimatedCostCents Int             @default(0) @map("estimated_cost_cents")
  actualCostCents Int                @default(0) @map("actual_cost_cents")
  vendorName      String?            @map("vendor_name") @db.VarChar(160)
  vendorInvoiceNumber String?        @map("vendor_invoice_number") @db.VarChar(64)

  // Resolution
  resolutionNotes String?            @map("resolution_notes") @db.Text
  resolutionPhotos Json?             @map("resolution_photos")

  createdAt       DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  school          School             @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?            @relation(fields: [branchId], references: [id])
  asset           Asset?             @relation(fields: [assetId], references: [id])
  requestedBy     User               @relation("MaintRequestedBy", fields: [requestedById], references: [id])
  assignedTo      User?              @relation("MaintAssignedTo", fields: [assignedToId], references: [id])

  @@unique([schoolId, requestNumber])
  @@index([schoolId, status])
  @@index([assetId])
  @@index([priority, status])
  @@map("maintenance_requests")
}

model VisitorLog {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  visitorType     VisitorType   @default(GUEST)
  status          VisitorStatus @default(CHECKED_IN)

  // Visitor details
  name            String        @db.VarChar(160)
  phone           String?       @db.VarChar(16)
  email           String?       @db.Citext
  organization    String?       @db.VarChar(160)
  purposeOfVisit  String        @map("purpose_of_visit") @db.VarChar(255)
  personToMeetId  String?       @map("person_to_meet_id") @db.Uuid
  numVisitors     Int           @default(1) @map("num_visitors")

  // Visit details
  checkInAt       DateTime      @default(now()) @map("check_in_at") @db.Timestamptz
  checkOutAt      DateTime?     @map("check_out_at") @db.Timestamptz
  durationMinutes Int?          @map("duration_minutes")

  // Identity verification
  idProofType     String?       @map("id_proof_type") @db.VarChar(32) // AADHAAR, PAN, PASSPORT, DL
  idProofNumber   String?       @map("id_proof_number") @db.VarChar(32)
  photoUrl        String?       @map("photo_url") @db.VarChar(512)
  signatureUrl    String?       @map("signature_url") @db.VarChar(512)

  // Approval
  approvedById    String?       @map("approved_by_id") @db.Uuid
  denialReason    String?       @map("denial_reason") @db.Text

  notes           String?       @db.Text

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  personToMeet    User?         @relation("VisitorPersonToMeet", fields: [personToMeetId], references: [id])
  approvedBy      User?         @relation("VisitorApprovedBy", fields: [approvedById], references: [id])

  @@index([schoolId, checkInAt])
  @@index([status])
  @@index([personToMeetId])
  @@map("visitor_logs")
}

model Facility {
  // School facility / room (classroom, lab, playground, etc.)
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  name            String        @db.VarChar(120)
  type            String        @db.VarChar(64) // CLASSROOM, LAB, PLAYGROUND, KITCHEN, OFFICE, STAFF_ROOM
  capacity        Int           @default(0)
  areaSqft        Decimal?      @map("area_sqft") @db.Decimal(10, 2)
  floor           String?       @db.VarChar(32)
  building        String?       @db.VarChar(64)

  hasAirConditioning Boolean    @default(false) @map("has_ac")
  hasProjector    Boolean       @default(false) @map("has_projector")
  hasWhiteboard   Boolean       @default(true) @map("has_whiteboard")
  hasFireExtinguisher Boolean   @default(false) @map("has_fire_extinguisher")
  hasCctv         Boolean       @default(false) @map("has_cctv")

  isActive        Boolean       @default(true) @map("is_active")
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])

  @@unique([schoolId, name, type])
  @@index([schoolId, isActive])
  @@map("facilities")
}

model FacilityInspection {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  facilityId      String        @map("facility_id") @db.Uuid
  inspectedById   String        @map("inspected_by_id") @db.Uuid
  inspectionDate  DateTime      @map("inspection_date") @db.Timestamptz
  inspectionType  String        @map("inspection_type") @db.VarChar(64) // SAFETY, HYGIENE, FIRE, STRUCTURAL
  outcome         String        @db.VarChar(32) // PASS, FAIL, WARN
  findings        String?       @db.Text
  actionItems     Json?
  photos          Json?
  nextInspectionDue DateTime?   @map("next_inspection_due") @db.Date
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  facility        Facility      @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  inspectedBy     User          @relation("InspectedBy", fields: [inspectedById], references: [id])

  @@index([schoolId, inspectionDate])
  @@index([facilityId])
  @@map("facility_inspections")
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 7 — TRANSPORT MODULE (per user request, BRC §14 Transport Rules)
// Aggregates: Vehicle, Route, Trip, StudentRouteAssignment
// ─────────────────────────────────────────────────────────────────────────────

model Vehicle {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  vehicleNumber   String        @map("vehicle_number") @db.VarChar(16)
  type            VehicleType   @default(BUS)
  status          VehicleStatus @default(ACTIVE)

  make            String?       @db.VarChar(64)
  model           String?       @db.VarChar(64)
  yearOfManufacture Int?        @map("year_of_manufacture")
  color           String?       @db.VarChar(32)

  capacity        Int           @default(0)
  registeredSeats Int           @default(0) @map("registered_seats")

  // Compliance (per R-TR-001 to R-TR-008)
  registrationNumber String?    @map("registration_number") @db.VarChar(20)
  registrationValidTill DateTime? @map("registration_valid_till") @db.Date
  insuranceValidTill DateTime?  @map("insurance_valid_till") @db.Date
  pollutionCertValidTill DateTime? @map("pollution_cert_valid_till") @db.Date
  fitnessCertValidTill DateTime? @map("fitness_cert_valid_till") @db.Date
  permitValidTill DateTime?     @map("permit_valid_till") @db.Date

  // GPS
  gpsDeviceId     String?       @map("gps_device_id") @db.VarChar(64)
  gpsProvider     String?       @map("gps_provider") @db.VarChar(64)

  // Driver
  driverId        String?       @map("driver_id") @db.Uuid
  attendantId     String?       @map("attendant_id") @db.Uuid

  isActive        Boolean       @default(true) @map("is_active")
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt       DateTime?     @map("deleted_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  driver          Employee?     @relation("VehicleDriver", fields: [driverId], references: [id])
  attendant       Employee?     @relation("VehicleAttendant", fields: [attendantId], references: [id])
  routes          Route[]
  trips           Trip[]

  @@unique([schoolId, vehicleNumber])
  @@index([schoolId, status])
  @@index([driverId])
  @@map("vehicles")
}

model Route {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  routeCode       String        @map("route_code") @db.VarChar(32)
  name            String        @db.VarChar(160)
  status          RouteStatus   @default(ACTIVE)

  vehicleId       String?       @map("vehicle_id") @db.Uuid

  // Stops (ordered list)
  stops           Json          @default("[]") // [{name, lat, lng, pickupTime, dropoffTime, fareCents}]

  totalDistanceKm Decimal?      @map("total_distance_km") @db.Decimal(8, 2)
  estimatedDurationMin Int?     @map("estimated_duration_min")

  // Fare
  fareCents       Int           @default(0) @map("fare_cents") // base fare
  roundTripFareCents Int        @default(0) @map("round_trip_fare_cents")

  // Schedule
  pickupStartTime String?       @map("pickup_start_time") @db.VarChar(8) // HH:MM
  dropoffStartTime String?      @map("dropoff_start_time") @db.VarChar(8)

  enrolledCount   Int           @default(0) @map("enrolled_count")

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  vehicle         Vehicle?      @relation(fields: [vehicleId], references: [id])
  trips           Trip[]
  studentAssignments StudentRouteAssignment[]

  @@unique([schoolId, routeCode])
  @@index([schoolId, status])
  @@index([vehicleId])
  @@map("transport_routes")
}

model Trip {
  // A specific run of a route on a specific date
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  routeId         String        @map("route_id") @db.Uuid
  vehicleId       String        @map("vehicle_id") @db.Uuid
  driverId        String?       @map("driver_id") @db.Uuid
  attendantId     String?       @map("attendant_id") @db.Uuid

  tripDate        DateTime      @map("trip_date") @db.Date
  direction       TripDirection
  status          TripStatus    @default(SCHEDULED)

  scheduledStart  DateTime      @map("scheduled_start") @db.Timestamptz
  scheduledEnd    DateTime      @map("scheduled_end") @db.Timestamptz
  actualStart     DateTime?     @map("actual_start") @db.Timestamptz
  actualEnd       DateTime?     @map("actual_end") @db.Timestamptz

  // GPS trail
  gpsTrail        Json?         @map("gps_trail")
  totalDistanceKm Decimal?      @map("total_distance_km") @db.Decimal(8, 2)

  // Incident
  incidentNotes   String?       @map("incident_notes") @db.Text
  delayReason     String?       @map("delay_reason") @db.Text

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  route           Route         @relation(fields: [routeId], references: [id], onDelete: Cascade)
  vehicle         Vehicle       @relation(fields: [vehicleId], references: [id])
  driver          Employee?     @relation("TripDriver", fields: [driverId], references: [id])
  attendant       Employee?     @relation("TripAttendant", fields: [attendantId], references: [id])
  attendances     TransportAttendance[]

  @@unique([routeId, tripDate, direction])
  @@index([schoolId, tripDate])
  @@index([vehicleId, tripDate])
  @@map("trips")
}

model StudentRouteAssignment {
  id              String                 @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                 @map("school_id") @db.Uuid
  branchId        String?                @map("branch_id") @db.Uuid
  studentId       String                 @map("student_id") @db.Uuid
  routeId         String                 @map("route_id") @db.Uuid
  status          StudentTransportStatus @default(ENROLLED)

  // Pickup / drop-off stop index (within route.stops JSON)
  pickupStopIdx   Int?                   @map("pickup_stop_idx")
  dropoffStopIdx  Int?                   @map("dropoff_stop_idx")

  // Schedule
  direction       TripDirection          @default(PICKUP) // PICKUP / DROPOFF / BOTH
  effectiveFrom   DateTime               @map("effective_from") @db.Date
  effectiveTill   DateTime?              @map("effective_till") @db.Date

  // Fare
  fareCents       Int                    @default(0) @map("fare_cents")
  billingCycle    String                 @default("MONTHLY") @map("billing_cycle") @db.VarChar(16)

  createdAt       DateTime               @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime               @updatedAt @map("updated_at") @db.Timestamptz

  school          School                 @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?                @relation(fields: [branchId], references: [id])
  student         Student                @relation(fields: [studentId], references: [id], onDelete: Cascade)
  route           Route                  @relation(fields: [routeId], references: [id], onDelete: Cascade)

  @@unique([studentId, routeId, direction])
  @@index([routeId])
  @@index([studentId])
  @@map("student_route_assignments")
}

model TransportAttendance {
  id              String                   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                   @map("school_id") @db.Uuid
  branchId        String?                  @map("branch_id") @db.Uuid
  tripId          String                   @map("trip_id") @db.Uuid
  studentId       String                   @map("student_id") @db.Uuid
  status          TransportAttendanceStatus @default(ABSENT)

  boardedAt       DateTime?                @map("boarded_at") @db.Timestamptz
  alightedAt      DateTime?                @map("alighted_at") @db.Timestamptz
  stopIdx         Int?                     @map("stop_idx")

  markedById      String?                  @map("marked_by_id") @db.Uuid
  markedAt        DateTime                 @default(now()) @map("marked_at") @db.Timestamptz

  notes           String?                  @db.Text

  createdAt       DateTime                 @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime                 @updatedAt @map("updated_at") @db.Timestamptz

  school          School                   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?                  @relation(fields: [branchId], references: [id])
  trip            Trip                     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  student         Student                  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  markedBy        User?                    @relation("TransportAttendanceMarkedBy", fields: [markedById], references: [id])

  @@unique([tripId, studentId])
  @@index([studentId, markedAt])
  @@map("transport_attendances")
}
'''

# ─────────────────────────────────────────────────────────────────────────────
# 3. Back-relation blocks to inject into existing models
# ─────────────────────────────────────────────────────────────────────────────

SCHOOL_BACK_RELATIONS = '''
  // ─── Wave 7 back-relations (Inventory) ───
  inventoryItems       InventoryItem[]
  stockLots            StockLot[]
  stockMovements       StockMovement[]
  suppliers            Supplier[]
  purchaseRequests     PurchaseRequest[]
  purchaseRequestLines PurchaseRequestLine[]
  purchaseOrders       PurchaseOrder[]
  purchaseOrderLines   PurchaseOrderLine[]
  goodsReceiptNotes    GoodsReceiptNote[]
  grnLines             GrnLine[]
  goodsIssues          GoodsIssue[]
  goodsIssueLines      GoodsIssueLine[]

  // ─── Wave 7 back-relations (Administration) ───
  assets               Asset[]
  maintenanceRequests  MaintenanceRequest[]
  visitorLogs          VisitorLog[]
  facilities           Facility[]
  facilityInspections  FacilityInspection[]

  // ─── Wave 7 back-relations (Transport) ───
  vehicles             Vehicle[]
  transportRoutes      Route[]
  trips                Trip[]
  studentRouteAssignments StudentRouteAssignment[]
  transportAttendances TransportAttendance[]

'''

BRANCH_BACK_RELATIONS = '''
  // ─── Wave 7 back-relations (Inventory + Admin + Transport) ───
  inventoryItems       InventoryItem[]
  stockLots            StockLot[]
  stockMovements       StockMovement[]
  purchaseRequests     PurchaseRequest[]
  purchaseOrders       PurchaseOrder[]
  goodsReceiptNotes    GoodsReceiptNote[]
  goodsIssues          GoodsIssue[]
  assets               Asset[]
  maintenanceRequests  MaintenanceRequest[]
  visitorLogs          VisitorLog[]
  facilities           Facility[]
  facilityInspections  FacilityInspection[]
  vehicles             Vehicle[]
  transportRoutes      Route[]
  trips                Trip[]
  studentRouteAssignments StudentRouteAssignment[]
  transportAttendances TransportAttendance[]

'''

USER_BACK_RELATIONS = '''
  // ─── Wave 7 back-relations ───
  stockMovements       StockMovement[]
  prRequested          PurchaseRequest[]      @relation("PRRequestedBy")
  prApproved           PurchaseRequest[]      @relation("PRApprover")
  poIssued             PurchaseOrder[]        @relation("POIssuedBy")
  grnsReceived         GoodsReceiptNote[]     @relation("GRNReceivedBy")
  goodsIssuedTo        GoodsIssue[]           @relation("GIssuedTo")
  goodsIssuedBy        GoodsIssue[]           @relation("GIssuedBy")
  assetsAssigned       Asset[]                @relation("AssetAssignedTo")
  maintRequested       MaintenanceRequest[]   @relation("MaintRequestedBy")
  maintAssigned        MaintenanceRequest[]   @relation("MaintAssignedTo")
  visitorsToMeet       VisitorLog[]           @relation("VisitorPersonToMeet")
  visitorsApproved     VisitorLog[]           @relation("VisitorApprovedBy")
  inspectionsBy        FacilityInspection[]   @relation("InspectedBy")
  transportAttendanceMarked TransportAttendance[] @relation("TransportAttendanceMarkedBy")

'''

EMPLOYEE_BACK_RELATIONS = '''
  // ─── Wave 7 back-relations (Transport) ───
  vehiclesAsDriver     Vehicle[]              @relation("VehicleDriver")
  vehiclesAsAttendant  Vehicle[]              @relation("VehicleAttendant")
  tripsAsDriver        Trip[]                 @relation("TripDriver")
  tripsAsAttendant     Trip[]                 @relation("TripAttendant")

'''

STUDENT_BACK_RELATIONS = '''
  // ─── Wave 7 back-relations (Transport) ───
  routeAssignments     StudentRouteAssignment[]
  transportAttendances TransportAttendance[]

'''


def inject_back_relations(schema_text: str, marker: str, block: str) -> str:
    """Inject a block of back-relation lines after a marker comment in a model."""
    # Find the marker
    idx = schema_text.find(marker)
    if idx == -1:
        # Try to find by model name and inject before its @@index line
        print(f"  ⚠️ marker not found: {marker!r} — will inject before final @@map of model")
        return schema_text
    # Find next newline after marker
    nl = schema_text.find('\n', idx)
    return schema_text[:nl+1] + block + schema_text[nl+1:]


def main():
    text = SCHEMA.read_text()
    orig_len = len(text)
    print(f"Loaded schema ({orig_len:,} chars)")

    # ── Step A: append enums + models ──
    text = text.rstrip() + '\n' + ENUMS + MODELS
    print(f"After append: {len(text):,} chars (+{len(text)-orig_len:,})")

    # ── Step B: inject back-relations ──
    # School — inject after "Wave 6 back-relations (CRM)" block (right before @@index)
    school_marker_anchor = "  counsellorTargets        CounsellorTarget[]\n"
    if school_marker_anchor in text:
        text = text.replace(
            school_marker_anchor,
            school_marker_anchor + SCHOOL_BACK_RELATIONS,
            1,
        )
        print("  ✓ School back-relations injected")
    else:
        print("  ✗ School anchor not found")

    # Branch — inject after "  dailyReportTemplates DailyReportTemplate[]" (Wave 4 line)
    branch_anchor = "  dailyReportTemplates DailyReportTemplate[]\n"
    if branch_anchor in text:
        text = text.replace(
            branch_anchor,
            branch_anchor + BRANCH_BACK_RELATIONS,
            1,
        )
        print("  ✓ Branch back-relations injected")
    else:
        print("  ✗ Branch anchor not found")

    # User — find a unique Wave 6 back-relations block on User
    # The User model has Wave 5/6 back-relations. Look for a known unique line.
    # We'll inject before the @@index on User model — need to find User's first @@index
    user_block_end_marker = "  counsellorTargets        CounsellorTarget[]\n"  # may not exist on User
    # Use a more reliable strategy: find "model User {" then skip to its closing @@map
    user_match = re.search(r'model User \{([^}]+?)\n\}\n', text, re.DOTALL)
    if user_match:
        user_body = user_match.group(1)
        # inject before the first @@index in User body
        idx_at = user_body.find('  @@index')
        if idx_at != -1:
            new_user_body = user_body[:idx_at] + USER_BACK_RELATIONS + user_body[idx_at:]
            text = text.replace(user_body, new_user_body, 1)
            print("  ✓ User back-relations injected")
        else:
            print("  ✗ User @@index not found")
    else:
        print("  ✗ model User not found")

    # Employee — inject before its @@index([schoolId, status])
    emp_match = re.search(r'model Employee \{([^}]+?)\n\}\n', text, re.DOTALL)
    if emp_match:
        emp_body = emp_match.group(1)
        idx_at = emp_body.find('  @@unique([schoolId, employeeCode])')
        if idx_at != -1:
            new_emp_body = emp_body[:idx_at] + EMPLOYEE_BACK_RELATIONS + emp_body[idx_at:]
            text = text.replace(emp_body, new_emp_body, 1)
            print("  ✓ Employee back-relations injected")
        else:
            # fallback: inject before first @@index
            idx_at = emp_body.find('  @@index')
            if idx_at != -1:
                new_emp_body = emp_body[:idx_at] + EMPLOYEE_BACK_RELATIONS + emp_body[idx_at:]
                text = text.replace(emp_body, new_emp_body, 1)
                print("  ✓ Employee back-relations injected (before @@index)")
            else:
                print("  ✗ Employee anchor not found")
    else:
        print("  ✗ model Employee not found")

    # Student — inject before its @@index
    stu_match = re.search(r'model Student \{([^}]+?)\n\}\n', text, re.DOTALL)
    if stu_match:
        stu_body = stu_match.group(1)
        # find first @@index or @@unique
        idx_at = stu_body.find('  @@unique')
        if idx_at == -1:
            idx_at = stu_body.find('  @@index')
        if idx_at != -1:
            new_stu_body = stu_body[:idx_at] + STUDENT_BACK_RELATIONS + stu_body[idx_at:]
            text = text.replace(stu_body, new_stu_body, 1)
            print("  ✓ Student back-relations injected")
        else:
            print("  ✗ Student anchor not found")
    else:
        print("  ✗ model Student not found")

    # Write back
    SCHEMA.write_text(text)
    print(f"\n✓ Schema written: {len(text):,} chars (+{len(text)-orig_len:,})")

    # ── Step C: validate with prisma format ──
    print("\nRunning prisma format...")
    result = subprocess.run(
        ['npx', 'prisma', 'format', '--schema', str(SCHEMA)],
        capture_output=True, text=True, cwd=str(SCHEMA.parent),
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        sys.exit(1)
    print("✓ prisma format OK")

    # ── Step D: validate with prisma validate ──
    print("\nRunning prisma validate...")
    result = subprocess.run(
        ['npx', 'prisma', 'validate', '--schema', str(SCHEMA)],
        capture_output=True, text=True, cwd=str(SCHEMA.parent),
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        sys.exit(1)
    print("✓ prisma validate OK")


if __name__ == '__main__':
    main()
