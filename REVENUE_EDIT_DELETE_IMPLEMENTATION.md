# Revenue Edit/Delete Implementation Guide

## Overview
Implemented ownership-based access control for revenue records. Users can now edit and delete revenue records **only if they created them**, ensuring data integrity and preventing unauthorized modifications.

## Changes Made

### Backend Changes

#### 1. New File: `src/revenue/dto/update-revenue.dto.ts`
- Created UpdateRevenueDto with optional fields for partial updates
- Validates using `class-validator` decorators
- Matches CreateRevenueDto validation rules for consistency
- Fields: invoice_id, client, source, amount, currency, date, status, notes

#### 2. Modified: `src/revenue/revenue.controller.ts`
- **Added imports:** `Put`, `Delete` from `@nestjs/common`, `UpdateRevenueDto`
- **New endpoint:** `PUT /revenue/:id`
  - Updates a revenue record
  - Checks ownership via RevenueService
  - Returns updated record
  - Throws `ForbiddenException` if user is not the creator
  
- **New endpoint:** `DELETE /revenue/:id`
  - Deletes a revenue record
  - Checks ownership via RevenueService
  - Returns confirmation message
  - Throws `ForbiddenException` if user is not the creator

#### 3. Modified: `src/revenue/revenue.service.ts`
- **Added imports:** `ForbiddenException`, `UpdateRevenueDto`, `User`
- **New method:** `update(id: string, dto: UpdateRevenueDto, userId: string): Promise<Revenue>`
  - Finds the revenue record
  - Validates ownership: `revenue.created_by_user_id === userId`
  - Throws `ForbiddenException` with message: "You can only edit revenue records you created"
  - Logs unauthorized attempts
  - Merges and saves updated data
  - Returns updated revenue record

- **New method:** `remove(id: string, userId: string): Promise<{ message: string; id: string }>`
  - Finds the revenue record
  - Validates ownership: `revenue.created_by_user_id === userId`
  - Throws `ForbiddenException` with message: "You can only delete revenue records you created"
  - Logs unauthorized attempts and deletion details
  - Removes the record from database
  - Returns confirmation message and record ID

#### 4. Modified: `backend/package.json`
- Added `class-validator` dependency for DTO validation

### Frontend Changes

#### Modified: `app/revenue/accountant/page.tsx`

**New State Variables:**
```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editFormData, setEditFormData] = useState<any>(null);
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
```

**New Functions:**

1. **`canEditDelete(revenueId: string): boolean`**
   - Checks if current user created the revenue record
   - Compares `record.created_by?.id` with `user?.userId`
   - Returns true only if user is the creator

2. **`handleEdit(revenue: RevenueRecord)`**
   - Opens edit modal
   - Populates form with existing record data
   - Converts amount from cents to decimal (for display)
   - Sets editingId and editFormData

3. **`handleEditSubmit(e: React.FormEvent)`**
   - Validates form data
   - Converts amount back to cents
   - Calls `PUT /revenue/:id` API endpoint
   - On success: closes modal, shows message, reloads data
   - On error: shows error message, maintains modal state

4. **`handleDelete(id: string)`**
   - Calls `DELETE /revenue/:id` API endpoint
   - On success: closes confirmation, shows message, reloads data
   - On error: shows error message, maintains confirmation modal
   - Handles 401/403 errors by logging out user

**UI Changes:**

1. **Actions Column in Table**
   - Added new column header "Actions" with centered text alignment
   - For each revenue record:
     - If user can edit/delete: show "Edit" and "Delete" buttons
       - Blue "Edit" button with hover effect
       - Red "Delete" button with hover effect
     - If user cannot edit/delete: show "No access" text in gray

2. **Edit Modal**
   - Triggers when user clicks Edit button
   - Full-width modal with backdrop (dark overlay)
   - Contains form matching "Add Revenue" form:
     - Invoice ID (optional)
     - Client (required)
     - Source (required)
     - Amount (required, in SGD)
     - Date (required)
     - Status dropdown (PAID/PENDING)
     - Notes textarea (optional)
   - Cancel and "Save Changes" buttons
   - Closes when user clicks X, Cancel, or backdrop

3. **Delete Confirmation Modal**
   - Small centered modal with white background
   - Warning message: "Are you sure you want to delete this revenue record? This action cannot be undone."
   - Cancel and Delete buttons
   - Closes when user clicks Cancel or backdrop

## Security Features

### Backend
- **Ownership Validation:** Every update/delete operation verifies `created_by_user_id === userId`
- **Audit Logging:** All unauthorized attempts are logged with user ID, record ID, and timestamp
- **Role-Based Access:** Only ACCOUNTANT and SUPER_ADMIN roles can access revenue endpoints
- **Error Handling:** Clear error messages returned to client without exposing sensitive info

### Frontend
- **Conditional Rendering:** Edit/Delete buttons only show for user's own records
- **Permission Check Function:** `canEditDelete()` validates access before action
- **API Error Handling:** Proper error messages and state management
- **Session Management:** Logout on 401/403 errors

