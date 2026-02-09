import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-sidebar-history',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './ai-sidebar-history.component.html',
  styles: ``,
})
export class AiSidebarHistoryComponent {

  @Input() isSidebarOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();

  searchQuery: string = '';
  showMore: boolean = false;
  openDropdown: string | null = null;

  todayChats = [
    { id: '1', title: 'Write a follow-up email to a client' },
    { id: '2', title: 'Generate responsive login form layout' },
    { id: '3', title: 'Create a warning state modal' },
    { id: '4', title: 'Suggest color palette for dark theme' },
  ];

  yesterdayChats = [
    { id: '5', title: 'Improve login page accessibility' },
    { id: '6', title: 'Create a warning state modal with animation' },
    { id: '7', title: 'Add password visibility toggle' },
    { id: '8', title: 'Write validation logic for login form...' },
    { id: '9', title: 'Fix mobile responsiveness of login UI...' },
  ];

  lastWeekChats = [
    { id: '10', title: 'Improve login page accessibility...' },
    { id: '11', title: 'Improve login page accessibility...' },
  ];

  ngOnInit(): void {
    document.addEventListener('mousedown', this.handleClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.handleClickOutside.bind(this));
  }

  handleClickOutside(event: MouseEvent): void {
    if (this.openDropdown && !(event.target as HTMLElement).closest('.dropdown-menu, .dropdown-button')) {
      this.openDropdown = null;
    }
  }

  onCloseSidebar(event: Event): void {
    event.stopPropagation();
    this.closeSidebar.emit();
  }

  handleDropdownToggle(itemId: string): void {
    this.openDropdown = this.openDropdown === itemId ? null : itemId;
  }

  handleRename(itemId: string): void {
    console.log('Rename item:', itemId);
    this.openDropdown = null;
  }

  handleDelete(itemId: string): void {
    console.log('Delete item:', itemId);
    this.openDropdown = null;
  }

  toggleShowMore(): void {
    this.showMore = !this.showMore;
  }
}
