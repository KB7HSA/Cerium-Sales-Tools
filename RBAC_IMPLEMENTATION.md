# Role-Based Access Control (RBAC) Implementation

## Overview

The application now implements a comprehensive Role-Based Access Control (RBAC) system integrated with Microsoft 365 authentication. Users are assigned roles that determine their access to different modules and features.

## User Roles

### Global Roles
- **Super Admin** (`admin`) - Full access to all modules and features
- **Manager** (`manager`) - Admin access to all modules (can manage settings)
- **User** (`user`) - Standard access with create/edit permissions
- **Read-Only** (`readonly`) - View-only access to all modules

## Application Modules

The system manages permissions for the following modules:
1. **Labor Budget** (`labor-budget`)
2. **MSP Services** (`msp-services`)
3. **SOW Documents** (`sow-documents`)
4. **E-Rate** (`e-rate`)
5. **Quote Management** (`quote-management`)

## Permissions

Each module can have the following permission levels:
- **view** - Can view data
- **create** - Can create new records
- **edit** - Can modify existing records
- **delete** - Can delete records
- **admin** - Full administrative access (includes all above + settings)

## Frontend Usage

### 1. Using Guards in Routes

Protect routes using permission guards:

```typescript
import { permissionGuard, adminGuard } from './shared/guards/permission.guard';
import { AppModule, Permission } from './shared/services/rbac.service';

const routes: Routes = [
  {
    path: 'labor-budget',
    component: LaborBudgetComponent,
    canActivate: [permissionGuard],
    data: { 
      module: AppModule.LABOR_BUDGET, 
      permission: Permission.VIEW 
    }
  },
  {
    path: 'labor-budget/admin',
    component: LaborBudgetAdminComponent,
    canActivate: [adminGuard],
    data: { module: AppModule.LABOR_BUDGET }
  }
];
```

### 2. Using Permission Directives in Templates

Show/hide UI elements based on permissions:

```html
<!-- Show only to users with admin permission -->
<div *hasPermission="{ module: 'labor-budget', permission: 'admin' }">
  <button>Admin Settings</button>
</div>

<!-- Show only to users who can edit -->
<button *hasPermission="{ module: 'labor-budget', permission: 'edit' }">
  Edit Record
</button>

<!-- Show only to module admins -->
<div *isModuleAdmin="'msp-services'">
  <a routerLink="/msp-services/admin">Module Settings</a>
</div>

<!-- Show only to super admins -->
<div *hasPermission="'super-admin'">
  <a routerLink="/admin/users">Manage Users</a>
</div>
```

### 3. Using RBAC Service Programmatically

```typescript
import { RBACService, AppModule, Permission } from './shared/services/rbac.service';

export class MyComponent {
  private rbacService = inject(RBACService);

  canEditLaborBudget(): boolean {
    return this.rbacService.hasPermission(AppModule.LABOR_BUDGET, Permission.EDIT);
  }

  isLaborAdmin(): boolean {
    return this.rbacService.isModuleAdmin(AppModule.LABOR_BUDGET);
  }

  isSuperAdmin(): boolean {
    return this.rbacService.isSuperAdmin();
  }

  // Get reactive updates
  canEdit$ = this.rbacService.hasPermission$(AppModule.LABOR_BUDGET, Permission.EDIT);
}
```

## Backend API Endpoints

### Role Management

#### Get User Role Assignments
```
GET /api/auth/users/:userId/roles
```

#### Update Module Permissions
```
PUT /api/auth/users/:userId/modules/:moduleName/permissions
Body: { permissions: ["view", "create", "edit", "admin"] }
```

#### Update User Role
```
PUT /api/auth/users/:userId/role
Body: { role: "admin" | "manager" | "user" | "readonly" }
```

#### Remove Module Access
```
DELETE /api/auth/users/:userId/modules/:moduleName
```

## Database Schema

### UserRoleAssignments Table
```sql
CREATE TABLE UserRoleAssignments (
    Id BIGINT IDENTITY(1,1) NOT NULL,
    UserId NVARCHAR(64) NOT NULL,
    ModuleName NVARCHAR(50) NOT NULL,
    Permissions NVARCHAR(255) NOT NULL, -- Comma-separated
    CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE()
);
```

## Default Permissions

When a new user is created via M365 login:

| Role | Default Permissions |
|------|-------------------|
| admin | view, create, edit, delete, admin (all modules) |
| manager | view, create, edit, admin (all modules) |
| user | view, create, edit (all modules) |
| readonly | view (all modules) |

## Implementation Notes

1. **M365 Integration**: User roles are assigned based on their Microsoft 365 account when they first log in
2. **Database Triggers**: Automatic role assignments are created when new users are added
3. **Reactive Updates**: Permission checks update automatically when user authentication state changes
4. **Granular Control**: Permissions can be customized per module for each user
5. **Admin Override**: Super admins always have full access regardless of module-specific permissions

## Examples

### Example 1: Labor Budget Admin
A user with `manager` role can access Labor Budget admin features:
- Create/edit labor items
- Access budget settings
- Manage labor categories
- View all budgets

### Example 2: E-Rate User
A regular `user` can:
- View E-Rate forms
- Create new E-Rate submissions
- Edit their own submissions
- Cannot access E-Rate admin settings

### Example 3: Read-Only Viewer
A `readonly` user can:
- View all modules
- Export data
- Cannot create, edit, or delete
- Cannot access any admin features

## Testing RBAC

1. Sign in with Microsoft 365
2. Your role is automatically assigned based on your Azure AD account
3. Navigate to different modules to see role-based access in action
4. Super admins can manage user roles via the User Management interface (coming soon)

## Security Considerations

- Always check permissions on both frontend AND backend
- Backend endpoints validate permissions before executing operations
- Role changes require super admin privileges
- Audit logs track permission changes
