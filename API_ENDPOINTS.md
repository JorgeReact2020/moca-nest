# API Endpoints Documentation

## 📋 Complete REST API Reference

### Contacts (`/contacts`)

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/contacts` | Get all contacts | `Contact[]` |
| GET | `/contacts/:id` | Get contact by ID | `Contact` |
| GET | `/contacts/:id/companies` | Get companies for a contact | `Company[]` |
| GET | `/contacts/:id/deals` | Get deals for a contact (includes line items) | `Deal[]` |
| POST | `/contacts` | Create a new contact | `Contact` |
| PUT | `/contacts/:id` | Update a contact | `Contact` |
| DELETE | `/contacts/:id` | Delete a contact | `204 No Content` |

---

### Companies (`/companies`)

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/companies` | Get all companies with contacts | `Company[]` |
| GET | `/companies/:id` | Get company by ID with contact | `Company` |
| POST | `/companies` | Create a new company | `Company` |
| PATCH | `/companies/:id` | Update a company | `Company` |
| DELETE | `/companies/:id` | Delete a company | `204 No Content` |

**Request Body (POST/PATCH):**
```json
{
  "hubspotId": "string",
  "name": "string",
  "domain": "string | null",  // optional
  "contactId": "uuid"
}
```

---

### Deals (`/deals`)

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/deals` | Get all deals with contacts and line items | `Deal[]` |
| GET | `/deals/:id` | Get deal by ID with contact and line items | `Deal` |
| GET | `/deals/:id/line-items` | Get all line items for a deal | `LineItem[]` |
| POST | `/deals` | Create a new deal | `Deal` |
| PATCH | `/deals/:id` | Update a deal | `Deal` |
| DELETE | `/deals/:id` | Delete a deal | `204 No Content` |

**Request Body (POST/PATCH):**
```json
{
  "hubspotId": "string",
  "name": "string",
  "stage": "string | null",      // optional
  "amount": "number | null",      // optional
  "hasLineItems": "boolean",      // optional, default: false
  "contactId": "uuid"
}
```

---

### Line Items (`/line-items`)

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/line-items` | Get all line items with deals | `LineItem[]` |
| GET | `/line-items/:id` | Get line item by ID with deal | `LineItem` |
| POST | `/line-items` | Create a new line item | `LineItem` |
| PATCH | `/line-items/:id` | Update a line item | `LineItem` |
| DELETE | `/line-items/:id` | Delete a line item | `204 No Content` |

**Request Body (POST/PATCH):**
```json
{
  "hubspotId": "string",
  "name": "string",
  "quantity": "number",           // optional, default: 1
  "price": "number | null",       // optional
  "productId": "string | null",   // optional
  "dealId": "uuid"
}
```

---

### Webhooks (`/webhook`)

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| POST | `/webhook/hubspot` | Receive HubSpot contact webhooks | `{ processed: number }` |

**Note:** This endpoint is protected by HubSpot signature verification.

---

## 🔗 Relationships

```
Contact (1) ──< (Many) Companies
Contact (1) ──< (Many) Deals
Deal (1) ──< (Many) LineItems
```

---

## 🔄 Webhook Auto-Sync

When a contact property changes in HubSpot:
1. ✅ Contact is upserted
2. ✅ All associated companies are synced
3. ✅ All associated deals are synced
4. ✅ All line items for each deal are synced

---

## 📊 Response Examples

### GET /contacts/123/companies
```json
[
  {
    "id": "uuid",
    "hubspotId": "12345",
    "name": "Acme Corp",
    "domain": "acme.com",
    "contactId": "123",
    "createdAt": "2025-12-07T10:00:00Z",
    "updatedAt": "2025-12-07T10:00:00Z"
  }
]
```

### GET /deals/456
```json
{
  "id": "uuid",
  "hubspotId": "67890",
  "name": "Enterprise Deal",
  "stage": "closedwon",
  "amount": 50000.00,
  "hasLineItems": true,
  "contactId": "123",
  "createdAt": "2025-12-07T10:00:00Z",
  "updatedAt": "2025-12-07T10:00:00Z",
  "contact": {
    "id": "123",
    "email": "john@example.com",
    "firstname": "John",
    "lastname": "Doe"
  },
  "lineItems": [
    {
      "id": "uuid",
      "hubspotId": "11111",
      "name": "Product A",
      "quantity": 5,
      "price": 1000.00,
      "productId": "prod_123",
      "dealId": "456"
    }
  ]
}
```

---

## ✅ Validation Rules

All DTOs use class-validator decorators:
- `@IsString()` - Must be a string
- `@IsNotEmpty()` - Cannot be empty
- `@IsOptional()` - Field is optional
- `@IsUUID()` - Must be a valid UUID
- `@IsNumber()` - Must be a number
- `@IsBoolean()` - Must be a boolean
