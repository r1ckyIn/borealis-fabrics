# Stack Research

**Domain:** Supply chain management system — multi-category product expansion + PDF OCR skill + code remediation
**Researched:** 2026-03-17
**Confidence:** HIGH (Claude API docs verified, npm versions verified, Prisma docs verified)

---

## Context: What This Research Covers

The existing NestJS 11 + React 18 + Prisma 6 + MySQL 8 + Redis stack is NOT being re-researched.
This document covers only the four new capability areas:

1. Multi-category product management (adding iron frame / motor / hardware to the fabric-only data model)
2. PDF OCR and data extraction (for the `/contract-ocr` Claude Code skill)
3. Code audit and remediation tooling (for M1 full code remediation)
4. Excel import expansion (for new product category import templates)

---

## Area 1: Multi-Category Product Management

### Recommended Pattern: Multi-Table Inheritance (MTI) via Prisma

**The problem:** The existing `Fabric` model has 20+ fabric-specific fields. Iron frames have model numbers and sets. Motors have control type and channel count. Hardware has piece/set pricing. A single "Product" table with 40+ nullable columns is a maintenance disaster.

**The solution:** MTI with a `Product` base table and category-specific extension tables.

No new library is needed. Prisma 6 (already installed at `^6.19.2`) natively supports this via standard relations.

#### Schema Pattern

```prisma
// Base product entity — shared fields only
model Product {
  id          Int         @id @default(autoincrement())
  productCode String      @unique @map("product_code")
  name        String
  category    ProductCategory
  defaultPrice Decimal?  @map("default_price") @db.Decimal(10, 2)
  isActive    Boolean     @default(true) @map("is_active")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  // Extension tables (1-1, optional)
  ironFrame   IronFrame?
  motor       Motor?
  hardware    Hardware?

  // Shared relations
  orderItems  OrderItem[]
  customerPricing CustomerPricing[]
}

enum ProductCategory {
  IRON_FRAME
  MOTOR
  HARDWARE
}

model IronFrame {
  id          Int     @id @default(autoincrement())
  modelNumber String  @map("model_number")  // e.g. "5618-0", "U18-111"
  // iron-frame-specific fields...
  productId   Int     @unique @map("product_id")
  product     Product @relation(fields: [productId], references: [id])
}
```

#### TypeScript Discriminated Union

Prisma MTI maps naturally to TypeScript discriminated unions at the service layer — no extra library needed:

```typescript
type ProductUnion =
  | ({ category: 'IRON_FRAME' } & Product & { ironFrame: IronFrame })
  | ({ category: 'MOTOR' }     & Product & { motor: Motor })
  | ({ category: 'HARDWARE' }  & Product & { hardware: Hardware });
```

**Why NOT Single-Table Inheritance (STI):** STI would add 25+ nullable columns to a shared table. `motor.channelCount` is meaningless for iron frames. Queries become fragile and model validation becomes impossible at the database level.

**Why NOT ZenStack / typeorm-polymorphic:** These add schema-level abstraction overhead not needed here. Prisma's MTI is well-documented and directly supported since Prisma 5.0. Source: [Prisma Table Inheritance Docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/table-inheritance) — HIGH confidence.

### Supporting: Strategy Pattern for Category-Specific Import Logic

When adding per-category validation in `ImportService`, use NestJS's built-in dependency injection with a strategy map rather than if/else chains:

```typescript
// Register strategies by category token
const IMPORT_STRATEGIES = {
  [ProductCategory.IRON_FRAME]: IronFrameImportStrategy,
  [ProductCategory.MOTOR]:      MotorImportStrategy,
  [ProductCategory.HARDWARE]:   HardwareImportStrategy,
  [ProductCategory.FABRIC]:     FabricImportStrategy,  // existing
};
```

No new library needed. This is a standard NestJS DI pattern.

---

## Area 2: PDF OCR and Data Extraction (Claude Code Skill)

