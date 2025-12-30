# Claims Download Feature

## Overview
Added functionality for accountants and super admins to view and download receipt files uploaded by users for claims.

## Date Implemented
December 30, 2025

## Changes Made

### Backend Changes

#### 1. Purchase Request Controller (`backend/src/purchase-requests/purchase-request.controller.ts`)
- **Added imports**: `Res`, `NotFoundException`, and `Response` type from Express
- **New endpoint**: `GET /purchase-requests/claims/:id/download`
  - Accessible by: Sales, Marketing, Accountant, Super Admin
  - Returns the receipt file as a downloadable attachment
  - Includes ownership checks (accountants/super admins can download any receipt, sales/marketing can only download their own)
  - Logs download activity to audit trail
  - Proper error handling if file not found on server

### Frontend Changes

#### 2. Purchase Requests Page (`frontend/app/purchase-requests/page.tsx`)
- **Added state**: `showViewClaimsModal` to manage the claims modal visibility
- **Updated UI**: Changed "X Claim(s)" badge to "View Claims (X)" button
- **New component**: `ViewClaimsModal`
  - Displays all claims for a purchase request
  - Shows claim details: vendor, amount, purchase date, status, description, etc.
  - Download button for each claim receipt with visual download icon
  - Proper loading states and error handling
  - Color-coded status badges for claims (Pending, Verified, Processed, Rejected)
  - Displays verification notes if available

## Features

### For Accountants and Super Admins
1. **View Claims**: Click "View Claims" button on any purchase request that has claims
2. **Download Receipts**: Download receipt files directly from the claims modal
3. **Audit Trail**: All downloads are logged for audit purposes

### For Sales/Marketing Users
1. Can also view their own claims
2. Can download their own receipt files

## Security Features
- Role-based access control maintained
- Ownership checks for non-admin users
- File path validation
- Audit logging for all downloads
- Proper error handling and user feedback

## API Endpoints

### New Endpoint
```
GET /purchase-requests/claims/:id/download
```
- **Authorization**: JWT token required
- **Roles**: Sales, Marketing, Accountant, Super Admin
- **Response**: Binary file download with proper Content-Disposition headers
- **Logs**: DOWNLOAD_RECEIPT action to audit trail

### Existing Endpoints Used
```
GET /purchase-requests/claims/:id
```
- Used by frontend to fetch detailed claim information

## UI Flow

1. User navigates to Purchase Requests page
2. For requests with claims, a "View Claims (X)" button appears
3. Click button to open modal showing all claims
4. Each claim shows:
   - Claim ID (first 8 characters)
   - Status badge (color-coded)
   - Vendor name
   - Amount claimed
   - Purchase date
   - Upload timestamp
   - Uploader email
   - Description
   - Verification notes (if any)
   - Verifier email (if verified)
   - Receipt filename
5. Click "Download Receipt" button to download the file
6. File downloads with original filename

## Error Handling

- File not found on server: Displays user-friendly error message
- Network errors: Catches and displays API errors
- Loading states: Shows spinner while fetching claim details
- Empty state: Shows message if no claims exist

## Testing Checklist

- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] PM2 services running
- [ ] Accountant can view all claims
- [ ] Accountant can download any receipt
- [ ] Sales user can view only their claims
- [ ] Sales user can download only their receipts
- [ ] Download logs appear in audit trail
- [ ] File not found error handled properly
- [ ] Download triggers with correct filename
- [ ] Modal displays all claim information correctly

## Technical Details

### File Download Implementation
- Uses `responseType: 'blob'` in Axios request
- Creates temporary Blob URL
- Triggers download via programmatically created anchor tag
- Cleans up Blob URL after download

### Status Badge Colors
- **PENDING**: Yellow
- **VERIFIED**: Blue
- **PROCESSED**: Green
- **REJECTED**: Red

## Future Enhancements (Optional)
- Preview receipt images directly in the modal (for image files)
- Bulk download multiple receipts
- Filter/search claims by status or date
- Export claims data to CSV/Excel
- Add comments/notes to claims
