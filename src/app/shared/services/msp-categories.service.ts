import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MSPCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class MSPCategoriesService {
  private readonly apiUrl = `${environment.apiUrl}/msp-categories`;

  constructor(private http: HttpClient) {}

  getCategories(activeOnly = false): Observable<MSPCategory[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}${query}`)
      .pipe(map(response => (response.data || []).map(category => this.normalizeCategory(category))));
  }

  createCategory(category: Partial<MSPCategory>): Observable<MSPCategory> {
    return this.http
      .post<ApiResponse<any>>(this.apiUrl, {
        Name: category.name,
        Slug: category.slug,
        Description: category.description,
        IsActive: category.isActive,
        DisplayOrder: category.displayOrder,
      })
      .pipe(map(response => this.normalizeCategory(response.data)));
  }

  updateCategory(id: string, category: Partial<MSPCategory>): Observable<MSPCategory> {
    return this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
        Name: category.name,
        Slug: category.slug,
        Description: category.description,
        IsActive: category.isActive,
        DisplayOrder: category.displayOrder,
      })
      .pipe(map(response => this.normalizeCategory(response.data)));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(map(() => void 0));
  }

  private normalizeCategory(category: any): MSPCategory {
    return {
      id: category.id || category.Id,
      name: category.name || category.Name,
      slug: category.slug || category.Slug,
      description: category.description || category.Description || '',
      isActive: (category.isActive ?? category.IsActive) !== false,
      displayOrder: category.displayOrder ?? category.DisplayOrder ?? 0,
      createdAt: category.createdAt || category.CreatedAt,
      updatedAt: category.updatedAt || category.UpdatedAt,
    };
  }
}
