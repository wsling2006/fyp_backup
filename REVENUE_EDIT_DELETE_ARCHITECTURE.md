# Revenue Edit/Delete - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js/React)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Revenue Dashboard (/revenue/accountant)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Revenue Table                                           │  │
│  │  ┌────────────┬─────────┬───────┬─────┬────┬─────────┐  │  │
│  │  │ Date       │ Invoice │ Client│Amt  │Src │ Actions │  │  │
│  │  ├────────────┼─────────┼───────┼─────┼────┼─────────┤  │  │
│  │  │ 2024-12-21│ INV-001 │ ACME  │1500 │Sale│ Edit/Del│  │  │
│  │  │ 2024-12-20│ INV-002 │ XYZ   │2000 │Svc │No access│  │  │
│  │  └────────────┴─────────┴───────┴─────┴────┴─────────┘  │  │
│  │                                                          │  │
│  │  [Edit Modal]              [Delete Modal]               │  │
│  │  ┌─────────────────────┐   ┌──────────────────────────┐ │  │
│  │  │ Update Form         │   │ Confirm Deletion?        │ │  │
│  │  │ [fields...]         │   │ [Cancel]  [Delete]       │ │  │
│  │  │ [Save] [Cancel]     │   └──────────────────────────┘ │  │
│  │  └─────────────────────┘                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  API Calls (via Proxy)                                         │
│  ├─ GET /api/revenue                                           │
│  ├─ GET /api/revenue/summary                                   │
│  ├─ GET /api/revenue/analytics/*                               │
│  ├─ POST /api/revenue          (Create)                        │
│  ├─ PUT /api/revenue/:id       (Edit)                          │
│  └─ DELETE /api/revenue/:id    (Delete)                        │
└─────────────────────────────────────────────────────────────────┘
          ▼
    Next.js API Proxy (/api/[...path]/route.ts)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (NestJS on EC2)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RevenueController (@Controller('revenue'))                    │
│  ├─ POST /revenue         → create()                           │
│  ├─ GET /revenue          → findAll()                          │
│  ├─ GET /revenue/:id      → findOne()                          │
│  ├─ PUT /revenue/:id      → update()  ✨ NEW                  │
│  └─ DELETE /revenue/:id   → remove()  ✨ NEW                  │
│                                                                 │
│  RevenueService                                                │
│  ├─ async create(dto, userId)                                  │
│  ├─ async findAll(query, userId)                               │
│  ├─ async findOne(id, userId)                                  │
│  ├─ async update(id, dto, userId)     ✨ NEW                  │
│  │         ├─ Find revenue record                              │
│  │         ├─ Check: created_by_user_id === userId             │
│  │         ├─ Log unauthorized attempts                        │
│  │         └─ Merge & save if authorized                       │
│  │                                                             │
│  └─ async remove(id, userId)          ✨ NEW                  │
│           ├─ Find revenue record                               │
│           ├─ Check: created_by_user_id === userId              │
│           ├─ Log unauthorized attempts                         │
│           └─ Delete if authorized                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Table: revenue                                                │
│  ┌──────────┬──────────────┬──────────────────────────────┐   │
│  │ id (PK)  │ client       │ amount                       │   │
│  │ uuid     │ varchar      │ bigint (in cents)            │   │
│  ├──────────┼──────────────┼──────────────────────────────┤   │
│  │ date     │ status       │ source                       │   │
│  │ date     │ PAID/PENDING │ varchar                      │   │
│  ├──────────┼──────────────┼──────────────────────────────┤   │
│  │ created_by_user_id      │ (FK to users.id)             │   │
│  │ uuid     ◄────────────────────────────────────────┐    │   │
│  ├──────────┼──────────────┼──────────────────────────────┤   │
│  │ created_at (TIMESTAMP)                             │    │   │
│  │ updated_at (TIMESTAMP)                             │    │   │
│  └──────────┴──────────────┴──────────────────────────────┘   │
│                                                                 │
│  Ownership Check (in update/remove):                           │
│  ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼  │
│  if (revenue.created_by_user_id === currentUserId) {           │
│    allow update/delete                                         │
│  } else {                                                       │
│    throw ForbiddenException(403)                               │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Edit Flow
```
User clicks [Edit] button
          ▼
handleEdit(revenue)
  ├─ Set editingId = revenue.id
  ├─ Populate editFormData with current values
  └─ Convert amount: cents → decimal
          ▼
Edit Modal renders with form
          ▼
User modifies fields and clicks [Save Changes]
          ▼
handleEditSubmit(event)
  ├─ Validate form data
  ├─ Convert amount: decimal → cents
  └─ Call api.put('/revenue/:id', updateData)
          ▼
Backend: PUT /revenue/:id
  ├─ Extract userId from JWT
  ├─ Find revenue record by id
  ├─ Check: created_by_user_id === userId
  │   ├─ ✓ Yes → Merge & save → Return 200 OK
  │   └─ ✗ No  → Return 403 Forbidden
  └─ Log action
          ▼
Frontend handles response
  ├─ Success (200):
  │   ├─ Show "Revenue record updated successfully"
  │   ├─ Close modal
  │   └─ Reload table data
  └─ Error (403):
      └─ Show "You can only edit revenue records you created"
```

### Delete Flow
```
User clicks [Delete] button
          ▼
setDeleteConfirm(revenueId)
  └─ Show confirmation modal
          ▼
User clicks [Delete] in confirmation
          ▼
handleDelete(id)
  └─ Call api.delete('/revenue/:id')
          ▼
Backend: DELETE /revenue/:id
  ├─ Extract userId from JWT
  ├─ Find revenue record by id
  ├─ Check: created_by_user_id === userId
  │   ├─ ✓ Yes → Remove record → Return 200 OK
  │   └─ ✗ No  → Return 403 Forbidden
  └─ Log action
          ▼
Frontend handles response
  ├─ Success (200):
  │   ├─ Show "Revenue record deleted successfully"
  │   ├─ Close confirmation modal
  │   └─ Reload table data
  └─ Error (403):
      └─ Show "You can only delete revenue records you created"
```

## Permission Model

### Ownership-Based Access Control (OBAC)

```
Current User ID: "user-123"
Current User Email: "accountant@company.com"

Revenue Record #1:
├─ id: "revenue-001"
├─ client: "ACME Corp"
├─ created_by_user_id: "user-123"  ← MATCH!
├─ Actions: [Edit] [Delete]        ← Buttons visible
└─ Can edit/delete: YES

Revenue Record #2:
├─ id: "revenue-002"
├─ client: "XYZ Ltd"
├─ created_by_user_id: "user-456"  ← NO MATCH
├─ Actions: "No access"            ← Text only
└─ Can edit/delete: NO
```

## Error Handling Flow

```
API Request (PUT/DELETE) with JWT
          ▼
Backend Middleware
  ├─ Validate JWT token
  │   └─ If invalid/expired → 401 Unauthorized
  ├─ Verify user role (ACCOUNTANT/SUPER_ADMIN)
  │   └─ If invalid role → 403 Forbidden
  └─ Extract userId from JWT
          ▼
RevenueController
  ├─ Find revenue record
  │   └─ If not found → 404 Not Found
  │       └─ Throw NotFoundException
  │
  ├─ Validate ownership (for update/delete)
  │   └─ If not creator → 403 Forbidden
  │       └─ Throw ForbiddenException
  │
  └─ Process request
      ├─ Success → 200 OK
      ├─ Validation error → 400 Bad Request
      └─ Database error → 500 Internal Server Error
          ▼
Frontend Error Handler
  ├─ 2xx Success
  │   ├─ Show success message
  │   ├─ Update UI
  │   └─ Reload data
  │
  ├─ 4xx Client Error
  │   ├─ Show error message from response
  │   └─ Maintain UI state for retry
  │
  ├─ 401 Unauthorized
  │   ├─ Clear token from storage
  │   ├─ Logout user
  │   └─ Redirect to login
  │
  └─ 5xx Server Error
      ├─ Show generic error message
      ├─ Log to console
      └─ Contact support
```

## Type Safety Flow

```
TypeScript Types
├─ RevenueRecord interface (Frontend)
│   └─ id, client, amount, created_by, etc.
│
├─ CreateRevenueDto class (Backend)
│   ├─ @IsNotEmpty() client: string
│   ├─ @IsNumber() amount: number
│   └─ ... validation decorators
│
└─ UpdateRevenueDto class (Backend) ✨ NEW
    ├─ @IsOptional() client?: string
    ├─ @IsNumber() amount?: number
    └─ ... all fields optional
           ▼
Form Data (Frontend)
  ├─ editFormData.client: string
  ├─ editFormData.amount: string (decimal display)
  └─ ... user-editable fields
           ▼
API Request Body
  ├─ client: string
  ├─ amount: number (cents)
  └─ ... validated by UpdateRevenueDto
           ▼
Database Entity (Backend)
  └─ Revenue class with TypeORM decorators
      ├─ @Column() client: string
      ├─ @Column() amount: bigint
      └─ @ManyToOne() created_by: User
```

## Audit Trail

```
All operations logged to console with:
  ├─ [AUDIT] prefix for easy filtering
  ├─ Timestamp (ISO 8601)
  ├─ User ID performing action
  ├─ Revenue record ID affected
  ├─ Operation type (CREATE, UPDATE, DELETE)
  └─ Additional context

Example logs:
[AUDIT] UPDATE_REVENUE {
  userId: "user-123",
  revenueId: "revenue-001",
  changedFields: ["client", "amount"],
  timestamp: "2024-12-21T14:30:00Z"
}

[AUDIT] UNAUTHORIZED_UPDATE_REVENUE {
  userId: "user-456",
  revenueId: "revenue-001",
  ownerId: "user-123",
  timestamp: "2024-12-21T14:31:00Z"
}

[AUDIT] DELETE_REVENUE {
  userId: "user-123",
  revenueId: "revenue-001",
  data: { client: "ACME", amount: 150000 },
  timestamp: "2024-12-21T14:32:00Z"
}
```

## State Management (Frontend)

```
React State Variables
├─ revenues: RevenueRecord[]
│   └─ All revenue records for current view
│
├─ editingId: string | null
│   └─ ID of record being edited (null if modal closed)
│
├─ editFormData: any | null
│   └─ Form values for editing (null if modal closed)
│
└─ deleteConfirm: string | null
    └─ ID of record awaiting deletion confirmation (null if modal closed)

State Transitions:
User Action          → State Change
─────────────────────────────────────
Click [Edit]         → editingId = "id", editFormData = {...}
Click [Save]         → API call → editingId = null
Click [Cancel]       → editingId = null, editFormData = null
Click [Delete]       → deleteConfirm = "id"
Confirm Delete       → API call → deleteConfirm = null
Cancel Delete        → deleteConfirm = null
API Success          → loadData() → revenues updated, modals closed
API Error            → Show message, keep modals open for retry
```

## Deployment Architecture

```
Production Environment
┌────────────────────────────────────────────────────┐
│ Nginx (Port 80/443)                                │
│  ├─ Reverse proxy for Next.js frontend            │
│  └─ Reverse proxy for NestJS backend              │
└─────────────────────┬────────────────────────────┘
                      ▼
┌────────────────────────────────────────────────────┐
│ PM2 (Process Manager)                              │
│  ├─ Frontend: Next.js app (npm run start:prod)    │
│  └─ Backend: NestJS app (node dist/main.js)       │
└─────────────┬──────────────────────────┬──────────┘
              ▼                          ▼
    ┌────────────────┐         ┌────────────────┐
    │ Frontend       │         │ Backend        │
    │ :3001          │         │ :3000          │
    │ (Static/SSR)   │         │ (API only)     │
    └────────────────┘         └────────────────┘
                                        ▼
                            ┌────────────────────┐
                            │ PostgreSQL         │
                            │ Database           │
                            │ (RDS or self-hosted)
                            └────────────────────┘
```
