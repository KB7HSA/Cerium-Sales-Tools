import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  department?: string;
  joinDate: string;
  lastLogin?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly STORAGE_KEY = 'admin_users';
  private usersSubject = new BehaviorSubject<User[]>(this.loadUsers());

  public users$ = this.usersSubject.asObservable();

  constructor() {
    // Initialize with default admin user if empty
    if (this.usersSubject.value.length === 0) {
      this.createDefaultUser();
    }
  }

  private loadUsers(): User[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    this.usersSubject.next([...users]);
  }

  private createDefaultUser(): void {
    const defaultUser: User = {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin',
      status: 'active',
      department: 'Management',
      joinDate: new Date().toLocaleDateString(),
      lastLogin: new Date().toLocaleString(),
    };
    const users = [defaultUser];
    this.saveUsers(users);
  }

  generateUserId(): string {
    return 'USER-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getUsers(): User[] {
    return this.usersSubject.value;
  }

  getUserById(id: string): User | undefined {
    return this.usersSubject.value.find(u => u.id === id);
  }

  createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      ...user,
      id: this.generateUserId(),
    };

    const users = this.usersSubject.value;
    users.push(newUser);
    this.saveUsers(users);

    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): void {
    const users = this.usersSubject.value;
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      this.saveUsers(users);
    }
  }

  deleteUser(id: string): void {
    const users = this.usersSubject.value.filter(u => u.id !== id);
    this.saveUsers(users);
  }

  updateLastLogin(id: string): void {
    this.updateUser(id, { lastLogin: new Date().toLocaleString() });
  }

  getAdminUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'admin');
  }

  getManagerUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'manager');
  }

  getStandardUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'user');
  }

  getActiveUsers(): User[] {
    return this.usersSubject.value.filter(u => u.status === 'active');
  }

  getInactiveUsers(): User[] {
    return this.usersSubject.value.filter(u => u.status === 'inactive');
  }
}
