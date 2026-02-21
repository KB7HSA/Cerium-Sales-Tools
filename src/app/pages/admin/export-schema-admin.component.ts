import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ExportSchemaService,
  ExportSchema,
  ExportSchemaColumn,
  AvailableField,
  QuoteType
} from '../../shared/services/export-schema.service';

@Component({
  selector: 'app-export-schema-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './export-schema-admin.component.html',
  styleUrl: './export-schema-admin.component.css'
})
export class ExportSchemaAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  schemas: ExportSchema[] = [];
  availableFields: AvailableField[] = [];
  quoteTypes: QuoteType[] = [];
  
  // Filter
  selectedQuoteTypeFilter = '';
  
  // Edit mode
  editingSchema: ExportSchema | null = null;
  isNewSchema = false;
  
  // Form fields
  schemaName = '';
  schemaQuoteType = '';
  schemaDescription = '';
  schemaIsDefault = false;
  schemaColumns: ExportSchemaColumn[] = [];
  
  // UI state
  errorMessage = '';
  successMessage = '';
  showColumnSelector = false;
  draggedColumnIndex: number | null = null;

  constructor(public exportSchemaService: ExportSchemaService) {}

  ngOnInit(): void {
    this.exportSchemaService.schemas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(schemas => {
        this.schemas = schemas;
      });
    
    this.exportSchemaService.availableFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => {
        this.availableFields = fields;
      });
    
    this.exportSchemaService.quoteTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(types => {
        this.quoteTypes = types;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get filtered schemas based on quote type filter
   */
  get filteredSchemas(): ExportSchema[] {
    if (!this.selectedQuoteTypeFilter) {
      return this.schemas;
    }
    return this.schemas.filter(s => s.QuoteType === this.selectedQuoteTypeFilter);
  }

  /**
   * Get quote type label
   */
  getQuoteTypeLabel(value: string): string {
    const type = this.quoteTypes.find(t => t.value === value);
    return type?.label || value;
  }

  /**
   * Start creating new schema
   */
  createNewSchema(): void {
    this.isNewSchema = true;
    this.editingSchema = null;
    this.schemaName = '';
    this.schemaQuoteType = 'msp';
    this.schemaDescription = '';
    this.schemaIsDefault = false;
    this.schemaColumns = [];
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Edit existing schema
   */
  editSchema(schema: ExportSchema): void {
    this.isNewSchema = false;
    this.editingSchema = schema;
    this.schemaName = schema.Name;
    this.schemaQuoteType = schema.QuoteType;
    this.schemaDescription = schema.Description || '';
    this.schemaIsDefault = schema.IsDefault;
    this.schemaColumns = (schema.columns || []).map(c => ({ ...c }));
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Clone an existing schema
   */
  cloneSchema(schema: ExportSchema): void {
    this.isNewSchema = true;
    this.editingSchema = null;
    this.schemaName = `${schema.Name} (Copy)`;
    this.schemaQuoteType = schema.QuoteType;
    this.schemaDescription = schema.Description || '';
    this.schemaIsDefault = false;
    this.schemaColumns = (schema.columns || []).map(c => ({
      ...c,
      Id: undefined,
      SchemaId: undefined
    }));
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.editingSchema = null;
    this.isNewSchema = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Save schema
   */
  saveSchema(): void {
    if (!this.schemaName.trim()) {
      this.errorMessage = 'Schema name is required';
      return;
    }
    
    if (!this.schemaQuoteType) {
      this.errorMessage = 'Quote type is required';
      return;
    }
    
    if (this.schemaColumns.length === 0) {
      this.errorMessage = 'At least one column must be selected';
      return;
    }

    const schemaData: Partial<ExportSchema> = {
      Name: this.schemaName.trim(),
      QuoteType: this.schemaQuoteType,
      Description: this.schemaDescription.trim() || undefined,
      IsDefault: this.schemaIsDefault,
      IsActive: true,
      columns: this.schemaColumns.map((c, idx) => ({
        SourceField: c.SourceField,
        ExportHeader: c.ExportHeader,
        DisplayOrder: idx,
        IsIncluded: c.IsIncluded !== false,
        FormatType: c.FormatType
      }))
    };

    if (this.isNewSchema) {
      this.exportSchemaService.createSchema(schemaData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Export schema created successfully';
            this.cancelEdit();
          } else {
            this.errorMessage = 'Failed to create export schema';
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to create export schema';
        }
      });
    } else if (this.editingSchema?.Id) {
      this.exportSchemaService.updateSchema(this.editingSchema.Id, schemaData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Export schema updated successfully';
            this.cancelEdit();
          } else {
            this.errorMessage = 'Failed to update export schema';
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to update export schema';
        }
      });
    }
  }

  /**
   * Delete schema
   */
  deleteSchema(schema: ExportSchema): void {
    if (!schema.Id) return;
    
    if (!confirm(`Are you sure you want to delete the schema "${schema.Name}"?`)) {
      return;
    }

    this.exportSchemaService.deleteSchema(schema.Id).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Export schema deleted successfully';
          if (this.editingSchema?.Id === schema.Id) {
            this.cancelEdit();
          }
        } else {
          this.errorMessage = 'Failed to delete export schema';
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to delete export schema';
      }
    });
  }

  /**
   * Add column to schema
   */
  addColumn(field: AvailableField): void {
    const exists = this.schemaColumns.some(c => c.SourceField === field.field);
    if (exists) {
      return;
    }

    this.schemaColumns.push({
      SourceField: field.field,
      ExportHeader: field.label,
      DisplayOrder: this.schemaColumns.length,
      IsIncluded: true,
      FormatType: field.formatType
    });
  }

  /**
   * Remove column from schema
   */
  removeColumn(index: number): void {
    this.schemaColumns.splice(index, 1);
    this.updateColumnOrder();
  }

  /**
   * Check if field is already in schema
   */
  isFieldInSchema(field: AvailableField): boolean {
    return this.schemaColumns.some(c => c.SourceField === field.field);
  }

  /**
   * Move column up
   */
  moveColumnUp(index: number): void {
    if (index <= 0) return;
    const temp = this.schemaColumns[index];
    this.schemaColumns[index] = this.schemaColumns[index - 1];
    this.schemaColumns[index - 1] = temp;
    this.updateColumnOrder();
  }

  /**
   * Move column down
   */
  moveColumnDown(index: number): void {
    if (index >= this.schemaColumns.length - 1) return;
    const temp = this.schemaColumns[index];
    this.schemaColumns[index] = this.schemaColumns[index + 1];
    this.schemaColumns[index + 1] = temp;
    this.updateColumnOrder();
  }

  /**
   * Update column display order
   */
  updateColumnOrder(): void {
    this.schemaColumns.forEach((col, idx) => {
      col.DisplayOrder = idx;
    });
  }

  /**
   * Drag start
   */
  onDragStart(index: number): void {
    this.draggedColumnIndex = index;
  }

  /**
   * Drag over
   */
  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
  }

  /**
   * Drop
   */
  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === targetIndex) {
      this.draggedColumnIndex = null;
      return;
    }

    const item = this.schemaColumns.splice(this.draggedColumnIndex, 1)[0];
    this.schemaColumns.splice(targetIndex, 0, item);
    this.updateColumnOrder();
    this.draggedColumnIndex = null;
  }

  /**
   * Toggle column selector panel
   */
  toggleColumnSelector(): void {
    this.showColumnSelector = !this.showColumnSelector;
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
