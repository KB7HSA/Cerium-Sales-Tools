import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MSPCategoriesService, MSPCategory } from '../../shared/services/msp-categories.service';

@Component({
  selector: 'app-msp-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './msp-categories.component.html',
  styleUrl: './msp-categories.component.css'
})
export class MSPCategoriesComponent implements OnInit {
  categories: MSPCategory[] = [];
  isLoading = false;
  isSaving = false;
  editingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  formData: Partial<MSPCategory> = {
    name: '',
    slug: '',
    description: '',
    isActive: true,
    displayOrder: 0,
  };

  constructor(private categoriesService: MSPCategoriesService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.categoriesService.getCategories(false).subscribe({
      next: categories => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Failed to load categories.';
        this.isLoading = false;
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formData = {
      name: '',
      slug: '',
      description: '',
      isActive: true,
      displayOrder: this.categories.length + 1,
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  startEdit(category: MSPCategory): void {
    this.editingId = category.id;
    this.formData = {
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive,
      displayOrder: category.displayOrder,
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.startCreate();
  }

  autoGenerateSlug(): void {
    const name = (this.formData.name || '').trim().toLowerCase();
    this.formData.slug = name
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  saveCategory(): void {
    const name = (this.formData.name || '').trim();
    const slug = (this.formData.slug || '').trim();

    if (!name || !slug) {
      this.errorMessage = 'Name and slug are required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = this.editingId
      ? this.categoriesService.updateCategory(this.editingId, this.formData)
      : this.categoriesService.createCategory(this.formData);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = this.editingId ? 'Category updated.' : 'Category created.';
        this.startCreate();
        this.loadCategories();
      },
      error: error => {
        this.isSaving = false;
        this.errorMessage = error?.error?.details || error?.error?.message || 'Failed to save category.';
      }
    });
  }

  deleteCategory(category: MSPCategory): void {
    if (!confirm(`Delete category "${category.name}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.categoriesService.deleteCategory(category.id).subscribe({
      next: () => {
        this.successMessage = 'Category deleted.';
        this.loadCategories();
      },
      error: error => {
        this.errorMessage = error?.error?.details || error?.error?.message || 'Failed to delete category.';
      }
    });
  }
}
