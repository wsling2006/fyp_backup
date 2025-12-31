# User Roles Configuration

## Active Roles (5 Roles)

The system uses the following 5 user roles:

1. **Super Admin** (`super_admin`)
   - Full system access
   - Can manage all users and resources
   - Access to all modules

2. **Accountant** (`accountant`)
   - Access to accounting modules
   - Can manage financial data
   - Can review and approve purchase requests and claims

3. **HR** (`human_resources`)
   - Access to employee management
   - Can manage attendance, documents, announcements
   - Can manage employee records

4. **Marketing** (`marketing`)
   - Can create purchase requests
   - Can submit and manage claims
   - Marketing-specific access

5. **Sales Department** (`sales_department`)
   - Can create purchase requests
   - Can submit and manage claims
   - Sales-specific access

## Role Enum Definition

Located in: `src/users/roles.enum.ts`

```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ACCOUNTANT = 'accountant',
  HR = 'human_resources',
  MARKETING = 'marketing',
  SALES = 'sales_department',
}
```

## Database Configuration

The PostgreSQL enum `users_role_enum` contains these 5 values:
- super_admin
- accountant
- human_resources
- marketing
- sales_department

**Note**: The database may contain legacy enum values (admin, finance_manager, employee) which are not used by the application and can be safely ignored.

## Default Admin Account

- **Email**: admin@example.com
- **Role**: super_admin
- **Password**: Configured via `ADMIN_PASSWORD` in `.env`

This account is automatically created on backend startup.

## Creating New Users

Users can be created with any of the 5 roles through:
1. `/auth/register` endpoint (requires existing admin)
2. `/users/create` endpoint (requires authentication and appropriate permissions)

Each role has specific access controls defined in the controllers using the `@Roles()` decorator.
