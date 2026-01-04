# FYP System

A full-stack enterprise management system built with Next.js, NestJS, and PostgreSQL.

## Project Structure

```
fyp_system/
├── backend/          # NestJS backend API
├── frontend/         # Next.js frontend application
├── ecosystem.config.js   # PM2 process management configuration
├── nginx.conf       # Nginx configuration for production
└── README.md        # This file
```

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT with MFA support
- **File Upload**: Multer
- **Security**: ClamAV virus scanning

### Frontend
- **Framework**: Next.js 14 (React/TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **UI Components**: Custom components with shadcn/ui
- **API Communication**: Axios

## Features

### Core Modules
1. **Authentication & Authorization**
   - Multi-factor authentication (MFA)
   - Role-based access control (RBAC)
   - JWT token management
   - Account lockout protection

2. **HR Management**
   - Employee CRUD operations
   - Document management
   - Attendance tracking
   - Leave management
   - Activity logging

3. **Purchase Requests & Claims**
   - Create and manage purchase requests
   - Submit expense claims with receipt uploads
   - Approval workflow system
   - File security with virus scanning
   - Status tracking (Pending/Approved/Rejected/Paid/Partially Paid)

4. **Accounting**
   - Revenue management (CRUD operations)
   - Financial statements
   - Payroll reports
   - Supplier management
   - Cash flow tracking

5. **Announcements**
   - Create system-wide announcements
   - Priority levels (Normal/Urgent)
   - Comment system
   - Acknowledgment tracking
   - File attachments

6. **Audit Logging**
   - Comprehensive activity tracking
   - User action history
   - IP address logging
   - Silent mode for internal operations

### User Roles
- **Super Admin**: Full system access
- **HR**: Employee and HR module management
- **Accountant**: Financial data and approval management
- **Sales**: Limited access to relevant features

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- PM2 (for production deployment)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd fyp_system
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migration:run
npm run start:dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

### Environment Variables

#### Backend (.env)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=fyp_system
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
PORT=3000
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The backend will run on `http://localhost:3000` and frontend on `http://localhost:3001`.

### Running Tests

**Backend:**
```bash
cd backend
npm run test
npm run test:e2e
```

## Production Deployment

### Using PM2

1. **Build both applications**
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

2. **Start with PM2**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Configure Nginx** (optional)
Use the provided `nginx.conf` as a reference for reverse proxy setup.

### Database Migrations

Run migrations in production:
```bash
cd backend
npm run migration:run
```

## Project Cleanup (January 2026)

This project has been cleaned of all development/debugging dump files including:
- 500+ temporary .md documentation files
- Debugging .sh scripts
- Testing .txt files
- SQL migration dumps
- Backup files (.bak, .backup, .before_edit)

Only essential project files and source code remain.

## API Documentation

API testing file available at `backend/test.http` for use with REST Client extension in VS Code.

## Security Features

- JWT-based authentication
- MFA (Multi-Factor Authentication)
- File virus scanning with ClamAV
- SQL injection prevention via TypeORM
- Rate limiting on sensitive endpoints
- CORS configuration
- Role-based access control
- Audit logging for all critical operations

## Contributing

This is a Final Year Project (FYP). For questions or issues, contact the project maintainer.

## License

This project is for educational purposes as part of a Final Year Project.
