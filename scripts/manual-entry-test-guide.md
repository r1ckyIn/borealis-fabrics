# Manual Entry Test Guide

Step-by-step manual entry test guide using real data values from the imported test files.
Complete at least **Scenario A** to validate DATA-03 (manual entry of a complete business chain).

---

## Prerequisites

- Backend running at `http://localhost:3000`
- Frontend running at `http://localhost:5173`
- Import test completed (`run-full-import-test.ts` has been run)
- Logged in to the system

---

## Scenario A: Pure Fabric Order

**Goal:** Create a complete supplier-customer-fabric-quote-order chain using real data.

### Step 1: Verify Supplier Exists

- [ ] Navigate to **Suppliers** page (`/suppliers`)
- [ ] Search for `博源纺织`
- [ ] Confirm the supplier exists in the list (created during import)
- [ ] Click into the detail page and verify `companyName = 博源纺织`

### Step 2: Create a New Customer

- [ ] Navigate to **Customers** page (`/customers`)
- [ ] Click **New Customer**
- [ ] Fill in:
  - Company Name: `Sydney Test Furniture Co.`
  - Contact Name: `James Wang`
  - Phone: `0412345678`
  - Email: `james@sydneytest.com.au`
  - Credit Type: `Prepay`
- [ ] Click **Save**
- [ ] Verify redirect to customer detail page
- [ ] Confirm data displays correctly

### Step 3: Verify Fabric Exists

- [ ] Navigate to **Fabrics** page (`/products/fabrics`)
- [ ] Search for one of the imported fabrics (e.g., search by fabric code prefix `BY-`)
- [ ] Click into a fabric detail page
- [ ] Verify fields: name, composition, weight, width, defaultPrice
- [ ] Note the fabric name and price for the quote (e.g., fabric with code `BY-001`)

### Step 4: Create a Quote with 2 Fabric Items

- [ ] Navigate to **Quotes** page (`/quotes`)
- [ ] Click **New Quote**
- [ ] Fill in:
  - Customer: `Sydney Test Furniture Co.` (search and select)
  - Valid Until: a date 30 days from now
  - Notes: `Test quote for manual entry validation`
- [ ] Click **Save** to create the quote header
- [ ] On the quote detail page, add items:
  - **Item 1:**
    - Type: Fabric
    - Select a fabric from the imported list (e.g., one from BY supplier)
    - Quantity: `500`
    - Unit Price: use the fabric's default price or enter `25.50`
  - **Item 2:**
    - Type: Fabric
    - Select a different fabric (e.g., one from HF supplier)
    - Quantity: `300`
    - Unit Price: `32.00`
- [ ] Verify both items appear in the quote items table
- [ ] Verify the quote total is calculated correctly

### Step 5: Convert Quote to Order

- [ ] On the quote detail page, select both items via checkboxes
- [ ] Click **Convert to Order**
- [ ] Confirm the conversion dialog
- [ ] Verify redirect to the new order detail page
- [ ] Verify:
  - Order status is `PENDING`
  - Order has 2 items matching the quote items
  - Item quantities and prices match the quote
  - Quote items show "Converted from quote item" in timeline/remarks
- [ ] Go back to the quote and verify its status is `CONVERTED`

### Expected Results

| Check                           | Expected                          |
|---------------------------------|-----------------------------------|
| Supplier exists                 | 博源纺织 found in supplier list   |
| Customer created                | Sydney Test Furniture Co. saved   |
| Fabric searchable               | Imported fabrics appear in search |
| Quote created with 2 items      | Both items with correct prices    |
| Quote converted to order        | Order created, quote = CONVERTED  |

---

## Scenario B: Mixed Order (Fabric + Iron Frame)

**Goal:** Create an order directly with both fabric and product items.

### Step 1: Create Order Directly

- [ ] Navigate to **Orders** page (`/orders`)
- [ ] Click **New Order**
- [ ] Fill in:
  - Customer: `Miraggo HomeLiving` (should exist from import setup)
  - Notes: `Mixed order test - fabric and iron frame`
- [ ] Click **Save**

### Step 2: Add Fabric Item

- [ ] On the order detail page, click **Add Item**
- [ ] Select Type: **Fabric**
- [ ] Search and select an imported fabric
- [ ] Quantity: `200`
- [ ] Unit Price: enter a price from the imported data (e.g., `28.00`)
- [ ] Save the item

### Step 3: Add Product Item (Iron Frame)

- [ ] Click **Add Item** again
- [ ] Select Type: **Product**
- [ ] Search and select an imported product (e.g., search for an iron frame model)
- [ ] Quantity: `50`
- [ ] Unit Price: enter the product's sale price
- [ ] Save the item

### Step 4: Verify Mixed Order

- [ ] Verify both items appear in the order items table
- [ ] Verify item types are correctly displayed (Fabric vs Product)
- [ ] Verify totals are calculated across both item types

### Expected Results

| Check                          | Expected                                |
|--------------------------------|-----------------------------------------|
| Order created                  | New order with PENDING status           |
| Fabric item added              | Fabric item with correct price/quantity |
| Product item added             | Product item with correct price/quantity|
| Mixed items display            | Both types shown in same order          |

---

## Scenario C: Quote-to-Order Partial Conversion

**Goal:** Create a quote with 3 items, partially convert, then convert the rest.

### Step 1: Create Quote with 3 Items

- [ ] Navigate to **Quotes** page (`/quotes`)
- [ ] Click **New Quote**
- [ ] Customer: `Sydney Test Furniture Co.`
- [ ] Valid Until: 30 days from now
- [ ] Notes: `Partial conversion test`
- [ ] Save the quote header
- [ ] Add 3 items:
  - **Item 1:** Fabric, quantity 100, price 20.00
  - **Item 2:** Fabric, quantity 200, price 35.00
  - **Item 3:** Product (iron frame), quantity 30, price 150.00

### Step 2: Partial Conversion (2 of 3 items)

- [ ] Select only Item 1 and Item 2 (not Item 3)
- [ ] Click **Convert to Order**
- [ ] Confirm the conversion
- [ ] Verify a new order is created with only 2 items
- [ ] Go back to the quote
- [ ] Verify quote status is `PARTIALLY_CONVERTED`
- [ ] Verify Item 1 and Item 2 show as converted (disabled/grayed out)
- [ ] Verify Item 3 is still selectable

### Step 3: Convert Remaining Item

- [ ] Select Item 3
- [ ] Click **Convert to Order**
- [ ] Confirm the conversion
- [ ] Verify a new order is created with 1 item (the iron frame)
- [ ] Go back to the quote
- [ ] Verify quote status is now `CONVERTED`

### Expected Results

| Check                              | Expected                              |
|------------------------------------|---------------------------------------|
| Quote with 3 items                 | All 3 items visible                   |
| Partial conversion (2 items)       | Order 1 has 2 fabric items            |
| Quote status after partial         | PARTIALLY_CONVERTED                   |
| Remaining conversion (1 item)      | Order 2 has 1 product item            |
| Quote status after full conversion | CONVERTED                             |
| Total orders created               | 2 separate orders from 1 quote        |

---

## Post-Test Checklist

After completing at least Scenario A:

- [ ] All list pages load without errors (`/products/fabrics`, `/products/iron-frame`, `/suppliers`, `/customers`, `/orders`, `/quotes`)
- [ ] Search works on list pages (try searching imported data)
- [ ] Detail pages load without 500 errors
- [ ] Import page (`/import`) shows all 4 tabs
- [ ] No console errors in browser DevTools