### Recommended: Anthropic SDK + Native PDF Support

**The `/contract-ocr` skill is a Claude Code skill (shell script / TypeScript CLI), not an in-system API endpoint.** This changes the architecture significantly: no server-side OCR service is needed in the NestJS backend.

#### Primary Library: `@anthropic-ai/sdk`

| Property | Value |
|----------|-------|
| Package | `@anthropic-ai/sdk` |
| Latest version | `0.79.0` (released 2026-03-16) |
| Verified from | [GitHub: anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) |
| Confidence | HIGH |

**Why this and not Tesseract.js / pdf.js:** The business documents are Chinese-language PDFs with mixed layouts (tables, hand-stamped values, mixed fonts). Tesseract.js accuracy on Chinese business documents is LOW without significant fine-tuning. Claude's native PDF support uses visual understanding, not character-by-character OCR — it reads tables, stamps, and layout context simultaneously. For a small-team skill tool processing 30-document batches, API cost is trivial compared to implementation complexity.

#### Claude API PDF Capabilities (verified from official docs)

- **Native PDF support**: Pass PDF as `document` block with `source.type: "base64"` or `source.type: "url"`. No page-to-image conversion needed in client code — Claude handles this internally.
- **Token cost**: 1,500–3,000 tokens per page (text) + image tokens per page. A typical 3-page purchase order costs ~6,000–10,000 tokens total.
- **Max pages**: 600 pages per request (100 for 200k-context models). Business documents are 1–5 pages — well within limits.
- **Structured output**: Use `tool_choice: { type: "tool", name: "extract_data" }` with a JSON Schema input_schema to force structured extraction. This is the standard pattern — there is no native `structured_output` field in the Anthropic API (unlike OpenAI).

