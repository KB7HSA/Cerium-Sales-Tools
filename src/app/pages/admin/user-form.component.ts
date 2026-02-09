import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UserManagementService, User } from '../../shared/services/user-management.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  isEditMode = false;
  userId: string | null = null;

  // Form fields
  name: string = '';
  email: string = '';
  role: 'admin' | 'manager' | 'user' = 'user';
  status: 'active' | 'inactive' = 'active';
  department: string = '';

  // For validation
  submitted = false;
  errorMessage: string = '';

  constructor(
    private userService: UserManagementService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.userId = params['id'];
        this.loadUser(params['id']);
      }
    });
  }

  loadUser(userId: string): void {
    const user = this.userService.getUserById(userId);
    if (user) {
      this.name = user.name;
      this.email = user.email;
      this.role = user.role;
      this.status = user.status;
      this.department = user.department || '';
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  submitForm(): void {
    this.submitted = true;
    this.errorMessage = '';

    // Validation
    if (!this.name.trim()) {
      this.errorMessage = 'Name is required';
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'Email is required';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    try {
      if (this.isEditMode && this.userId) {
        // Update existing user
        this.userService.updateUser(this.userId, {
          name: this.name,
          email: this.email,
          role: this.role,
          status: this.status,
          department: this.department,
        });
        alert('User updated successfully!');
      } else {
        // Create new user
        const now = new Date();
        this.userService.createUser({
          name: this.name,
          email: this.email,
          role: this.role,
          status: this.status,
          department: this.department,
          joinDate: now.toLocaleDateString(),
        });
        alert('User created successfully!');
      }

      // Redirect back to user management
      this.router.navigate(['/admin/users']);
    } catch (error) {
      this.errorMessage = 'An error occurred while saving the user';
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
}
