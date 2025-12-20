# Revenue Edit/Delete - Testing Guide

## Pre-Testing Checklist

- [ ] Backend is running (NestJS on port 3000)
- [ ] Frontend is running (Next.js on port 3001)
- [ ] Database is accessible (PostgreSQL)
- [ ] JWT authentication is working
- [ ] Two test user accounts created

## Test Setup

### Create Test Users

```sql
-- User A (Accountant)
INSERT INTO "users" (id, email, password_hash, role, created_at) VALUES 
  ('user-a-id', 'accountant-a@test.com', 'hashed_password_a', 'accountant', NOW());

-- User B (Accountant)
INSERT INTO "users" (id, email, password_hash, role, created_at) VALUES 
  ('user-b-id', 'accountant-b@test.com', 'hashed_password_b', 'accountant', NOW());
```

Or use the frontend to create accounts via signup.

## Test Scenarios

### Scenario 1: Create and Edit Own Record

**Test Case 1.1: Create Revenue Record**
```
✓ Login as User A
✓ Navigate to Revenue Dashboard
✓ Click "Add Revenue"
✓ Fill in form:
  - Client: "Test Client A"
  - Source: "Product Sales"
  - Amount: 1000.00
  - Date: Today's date
  - Status: PENDING
  - Notes: "Test record"
✓ Click "Save Revenue"
✓ Verify record appears in table with User A's email
✓ See "Edit" and "Delete" buttons in Actions column
```

**Expected Result:**
- Record created successfully
- Table updates immediately
- Success message displayed
- Edit/Delete buttons visible

**Test Case 1.2: Edit Own Record**
```
✓ From Scenario 1.1, click "Edit" on your record
✓ Modal appears with current values
✓ Change fields:
  - Client: "Updated Client A"
  - Status: PAID
  - Amount: 1500.00
✓ Click "Save Changes"
✓ Modal closes, table refreshes
✓ Verify updated values in table
```

**Expected Result:**
- Edit modal appears with pre-filled data
- All fields are editable
- Save successful
- Table reflects changes immediately
- Success message displayed

**Test Case 1.3: Delete Own Record**
```
✓ From Scenario 1.2, click "Delete" on your record
✓ Confirmation modal appears with warning
✓ Read confirmation message carefully
✓ Click "Delete" button
✓ Verify record removed from table
```

**Expected Result:**
- Confirmation modal appears
- Clear warning message shown
- Record deleted on confirmation
- Table refreshes without record
- Success message displayed

---

### Scenario 2: Attempt Unauthorized Edit

**Test Case 2.1: Cannot Edit Other User's Record**
```
✓ Login as User A
✓ Create a revenue record (as in Scenario 1.1)
✓ Note the record appears with User A's email in "Created By" column
✓ Logout
✓ Login as User B
✓ Navigate to Revenue Dashboard
✓ Find User A's record in the table
✓ Look at Actions column
✓ Attempt to click Edit button (should not be visible)
```

**Expected Result:**
- Edit/Delete buttons NOT visible for User A's record
- "No access" text displayed instead
- User B cannot interact with the record
- No edit/delete buttons appear

**Test Case 2.2: Backend Rejects Unauthorized Edit (API Level)**
```
# As User B, try to edit User A's record via API
$ curl -X PUT http://localhost:3000/api/revenue/record-id \
  -H "Authorization: Bearer <user-b-token>" \
  -H "Content-Type: application/json" \
  -d '{"client": "Hacked Client"}'

Expected Response (403 Forbidden):
{
  "message": "You can only edit revenue records you created",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Expected Result:**
- API returns 403 Forbidden
- Clear error message indicating ownership restriction
- Record not modified

**Test Case 2.3: Cannot Delete Other User's Record**
```
✓ Login as User A
✓ Create revenue record
✓ Logout and login as User B
✓ Navigate to Revenue Dashboard
✓ Find User A's record
✓ "No access" shown in Actions (no Delete button)
✓ Try to delete via API (should fail)
```

**Expected Result:**
- Delete button not visible
- API call returns 403 Forbidden
- Record still exists in database

---

### Scenario 3: Multiple User Interactions

**Test Case 3.1: Both Users Create Records**
```
✓ User A:
  - Login
  - Create "Record A1" (Amount: 1000)
  - Verify "Edit"/"Delete" buttons visible
  
✓ User B (new browser/private window):
  - Login
  - Create "Record B1" (Amount: 2000)
  - Verify "Edit"/"Delete" buttons visible
  
✓ User A:
  - Still logged in
  - Refresh Revenue Dashboard
  - See both records in table
  - "Edit"/"Delete" visible only for "Record A1"
  - "No access" for "Record B1"
  
