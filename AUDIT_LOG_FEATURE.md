# Audit Log & Revenue Data Protection Feature

## Overview
This feature adds comprehensive audit logging for sensitive revenue data access, requiring users to explicitly click a "View Revenue Data" button before accessing financial information. All view actions are logged for security and compliance purposes.

## Features Implemented

### 1. Backend - Audit Log System

#### New Files Created:
- `backend/src/audit/audit-log.entity.ts` - Database entity for audit logs
- `backend/src/audit/audit.service.ts` - Service for logging and querying audit trails
- `backend/src/audit/audit.controller.ts` - API endpoints for accessing audit logs
- `backend/src/audit/audit.module.ts` - Module definition
- `backend/src/migrations/20251222CreateAuditLogs.ts` - Database migration

#### Database Schema:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX ON audit_logs (user_id);
CREATE INDEX ON audit_logs (action);
CREATE INDEX ON audit_logs (resource);
CREATE INDEX ON audit_logs (created_at DESC);
```

#### API Endpoints:

**Get All Audit Logs** (Super Admin Only)
```
GET /audit?user_id={id}&action={action}&resource={resource}&start_date={date}&end_date={date}&limit={num}&offset={num}
```

**Get My Activity**
```
GET /audit/my-activity?limit={num}
```

**Get Resource Audit**
```
GET /audit/resource?resource={type}&resource_id={id}&limit={num}
```

### 2. Frontend - Protected Revenue Data

#### Modified Files:
- `frontend/app/revenue/accountant/page.tsx`
  - Added `dataVisible` state to control data visibility
  - Added `viewLoading` state for loading indicator
  - Removed auto-load on mount
  - Added `handleViewData` function to explicitly load data
  - Added "View Revenue Data" button with audit logging
  - Added sensitive data protection notice
  - Wrapped all data displays in conditional rendering

#### New Files:
- `frontend/app/audit/superadmin/page.tsx` - Audit log dashboard for super admin

### 3. User Experience

#### For Accountant Users:
1. Navigate to Revenue Dashboard (`/revenue/accountant`)
2. See a notice: "Revenue data contains sensitive financial information"
3. Click **"🔍 View Revenue Data"** button
4. Action is logged to audit trail with:
   - User ID and email
   - Action: VIEW_REVENUE
   - Resource: revenue
   - Timestamp
   - IP address
   - Filters applied (if any)
5. Data becomes visible with all features (summary, analytics, CRUD operations)

#### For Super Admin:
1. Navigate to Super Admin Dashboard (`/dashboard/superadmin`)
2. New "Security & Audit" section with two buttons:
   - **📊 View Audit Logs** → Opens audit log dashboard
   - **💰 View Revenue** → Opens revenue dashboard (with audit logging)
3. Audit Log Dashboard (`/audit/superadmin`) shows:
   - All user actions on sensitive resources
   - Filterable by user, action, resource, date range
   - Summary statistics (total, views, creates, deletes)
   - Detailed table with user, action, resource, time, IP address

## Architecture

### Flow Diagram:
```
User → Click "View Revenue Data" Button
  ↓
Frontend: handleViewData()
  ↓
API Call: GET /revenue (with JWT)
  ↓
Backend: RevenueController.findAll()
  ├→ Extract user ID from JWT
  ├→ Log to AuditService (VIEW_REVENUE action)
  │   ├→ Capture IP address
  │   ├→ Capture user agent
  │   └→ Save to audit_logs table
  └→ Return revenue data
  ↓
Frontend: Display data
  ↓