## API Endpoints

### Update Revenue Record
```
PUT /revenue/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

Body (all fields optional):
{
  "invoice_id": "INV-001",
  "client": "Client Name",
  "source": "Product Sales",
  "amount": 150000,  // in cents (150000 = SGD 1500.00)
  "currency": "SGD",
  "date": "2024-12-21",
  "status": "PAID",
  "notes": "Updated notes"
}

Response (200 OK):
{
  "id": "uuid",
  "invoice_id": "INV-001",
  "client": "Client Name",
  "source": "Product Sales",
  "amount": 150000,
  "currency": "SGD",
  "date": "2024-12-21",
  "status": "PAID",
  "notes": "Updated notes",
  "created_by": {
    "id": "user-uuid",
    "email": "user@example.com"
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-12-21T14:30:00Z"
}

Error (403 Forbidden):
{
  "message": "You can only edit revenue records you created",
  "error": "Forbidden",
  "statusCode": 403
}
```

### Delete Revenue Record
```
DELETE /revenue/:id
Authorization: Bearer <jwt_token>

Response (200 OK):
{
  "message": "Revenue record deleted successfully",
  "id": "uuid"
}

Error (403 Forbidden):
{
  "message": "You can only delete revenue records you created",
  "error": "Forbidden",
  "statusCode": 403
}
```

## User Workflows

### Edit a Revenue Record
1. User views Revenue Dashboard table
2. Finds record in "Created By" column matching their email
3. Clicks "Edit" button in Actions column
4. Edit modal appears with current values
5. Updates desired fields (all optional)
6. Clicks "Save Changes"
7. Backend validates ownership and updates record
8. Modal closes, table refreshes with updated data
9. Success message displays

### Delete a Revenue Record
1. User views Revenue Dashboard table
2. Finds record they created
3. Clicks "Delete" button in Actions column
4. Delete confirmation modal appears with warning
5. Confirms deletion by clicking "Delete" button
6. Backend validates ownership and deletes record
7. Modal closes, table refreshes
8. Success message displays

### Attempt Unauthorized Edit/Delete
1. User views Revenue Dashboard table
2. Sees records created by other users
3. No "Edit"/"Delete" buttons visible for those records
4. "No access" text displays in Actions column
5. User cannot interact with the record

## Testing the Feature

### Test Ownership Validation (Backend)
```bash
# As User A, create a revenue record
POST /revenue
Body: { "client": "Test Client", "amount": 100000, ... }
# Response: { "id": "record-123", "created_by_user_id": "user-a-id", ... }

# As User B, try to update User A's record
PUT /revenue/record-123
# Response: 403 Forbidden - "You can only edit revenue records you created"

# As User A, update their own record
PUT /revenue/record-123
Body: { "client": "Updated Client" }
# Response: 200 OK with updated record

# As User B, try to delete User A's record
DELETE /revenue/record-123
# Response: 403 Forbidden - "You can only delete revenue records you created"

# As User A, delete their own record
DELETE /revenue/record-123
# Response: 200 OK - { "message": "Revenue record deleted successfully", "id": "record-123" }
```

### Test UI Restrictions (Frontend)
1. Login as User A
2. Create a revenue record (shows in table with User A's email)
3. See "Edit" and "Delete" buttons in Actions column
4. Logout and login as User B
5. Navigate to Revenue Dashboard
6. See User A's record in table
7. Verify "No access" shows in Actions column instead of buttons
8. See User B's records (if any) with "Edit"/"Delete" buttons

## Error Handling

### Backend Errors
- `404 Not Found`: Revenue record doesn't exist
- `403 Forbidden`: User is not the creator of the record
- `400 Bad Request`: Invalid update data in request body
- `401 Unauthorized`: JWT token missing or invalid

### Frontend Error Messages
- Network errors: Show generic error message
- 401/403 errors: Logout user and redirect to login
- Validation errors: Display validation messages from backend
- All errors logged to console for debugging

## Code Quality

- **TypeScript:** Full type safety with interfaces
- **Validation:** Class-validator on both frontend and backend
- **Audit Trail:** Console logging of all create/read/update/delete operations
- **RESTful Design:** Proper HTTP methods (PUT for update, DELETE for delete)
- **Error Handling:** Consistent error responses with clear messages
- **Documentation:** Comprehensive comments in code and this guide

## Deployment Notes

1. **Database:** No migrations required (uses existing revenue table)
2. **Dependencies:** Added `class-validator` to backend package.json
3. **Environment:** No new environment variables required
4. **Build:** Both frontend and backend build successfully
5. **Testing:** Manual testing recommended before production deployment

## Future Enhancements

- Add bulk edit functionality for multiple records
- Implement soft deletes with audit trail preservation
- Add version history for edited records
- Extend permissions for managers to approve/edit subordinate records
- Add export audit logs for compliance