✓ User B:
  - Refresh dashboard
  - See both records
  - "Edit"/"Delete" visible only for "Record B1"
  - "No access" for "Record A1"
```

**Expected Result:**
- Each user can only edit/delete their own records
- Table shows all records for both users
- UI correctly restricts buttons based on creator
- No access text shows for other users' records

**Test Case 3.2: Edit and Verify Audit Trail**
```
✓ User A edits their record
✓ User A deletes a record
✓ Check backend console logs for:
  - [AUDIT] UPDATE_REVENUE with userId
  - [AUDIT] DELETE_REVENUE with user details
  - Timestamps and changed fields logged
```

**Expected Result:**
- Console shows audit logs
- Logs contain userId, recordId, timestamp
- Edit logs show changed fields
- Delete logs show deleted record details

---

### Scenario 4: Data Validation

**Test Case 4.1: Update with Partial Data**
```
✓ Click Edit on a record
✓ Change ONLY the Status field from PENDING to PAID
✓ Leave other fields unchanged
✓ Click "Save Changes"
✓ Verify:
  - Only Status updated in table
  - Other fields unchanged
  - Success message displayed
```

**Expected Result:**
- Only changed field updated
- Other fields remain intact
- Backend accepts partial update (UpdateRevenueDto)
- No validation errors for unchanged fields

**Test Case 4.2: Amount Conversion (Decimal ↔ Cents)**
```
✓ Create record with Amount: 1234.56
✓ Backend stores: 123456 (in cents)
✓ Edit record
✓ Form displays: 1234.56 (in SGD decimal)
✓ Change to: 2345.67
✓ Backend stores: 234567 (in cents)
✓ View table
✓ Amount displays: SGD 2345.67 (formatted)
```

**Expected Result:**
- Frontend converts decimal ↔ cents correctly
- Display formatting shows SGD currency
- Database stores cents (no floating point issues)
- Amount displays correctly in table

**Test Case 4.3: Date Handling**
```
✓ Edit record with future date
✓ Edit record with past date
✓ Edit record with today's date
✓ Verify all dates save and display correctly
✓ No date parsing errors
```

**Expected Result:**
- All date formats handled correctly
- No timezone issues
- Dates display consistently

---

### Scenario 5: Error Handling

**Test Case 5.1: Network Error During Edit**
```
✓ Open Developer Tools (F12)
✓ Network tab → Throttle to "Offline"
✓ Click Edit on a record
✓ Modal appears
✓ Click "Save Changes"
✓ Observe error message
✓ Re-enable network
✓ Retry edit
```

**Expected Result:**
- Error message displayed for offline state
- Modal remains open for retry
- No partial updates to database

**Test Case 5.2: Token Expired During Edit**
```
✓ Login with short token expiry (or wait for expiry)
✓ Open record for edit
✓ Wait for token to expire
✓ Click "Save Changes"
✓ Observe 401 error handling
✓ User should be logged out
✓ Redirected to login page
```

**Expected Result:**
- 401 Unauthorized error caught
- User logged out automatically
- Redirected to login
- Token cleared from storage

**Test Case 5.3: Record Not Found**
```
# Manually delete a record from database
$ DELETE FROM revenue WHERE id = 'test-id';

