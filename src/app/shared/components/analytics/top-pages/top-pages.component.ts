
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component';

@Component({
  selector: 'app-top-pages',
  imports: [RouterModule, DropdownComponent, DropdownItemComponent],
  templateUrl: './top-pages.component.html',
  styles: ``
})
export class TopPagesComponent {

  isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  pages = [
    { name: 'cerium.com', pageview: '4.7K' },
    { name: 'preview.cerium.com', pageview: '3.4K' },
    { name: 'docs.cerium.com', pageview: '2.9K' },
    { name: 'cerium.com/components', pageview: '1.5K' },
  ];
}