Super Admin: View audit logs at /audit/superadmin
```

### Security Benefits:
1. **Explicit Access**: Users must actively choose to view sensitive data
2. **Audit Trail**: Every access is logged with who, when, what, where
3. **Accountability**: Users know their access is being monitored
4. **Compliance**: Meets regulatory requirements for financial data access tracking
5. **Forensics**: Ability to investigate suspicious access patterns
6. **Deterrence**: Warning message deters unnecessary access

## Testing

### Test Scenario 1: Accountant Views Revenue
1. Login as accountant@test.com
2. Navigate to `/revenue/accountant`
3. Verify "View Revenue Data" button is visible
4. Verify data is NOT visible initially
5. Verify sensitive data protection notice is shown
6. Click "View Revenue Data" button
7. Verify data becomes visible
8. Login as super_admin
9. Navigate to `/audit/superadmin`
10. Verify VIEW_REVENUE action is logged with correct user

### Test Scenario 2: Super Admin Monitors Activity
1. Login as super_admin
2. Navigate to `/audit/superadmin`
3. Filter by action: VIEW_REVENUE
4. Verify all view actions are displayed
5. Verify user email, timestamp, and IP are captured
6. Apply date range filter
7. Verify results are filtered correctly

### Test Scenario 3: Audit Log Protection
1. Login as accountant@test.com
2. Try to access `/audit/superadmin`
3. Verify "Access Denied" message
4. Try to call API: GET /audit
5. Verify 403 Forbidden response

## Database Migration

Run the migration to create the audit_logs table:

```bash
cd backend
npm run typeorm migration:run
```

Or if using synchronize (development):
- The table will be auto-created on next backend start

## Configuration

### Environment Variables
No new environment variables required. Uses existing database connection.

### Permissions
- Audit endpoints: SUPER_ADMIN only
- Revenue view logging: Automatic for ACCOUNTANT and SUPER_ADMIN

## Monitoring

### Key Metrics to Monitor:
1. **View Frequency**: How often users access revenue data
2. **Access Patterns**: Time of day, day of week trends
3. **User Behavior**: Which users access most frequently
4. **Suspicious Activity**: 
   - After-hours access
   - Multiple rapid accesses
   - Access from unusual IP addresses

### Query Examples:

**Most Active Users (Last 30 Days):**
```sql
SELECT 
  u.email, 
  COUNT(*) as view_count
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE 
  al.action = 'VIEW_REVENUE' 
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.email
ORDER BY view_count DESC;
```

**After-Hours Access:**
```sql
SELECT 
  u.email,
  al.created_at,
  al.ip_address
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE 
  al.action = 'VIEW_REVENUE'
  AND (EXTRACT(HOUR FROM al.created_at) < 8 OR EXTRACT(HOUR FROM al.created_at) > 18)
ORDER BY al.created_at DESC;
```

## Future Enhancements

### Potential Additions:
1. **Email Alerts**: Notify admins of suspicious access patterns
2. **Rate Limiting**: Limit view frequency per user
3. **Justification Required**: Ask users why they're accessing data
4. **Export Restrictions**: Log PDF/CSV exports separately
5. **Data Masking**: Show partial data unless fully authorized
6. **Session Recording**: Record which specific records were viewed
7. **Geolocation**: Map IP addresses to geographic locations
8. **Anomaly Detection**: ML-based detection of unusual patterns

## Compliance

This feature helps meet requirements for:
- **GDPR**: Article 30 - Records of processing activities
- **SOX**: Section 404 - Internal controls over financial reporting
- **PCI DSS**: Requirement 10 - Track and monitor all access to network resources and cardholder data
- **ISO 27001**: A.12.4.1 - Event logging
- **HIPAA**: 164.312(b) - Audit controls (if applicable)

## API Documentation

### Audit Service Methods:

```typescript
// Log a single action
await auditService.log({
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
});

// Log from Express request (automatically captures IP and user agent)
await auditService.logFromRequest(
  req,
  userId,
  action,
  resource,
  resourceId?,
  metadata?
);

// Query audit logs
const { logs, total } = await auditService.findAll({
  userId?: string,
  action?: string,
  resource?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number,
  offset?: number
});
```

### Standard Action Names:
- `VIEW_REVENUE` - Viewing revenue data
- `CREATE_REVENUE` - Creating revenue record
- `UPDATE_REVENUE` - Updating revenue record
- `DELETE_REVENUE` - Deleting revenue record
- `VIEW_EMPLOYEE` - Viewing employee data
- `CREATE_USER` - Creating user account
- `SUSPEND_USER` - Suspending user account

## Rollback Plan

If issues arise, rollback steps:

1. **Frontend Rollback**:
   ```bash
   git revert <commit-hash>
   cd frontend && npm run build
   pm2 restart frontend
   ```

2. **Backend Rollback**:
   ```bash
   git revert <commit-hash>
   cd backend && npm run build
   pm2 restart backend
   ```

3. **Database Rollback**:
   ```bash
   npm run typeorm migration:revert
   ```

## Support

For issues or questions:
1. Check backend logs: `pm2 logs backend`
2. Check frontend logs: `pm2 logs frontend`
3. Query audit_logs table directly
4. Review error messages in browser console

---

**Status**: ✅ Implemented and Ready for Testing
**Version**: 1.0.0
**Date**: December 22, 2025
