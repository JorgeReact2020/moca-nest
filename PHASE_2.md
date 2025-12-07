# PHASE 2: Companies, Deals & Line Items Sync

## ✅ IMPLEMENTATION COMPLETE

### Confirmed Requirements:
- ✅ **Company-Contact**: One-to-Many (1 contact → many companies)
- ✅ **Deal Table**: `has_line_items` (boolean) + `stage` (string) + `amount` (decimal)
- ✅ **Line Item Table**: `price` (decimal) + `quantity` (integer)
- ✅ **Sync Trigger**: Every contact property change
- ✅ **Rate Limits**: Handle later if needed

### Implementation Status:
- ✅ **Database Entities**: Company, Deal, LineItem created with TypeORM
- ✅ **Relationships**: OneToMany/ManyToOne with CASCADE deletes
- ✅ **HubSpot Service**: 6 new API methods for associations and entity fetching
- ✅ **Webhook Service**: Complete sync orchestration for all related entities
- ✅ **Type Safety**: All nullable fields properly typed with `| null`
- ✅ **Error Handling**: Continues processing even if individual items fail
- ✅ **Build**: TypeScript compilation successful ✅
- ✅ **Lint**: ESLint passed with no errors ✅

### Ready for Testing:
1. Start application and verify TypeORM creates all 4 tables
2. Trigger HubSpot contact webhook
3. Verify companies, deals, and line items sync correctly
4. Test cascade deletes

---

## 🗄️ Database Schema

### 1. Companies Table
```typescript
- id: UUID (PK)
- hubspot_id: string (unique, indexed)
- name: string
- domain: string (nullable)
- contact_id: UUID (FK → contacts.id, CASCADE DELETE)
- created_at: timestamp
- updated_at: timestamp
```

### 2. Deals Table
```typescript
- id: UUID (PK)
- hubspot_id: string (unique, indexed)
- name: string
- stage: string (e.g., "appointmentscheduled", "closedwon")
- amount: decimal(10,2) (nullable)
- has_line_items: boolean (default false)
- contact_id: UUID (FK → contacts.id, CASCADE DELETE)
- created_at: timestamp
- updated_at: timestamp
```

### 3. Line Items Table
```typescript
- id: UUID (PK)
- hubspot_id: string (unique, indexed)
- name: string
- quantity: integer (default 1)
- price: decimal(10,2) (nullable)
- product_id: string (nullable)
- deal_id: UUID (FK → deals.id, CASCADE DELETE)
- created_at: timestamp
- updated_at: timestamp
```

---

## 🏗️ Implementation Tasks

### ✅ TASK 1: Create TypeORM Entities (15 min)
- [ ] `src/entities/company.entity.ts`
- [ ] `src/entities/deal.entity.ts`
- [ ] `src/entities/line-item.entity.ts`
- [ ] Update `src/entities/contact.entity.ts` with relationships

### ✅ TASK 2: Register Entities in Module (5 min)
- [ ] Update `app.module.ts` to include new entities

### ✅ TASK 3: Enhance HubSpot Service (30 min)
Add methods to `src/modules/hubspot/hubspot.service.ts`:
- [ ] `getContactCompanies(contactId: string)`
- [ ] `getCompanyById(companyId: string)`
- [ ] `getContactDeals(contactId: string)`
- [ ] `getDealById(dealId: string)`
- [ ] `getDealLineItems(dealId: string)`
- [ ] `getLineItemById(lineItemId: string)`

### ✅ TASK 4: Enhance Webhook Service (45 min)
Update `src/modules/webhook/webhook.service.ts`:
- [ ] Add company sync logic
- [ ] Add deal sync logic
- [ ] Add line item sync logic
- [ ] Update `has_line_items` flag on deals

### ✅ TASK 5: Add Logging (10 min)
- [ ] Log each sync step
- [ ] Log API call counts
- [ ] Log any missing associations

### ✅ TASK 6: Testing (20 min)
- [ ] Test with HubSpot webhook
- [ ] Verify relationships in DB
- [ ] Check cascade deletes

---

## 🔌 HubSpot API Endpoints

### Companies
```
GET /crm/v4/objects/contacts/{contactId}/associations/companies
GET /crm/v3/objects/companies/{companyId}?properties=name,domain
```

### Deals
```
GET /crm/v4/objects/contacts/{contactId}/associations/deals
GET /crm/v3/objects/deals/{dealId}?properties=dealname,dealstage,amount
```

### Line Items
```
GET /crm/v4/objects/deals/{dealId}/associations/line_items
GET /crm/v3/objects/line_items/{lineItemId}?properties=name,quantity,price,hs_product_id
```

---

## 📊 Sync Flow

```
Webhook Event (Contact Property Change)
  ↓
1. Fetch & Upsert Contact ✅ (existing)
  ↓
2. Fetch Contact → Companies Associations
  ↓
3. For Each Company:
   - Fetch company details
   - Upsert to DB (link to contact)
  ↓
4. Fetch Contact → Deals Associations
  ↓
5. For Each Deal:
   - Fetch deal details (name, stage, amount)
   - Fetch Deal → Line Items Associations
   - Count line items → set has_line_items
   - Upsert deal to DB (link to contact)
   ↓
6. For Each Line Item (per deal):
   - Fetch line item details (name, quantity, price, product_id)
   - Upsert to DB (link to deal)
  ↓
✅ Complete Sync
```

---

## 🎯 Expected Database State After Sync

### Example Contact: John Doe (hubspot_id: 123)

**contacts table:**
```
id: uuid-1
hubspot_id: "123"
email: john@example.com
first_name: John
last_name: Doe
```

**companies table:**
```
id: uuid-2
hubspot_id: "456"
name: "Acme Corp"
domain: "acme.com"
contact_id: uuid-1  ← Link to John
```

**deals table:**
```
id: uuid-3
hubspot_id: "789"
name: "Q1 2025 Deal"
stage: "negotiation"
amount: 50000.00
has_line_items: true
contact_id: uuid-1  ← Link to John
```

**line_items table:**
```
id: uuid-4
hubspot_id: "101"
name: "Professional License"
quantity: 5
price: 10000.00
product_id: "prod-123"
deal_id: uuid-3  ← Link to deal
```

---

## 🚀 Implementation Order

1. **Entities** → Database structure
2. **HubSpot Service** → API calls
3. **Webhook Service** → Orchestration
4. **Testing** → Validation

Total time: ~2 hours

---

**Ready to start? I'll begin with TASK 1: Creating TypeORM entities.**