✓ As creator, try to edit non-existent record
✓ Should show 404 Not Found error
✓ Error message: "Revenue record with ID ... not found"
```

**Expected Result:**
- 404 error returned
- Clear error message displayed
- No UI crash or unexpected behavior

---

### Scenario 6: UI/UX Tests

**Test Case 6.1: Modal Closing Behavior**
```
✓ Open Edit modal
✓ Click X button → Should close modal
✓ Open Edit modal
✓ Click outside modal (on backdrop) → Should close modal
✓ Open Edit modal
✓ Click Cancel button → Should close modal
✓ Verify form data cleared after closing
```

**Expected Result:**
- All three methods close modal
- Modal closes without saving changes
- Form data reset for next edit

**Test Case 6.2: Delete Confirmation**
```
✓ Click Delete button
✓ Read confirmation message carefully
✓ Click Cancel → Modal closes, record still exists
✓ Click Delete button again
✓ Read message again
✓ Click Delete → Record deleted
✓ Verify clear visual distinction between Cancel and Delete buttons
```

**Expected Result:**
- Confirmation modal clear and visible
- Cancel button works
- Delete button properly styled (red)
- No accidental deletions

**Test Case 6.3: Loading States**
```
✓ During edit/delete API call
✓ Buttons should show loading state (optional spinner)
✓ No double-submit possible (buttons disabled during request)
✓ Success message appears when done
```

**Expected Result:**
- Appropriate loading feedback
- Buttons disabled during request
- No duplicate API calls
- Clear completion status

---

## Regression Testing

### Ensure Existing Features Still Work

**Test Case R1: Create Revenue Still Works**
```
✓ Click "Add Revenue" button
✓ Fill form
✓ Click "Save Revenue"
✓ Record appears in table
✓ No interference from edit/delete feature
```

**Test Case R2: View Revenue Still Works**
```
✓ Revenue table displays all records
✓ Filters work (date range, status, client)
✓ Analytics charts display correctly
✓ Export to CSV works
✓ Export to PDF works
```

**Test Case R3: User Role Restrictions**
```
✓ Non-accountant user cannot access /revenue/accountant
✓ Super admin can access and edit all records
✓ Regular accountant can only edit own records
```

---

## Performance Testing

**Test Case P1: Edit Form with Large Amount**
```
✓ Edit record with very large amount (999999999.99)
✓ Form displays correctly
✓ Save completes successfully
✓ Amount displays correctly in table
```

**Test Case P2: Rapid Edit Attempts**
```
✓ Click Edit multiple times
✓ Only one modal should be open at a time
✓ Each edit overwrites previous edits in modal
✓ Verify proper state management
```

**Test Case P3: Delete Multiple Records**
```
✓ Delete several records in succession
✓ Each delete is independent
✓ All deletions successful
✓ Table updates correctly after each delete
```

---

## Browser Compatibility

Test on the following browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Test Case B1: Modal Display**
```
✓ Edit/Delete modals appear correctly
✓ Form inputs work on all browsers
✓ Buttons are clickable
✓ No layout shifts
```

**Test Case B2: Responsive Design**
```
✓ Test on mobile (small screen)
✓ Test on tablet (medium screen)
✓ Test on desktop (large screen)
✓ Modal resizes appropriately
✓ Table is readable on small screens
```

---

## Testing Checklist

### Before Deployment
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Audit logs show correct entries
- [ ] Database integrity verified
- [ ] No SQL injection vulnerabilities
- [ ] CORS headers correct
- [ ] JWT validation works
- [ ] Error handling robust

### Deployment Steps
1. [ ] Build backend: `npm run build`
2. [ ] Build frontend: `npm run build`
3. [ ] Run tests: `npm test`
4. [ ] Deploy to EC2
5. [ ] Verify API endpoints accessible
6. [ ] Smoke test in production
7. [ ] Monitor error logs

### Post-Deployment
- [ ] Monitor user activity
- [ ] Check audit logs for issues
- [ ] Gather user feedback
- [ ] Watch for performance issues
- [ ] Plan for future enhancements

---

## Testing Tools

### API Testing with cURL
```bash
# Get records
curl -X GET http://localhost:3000/api/revenue \
  -H "Authorization: Bearer <token>"

# Edit record
curl -X PUT http://localhost:3000/api/revenue/id \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"client": "New Name"}'

# Delete record
curl -X DELETE http://localhost:3000/api/revenue/id \
  -H "Authorization: Bearer <token>"
```

### Browser DevTools
- Network tab: Monitor API calls
- Console: Check for errors and audit logs
- Storage: Verify JWT token storage
- Application: Inspect state and props

### Database Query
```sql
-- View all revenue records with creator info
SELECT r.id, r.client, r.amount, u.email, r.created_at
FROM revenue r
JOIN users u ON r.created_by_user_id = u.id
ORDER BY r.created_at DESC;

-- Check audit trail (console logs)
-- View in backend logs or Docker logs
```

---

## Success Criteria

✅ **Feature is considered successful when:**

1. Users can edit their own revenue records
2. Users can delete their own revenue records
3. Users cannot edit/delete other users' records
4. Backend enforces ownership validation (403 errors)
5. Frontend UI shows/hides buttons based on permissions
6. All existing features continue to work
7. Audit trail is properly maintained
8. Error messages are clear and helpful
9. No security vulnerabilities identified
10. Performance is acceptable (< 1 second per operation)

---

## Known Limitations & Future Work

- Currently no soft deletes (deleted records cannot be recovered)
- No bulk edit/delete functionality
- No edit history/version tracking
- No manager approval workflows
- Super admin cannot edit as another user (only their own records)

---

## Contact & Support

For issues or questions:
1. Check console logs for errors
2. Review audit trail in backend logs
3. Verify JWT token validity
4. Check database connectivity
5. Review error response messages
6. Consult REVENUE_EDIT_DELETE_IMPLEMENTATION.md for details