Source: [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — HIGH confidence.

#### TypeScript Pattern for Skill

```typescript
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const pdfBuffer = fs.readFileSync("contract.pdf");
const pdfBase64 = pdfBuffer.toString("base64");

const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  tools: [{
    name: "extract_contract_data",
    description: "Extract structured data from a Chinese supply chain contract",
    input_schema: {
      type: "object",
      properties: {
        contractNumber: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productCode: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            }
          }
        }
      }
    }
  }],
  tool_choice: { type: "tool", name: "extract_contract_data" },
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
      },
      { type: "text", text: "Extract all contract line items and metadata." }
    ]
  }]
});
```

#### Installation

```bash
# In the Claude Code skill directory (standalone Node.js script)
npm install @anthropic-ai/sdk
```

**What NOT to use:**
- `tesseract.js` — Accuracy issues with Chinese business documents, requires image pre-processing
- `pdf-parse` / `pdfjs-dist` — Text-only extraction, loses table structure and visual layout
- `pdf2pic` + image upload — Adds conversion step that Claude handles natively in PDF mode

---

## Area 3: Code Audit and Remediation Tooling

### The Problem

M1 remediation involves: 97 `any` types in backend tests, 13 in frontend, broken API calls, oversized services (1121L OrderService), and frontend-backend inconsistencies. This is a systematic code quality campaign, not a one-off fix.

### Recommended Toolchain (all already in the project)

No new libraries needed for M1. The existing toolchain handles all remediation tasks:

| Tool | Already Installed | Use for M1 |
|------|------------------|------------|
| `typescript-eslint` | Yes (ESLint 9.18.0 backend, 9.39.1 frontend) | Detect `any` types, enforce patterns |
| `tsc --noEmit` | Yes (tsconfig strict) | Catch type errors missed by ESLint |
| `@typescript-eslint/no-explicit-any` | Yes (ESLint config) | Flag all 97+13 `any` instances |
| Jest / Vitest | Yes | Verify nothing breaks after refactoring |

#### Automated Detection of `any` Types

Run targeted ESLint to get a full inventory before starting M1:

```bash
# Backend: get all any-type locations
cd backend && npx eslint --rule '{"@typescript-eslint/no-explicit-any": "error"}' \
  --ext .ts src/**/*.spec.ts --format compact

# Frontend: same for test files
cd frontend && npx eslint --rule '{"@typescript-eslint/no-explicit-any": "error"}' \
  --ext .ts,tsx src/**/*.test.tsx --format compact
```

**The `fixToUnknown: true` option:** `@typescript-eslint/no-explicit-any` has an auto-fix that converts `any` → `unknown`. Use this with caution on test files — `unknown` requires explicit type assertions and may break test logic. Manual replacement with proper types is safer than bulk auto-fix.

Source: [typescript-eslint no-explicit-any docs](https://typescript-eslint.io/rules/no-explicit-any/) — HIGH confidence.

#### For Oversized Service Decomposition (OrderService 1121L)

No new library. Use the NestJS Strategy Pattern:

1. Extract `OrderStateTransitionService` (state machine logic)
2. Extract `OrderItemService` (item-level tracking)
3. Extract `OrderTimelineService` (timeline/audit events)
4. `OrderService` becomes a thin facade orchestrating the three sub-services

This pattern is well-established in NestJS; no third-party library adds value here.

#### Optional: SonarQube (if code metrics tracking is wanted)

| Tool | Verdict |
|------|---------|
| SonarQube Community | OPTIONAL — useful for tracking M1 progress (complexity scores, duplication %) but adds Docker dependency |
| Snyk | NOT NEEDED — dependency vulnerability scanning; existing helmet + validation already in place |
| Semgrep | NOT NEEDED — overkill for a 2-5 person team; ESLint covers same patterns |

**Recommendation: Skip SonarQube for M1.** The existing ESLint + tsc + test suite is sufficient. SonarQube adds operational overhead that doesn't benefit a small team.

---

## Area 4: Excel Import Expansion for New Product Categories

### Existing Foundation: ExcelJS 4.4.0 (already installed)

The project already uses `exceljs@^4.4.0`. Latest stable is `4.4.0` — no upgrade needed.

The existing `ImportService` (607L) already implements the full pattern: column definitions as constants, template generation with `styleHeaderRow()`, row-by-row validation with skip-existing logic, and `ImportResultDto` for structured results.

**The expansion is purely additive — no new library is needed.**

#### Recommended Pattern: Column Definition Registry

Instead of duplicating the template generation logic for each new category, extract column definitions into a registry:

```typescript
// Column registry pattern (extend existing FABRIC_COLUMNS / SUPPLIER_COLUMNS)
const PRODUCT_COLUMNS: Record<ProductCategory, ExcelJS.Column[]> = {
  [ProductCategory.IRON_FRAME]: [
    { header: 'modelNumber*', key: 'modelNumber', width: 20 },
    { header: 'name*', key: 'name', width: 25 },
    { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
    // iron-frame specific fields...
  ],
  [ProductCategory.MOTOR]: [...],
  [ProductCategory.HARDWARE]: [...],
};
```

With the Strategy Pattern from Area 1, each category's import validation logic stays in its own strategy class, while the `ImportService` orchestration code remains unchanged.

#### ExcelJS Multi-Sheet for Mixed PO Imports

Parent company sends mixed POs (fabric + iron frame + motor on one document). When importing real purchase orders, a multi-sheet workbook pattern handles this:

```typescript
// Each category gets its own worksheet in one workbook
const workbook = new ExcelJS.Workbook();
workbook.addWorksheet('Fabrics');
workbook.addWorksheet('Iron Frames');
workbook.addWorksheet('Motors');
workbook.addWorksheet('Hardware');
```

This matches the actual workflow: one Excel file per import batch, with tabs by category.

Source: [ExcelJS GitHub](https://github.com/exceljs/exceljs) — HIGH confidence (library already in production use in this project).

---

## New Packages to Install

| Package | Version | Area | Where |
|---------|---------|------|-------|
| `@anthropic-ai/sdk` | `^0.79.0` | PDF OCR skill | Claude Code skill directory (standalone) |
| `cos-nodejs-sdk-v5` | `^2.15.4` | COS file migration (M1) | `backend/` |

```bash
# Backend: COS SDK (needed for M1 file service migration)
cd backend && pnpm add cos-nodejs-sdk-v5

# Claude Code skill: Anthropic SDK
# (created as standalone script, not part of backend)
mkdir contract-ocr-skill && cd contract-ocr-skill
pnpm init && pnpm add @anthropic-ai/sdk
```

### cos-nodejs-sdk-v5 Quick Reference

| Property | Value |
|----------|-------|
| Latest version | `2.15.4` |
| TypeScript support | Built-in types included |
| Node.js requirement | 6+ |
| Verified from | npm registry (2025-10) |
| Confidence | HIGH |

The project already has `COS_*` env vars defined in `.env.example` (`COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`). The COS SDK is the only new production dependency for the NestJS backend.

---

## Packages NOT to Install

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tesseract.js` | Low accuracy on Chinese PDFs; requires image pre-processing | Claude API native PDF |
| `pdf-parse` / `pdfjs-dist` | Text-only; loses table structure, stamps, and layout | Claude API native PDF |
| `typeorm-polymorphic` | Requires TypeORM; project uses Prisma | Prisma MTI (native) |
| `zenstack` | Adds schema DSL complexity for a feature Prisma 6 handles natively | Prisma MTI (native) |
| `sonarqube` | Docker operational overhead not justified for 2-5 person team | ESLint + tsc (existing) |
| `snyk` | Adds CI pipeline complexity; not blocking for MVP | helmet + class-validator (existing) |
| `@nestjs/cqrs` | CQRS is over-engineered for OrderService refactoring | Strategy + sub-service extraction |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Prisma MTI (no new lib) | Single Table Inheritance | 40+ nullable columns, no DB-level validation |
| Claude API PDF (base64) | Tesseract.js + pdf.js | Chinese document accuracy issues, maintenance burden |
| Claude API PDF (base64) | Google Cloud Vision OCR | Adds external dependency, GCP billing, setup time |
| ExcelJS multi-sheet | New import library (xlsx, SheetJS) | ExcelJS already in production; SheetJS Community has restrictive license |
| ESLint `--fix` (targeted) | Automated any→unknown bulk replace | `unknown` breaks test assertions; manual replacement safer |
| NestJS Strategy Pattern | CQRS (`@nestjs/cqrs`) | CQRS overhead not justified; strategy achieves same decomposition |

---

## Version Compatibility Notes

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@anthropic-ai/sdk@0.79.0` | Node.js 18+ | Skill runs locally; NestJS backend is Node 18+, compatible |
| `cos-nodejs-sdk-v5@2.15.4` | Node.js 6+ | No conflicts with existing deps |
| `exceljs@4.4.0` | Node.js 12+ | Already in use; no change needed |
| Prisma MTI schema changes | Prisma 6.19.2 | Fully supported since Prisma 5.0 |

---

## Sources

- [Prisma Table Inheritance Docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/table-inheritance) — MTI/STI patterns — HIGH confidence
- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — PDF API capabilities, token costs, TypeScript examples — HIGH confidence
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — version 0.79.0 confirmed — HIGH confidence
- [cos-nodejs-sdk-v5 npm](https://www.npmjs.com/package/cos-nodejs-sdk-v5) — version 2.15.4 confirmed — HIGH confidence
- [typescript-eslint no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/) — fixToUnknown option documented — HIGH confidence
- [ExcelJS GitHub](https://github.com/exceljs/exceljs) — multi-sheet API — HIGH confidence (already in production use)
- WebSearch: NestJS Strategy Pattern / service decomposition 2025 — MEDIUM confidence (community sources, consistent with official NestJS docs)

---

*Stack research for: Borealis Fabrics — M1 Code Remediation + M2 Multi-Category Expansion*
*Researched: 2026-03-17*
