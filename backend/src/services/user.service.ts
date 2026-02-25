import { executeQuery } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface MicrosoftUserProfile {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  department?: string;
}

export interface AuthUser {
  Id: string;
  Email: string;
  PasswordHash: string;
  Status: string;
  MfaEnabled: boolean;
  LastLogin: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface AdminUser {
  Id: string;
  AuthUserId: string | null;
  Name: string;
  Email: string;
  RoleName: string;
  Status: string;
  Department: string | null;
  JoinDate: Date | null;
  LastLogin: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface UserProfile {
  Id: number;
  UserId: string | null;
  FirstName: string;
  LastName: string;
  RoleName: string;
  Location: string;
  AvatarUrl: string;
  Email: string;
  Phone: string;
  Bio: string | null;
  Department?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface UserRoleAssignment {
  Id: number;
  UserId: string;
  ModuleName: string;
  Permissions: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface SyncUserResult {
  authUser: AuthUser;
  adminUser: AdminUser;
  userProfile: UserProfile;
  roleAssignments: UserRoleAssignment[];
  isNewUser: boolean;
}

class UserService {
  /**
   * Find or create a user from Microsoft profile
   * This syncs the Microsoft 365 user data to the database
   */
  async syncMicrosoftUser(profile: MicrosoftUserProfile): Promise<SyncUserResult> {
    const email = profile.mail || profile.userPrincipalName;

    // Find existing auth user by email
    let authUsers = await executeQuery<AuthUser>(
      `SELECT * FROM AuthUsers WHERE Email = @email`,
      { email }
    );

    let isNewUser = false;
    let authUser: AuthUser;

    if (authUsers.length === 0) {
      // Create new auth user
      isNewUser = true;
      const authUserId = uuidv4();
      
      await executeQuery(
        `INSERT INTO AuthUsers (Id, Email, PasswordHash, Status, MfaEnabled)
         VALUES (@id, @email, @passwordHash, @status, @mfaEnabled)`,
        {
          id: authUserId,
          email: email,
          passwordHash: 'MICROSOFT_SSO', // Marker for SSO users
          status: 'active',
          mfaEnabled: false
        }
      );

      authUsers = await executeQuery<AuthUser>(
        `SELECT * FROM AuthUsers WHERE Id = @id`,
        { id: authUserId }
      );
    } else {
      // Update last login
      await executeQuery(
        `UPDATE AuthUsers SET LastLogin = GETUTCDATE(), UpdatedAt = GETUTCDATE() WHERE Id = @id`,
        { id: authUsers[0].Id }
      );
    }

    authUser = authUsers[0];

    // Find or create admin user
    let adminUsers = await executeQuery<AdminUser>(
      `SELECT * FROM AdminUsers WHERE Email = @email`,
      { email }
    );

    let adminUser: AdminUser;

    if (adminUsers.length === 0) {
      // Create new admin user
      const adminUserId = uuidv4();
      
      await executeQuery(
        `INSERT INTO AdminUsers (Id, AuthUserId, Name, Email, RoleName, Status, Department, JoinDate, LastLogin)
         VALUES (@id, @authUserId, @name, @email, @roleName, @status, @department, GETUTCDATE(), GETUTCDATE())`,
        {
          id: adminUserId,
          authUserId: authUser.Id,
          name: profile.displayName || `${profile.givenName || ''} ${profile.surname || ''}`.trim() || email,
          email: email,
          roleName: 'pending',
          status: 'active',
          department: profile.department || null
        }
      );

      adminUsers = await executeQuery<AdminUser>(
        `SELECT * FROM AdminUsers WHERE Id = @id`,
        { id: adminUserId }
      );
    } else {
      // Update existing admin user with latest Microsoft data
      await executeQuery(
        `UPDATE AdminUsers 
         SET Name = @name, 
             Department = @department, 
             LastLogin = GETUTCDATE(),
             UpdatedAt = GETUTCDATE()
         WHERE Id = @id`,
        {
          id: adminUsers[0].Id,
          name: profile.displayName || adminUsers[0].Name,
          department: profile.department || adminUsers[0].Department
        }
      );
    }

    adminUser = adminUsers[0];

    // Find or create user profile
    let userProfiles = await executeQuery<UserProfile>(
      `SELECT * FROM UserProfiles WHERE UserId = @userId`,
      { userId: adminUser.Id }
    );

    let userProfile: UserProfile;

    if (userProfiles.length === 0) {
      // Create new user profile
      await executeQuery(
        `INSERT INTO UserProfiles (UserId, FirstName, LastName, RoleName, Location, AvatarUrl, Email, Phone)
         VALUES (@userId, @firstName, @lastName, @roleName, @location, @avatarUrl, @email, @phone)`,
        {
          userId: adminUser.Id,
          firstName: profile.givenName || '',
          lastName: profile.surname || '',
          roleName: profile.jobTitle || 'Staff',
          location: profile.officeLocation || '',
          avatarUrl: '',
          email: email,
          phone: profile.mobilePhone || (profile.businessPhones && profile.businessPhones[0]) || ''
        }
      );

      userProfiles = await executeQuery<UserProfile>(
        `SELECT * FROM UserProfiles WHERE UserId = @userId`,
        { userId: adminUser.Id }
      );
    } else {
      // Update existing profile with latest Microsoft data
      await executeQuery(
        `UPDATE UserProfiles 
         SET FirstName = @firstName,
             LastName = @lastName,
             RoleName = @roleName,
             Location = @location,
             Phone = @phone,
             UpdatedAt = GETUTCDATE()
         WHERE UserId = @userId`,
        {
          userId: adminUser.Id,
          firstName: profile.givenName || userProfiles[0].FirstName,
          lastName: profile.surname || userProfiles[0].LastName,
          roleName: profile.jobTitle || userProfiles[0].RoleName,
          location: profile.officeLocation || userProfiles[0].Location,
          phone: profile.mobilePhone || (profile.businessPhones && profile.businessPhones[0]) || userProfiles[0].Phone
        }
      );
    }

    userProfile = userProfiles[0];

    // Get role assignments for this user
    const roleAssignments = await this.getUserRoleAssignments(adminUser.Id);

    return {
      authUser,
      adminUser,
      userProfile,
      roleAssignments,
      isNewUser
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AdminUser | null> {
    const users = await executeQuery<AdminUser>(
      `SELECT * FROM AdminUsers WHERE Email = @email`,
      { email }
    );

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const profiles = await executeQuery<UserProfile>(
      `SELECT * FROM UserProfiles WHERE UserId = @userId`,
      { userId }
    );

    return profiles.length > 0 ? profiles[0] : null;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await executeQuery(
      `UPDATE AdminUsers SET LastLogin = GETUTCDATE(), UpdatedAt = GETUTCDATE() WHERE Id = @id`,
      { id: userId }
    );
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<any[]> {
    // Get all users
    const users = await executeQuery<AdminUser>(`SELECT * FROM AdminUsers ORDER BY Name`);
    
    // For each user, get their module permissions
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const modulePermissions = await this.getUserRoleAssignments(user.Id);
        return {
          ...user,
          modulePermissions: modulePermissions.map(mp => ({
            moduleName: mp.ModuleName,
            permissions: mp.Permissions
          }))
        };
      })
    );
    
    return usersWithPermissions;
  }

  /**
   * Get user role assignments for a specific user
   */
  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    return executeQuery<UserRoleAssignment>(
      `SELECT * FROM UserRoleAssignments WHERE UserId = @userId ORDER BY ModuleName`,
      { userId }
    );
  }

  /**
   * Set user permissions for a specific module
   */
  async setModulePermissions(userId: string, moduleName: string, permissions: string[]): Promise<void> {
    const permissionsStr = permissions.join(',');
    
    // Check if assignment exists
    const existing = await executeQuery<UserRoleAssignment>(
      `SELECT * FROM UserRoleAssignments WHERE UserId = @userId AND ModuleName = @moduleName`,
      { userId, moduleName }
    );

    if (existing.length > 0) {
      // Update existing
      await executeQuery(
        `UPDATE UserRoleAssignments SET Permissions = @permissions, UpdatedAt = GETUTCDATE() 
         WHERE UserId = @userId AND ModuleName = @moduleName`,
        { userId, moduleName, permissions: permissionsStr }
      );
    } else {
      // Insert new
      await executeQuery(
        `INSERT INTO UserRoleAssignments (UserId, ModuleName, Permissions) 
         VALUES (@userId, @moduleName, @permissions)`,
        { userId, moduleName, permissions: permissionsStr }
      );
    }
  }

  /**
   * Remove all permissions for a module (delete assignment)
   */
  async removeModuleAccess(userId: string, moduleName: string): Promise<void> {
    await executeQuery(
      `DELETE FROM UserRoleAssignments WHERE UserId = @userId AND ModuleName = @moduleName`,
      { userId, moduleName }
    );
  }

  /**
   * Update user's role (admin, manager, user)
   */
  async updateUserRole(userId: string, roleName: string): Promise<void> {
    await executeQuery(
      `UPDATE AdminUsers SET RoleName = @roleName, UpdatedAt = GETUTCDATE() WHERE Id = @id`,
      { id: userId, roleName }
    );

    // Update default permissions based on new role
    const modules = ['labor-budget', 'msp-services', 'sow-documents', 'e-rate', 'quote-management'];
    let permissions: string;

    switch (roleName) {
      case 'admin':
        permissions = 'view,create,edit,delete,admin';
        break;
      case 'manager':
        permissions = 'view,create,edit,admin';
        break;
      case 'readonly':
        permissions = 'view';
        break;
      case 'pending':
        permissions = '';
        break;
      default:
        permissions = 'view,create,edit';
    }

    // Update all module permissions
    for (const module of modules) {
      await executeQuery(
        `UPDATE UserRoleAssignments 
         SET Permissions = @permissions, UpdatedAt = GETUTCDATE() 
         WHERE UserId = @userId AND ModuleName = @moduleName`,
        { userId, moduleName: module, permissions }
      );
    }
  }
}

export const userService = new UserService();
