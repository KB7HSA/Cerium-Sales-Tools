import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserManagementService, User, RoleType } from '../../shared/services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  activeFilter: 'all' | RoleType = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  searchTerm: string = '';

  constructor(public userService: UserManagementService) {}

  ngOnInit(): void {
    this.userService.users$.subscribe(users => {
      this.users = users;
    });
  }

  refreshUsers(): void {
    this.userService.refreshUsers();
  }

  getFilteredUsers(): User[] {
    let filtered = this.users;

    // Filter by role
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(u => u.role === this.activeFilter);
    }

    // Filter by status
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === this.statusFilter);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  setRoleFilter(role: 'all' | RoleType): void {
    this.activeFilter = role;
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'manager':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      case 'user':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
      case 'readonly':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getRoleDisplayName(role: RoleType): string {
    switch (role) {
      case 'admin':
        return 'Super Admin';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'User';
      case 'readonly':
        return 'Read-Only';
      case 'pending':
        return 'Pending';
      default:
        return role;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getModuleCount(user: User): number {
    return user.modulePermissions?.length || 0;
  }

  getTotalUsers(): number {
    return this.users.length;
  }

  getAdminCount(): number {
    return this.userService.getAdminUsers().length;
  }

  getActiveCount(): number {
    return this.userService.getActiveUsers().length;
  }
}
