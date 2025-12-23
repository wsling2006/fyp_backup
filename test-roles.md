# ROLE VERIFICATION

## Backend Roles Enum:
- ACCOUNTANT = 'accountant'
- HR = 'human_resources'  
- MARKETING = 'marketing'
- SALES = 'sales_department'
- SUPER_ADMIN = 'super_admin'

## Frontend Expected Roles:
- 'accountant'
- 'human_resources'
- 'marketing'
- 'sales_department'
- 'super_admin'

## Database column:
- user.role (VARCHAR)

## JWT Strategy Returns:
- role: user.role (direct from database)

