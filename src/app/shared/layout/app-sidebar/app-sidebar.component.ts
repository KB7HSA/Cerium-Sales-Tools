import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { combineLatest, Subscription, Observable } from 'rxjs';
import { MenuConfigService, MenuConfigItem } from '../../services/menu-config.service';
import { RBACService } from '../../services/rbac.service';

type NavItem = {
  name?: string;
  icon?: string;
  path?: string;
  new?: boolean;
  pro?: boolean;
  menuKey?: string;
  subItems?: NavItem[];
  [key: string]: any;
};

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe
  ],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {

  // Main nav items
  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>`,
      name: "Dashboard",
      menuKey: "dashboard",
      subItems: [
        { name: "Tech Sales", path: "/", menuKey: "dashboard-tech-sales" },
        { name: "Analytics", path: "/analytics", menuKey: "dashboard-analytics" },
        { name: "Marketing", path: "/marketing", menuKey: "dashboard-marketing" },
        { name: "CRM", path: "/crm", menuKey: "dashboard-crm" },
        { name: "Stocks", path: "/stocks", menuKey: "dashboard-stocks" },
        { name: "SaaS", path: "/saas", menuKey: "dashboard-saas" },
        { name: "Logistics", path: "/logistics", menuKey: "dashboard-logistics" },
      ],
    },
    {
      name: "MSP Services",
      menuKey: "msp-services",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z" fill="currentColor"></path><path d="M12 6.5C11.5858 6.5 11.25 6.83579 11.25 7.25V12.75H7.25C6.83579 12.75 6.5 13.0858 6.5 13.5C6.5 13.9142 6.83579 14.25 7.25 14.25H11.25V18.25C11.25 18.6642 11.5858 19 12 19C12.4142 19 12.75 18.6642 12.75 18.25V14.25H16.75C17.1642 14.25 17.5 13.9142 17.5 13.5C17.5 13.0858 17.1642 12.75 16.75 12.75H12.75V7.25C12.75 6.83579 12.4142 6.5 12 6.5Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Dashboard", path: "/msp-dashboard", pro: false, menuKey: "msp-services-dashboard" },
        { name: "Services Overview", path: "/msp-services", pro: false, menuKey: "msp-services-overview" },
      ],
    },
    {
      name: "Labor Budget",
      menuKey: "labor-budget",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.75C4 3.7835 4.7835 3 5.75 3H12.5C13.4665 3 14.25 3.7835 14.25 4.75V7.5H17.25C18.2165 7.5 19 8.2835 19 9.25V19.25C19 20.2165 18.2165 21 17.25 21H8.75C7.7835 21 7 20.2165 7 19.25V16.5H5.75C4.7835 16.5 4 15.7165 4 14.75V4.75ZM12.5 4.5H5.75C5.61193 4.5 5.5 4.61193 5.5 4.75V14.75C5.5 14.8881 5.61193 15 5.75 15H7V9.25C7 8.2835 7.7835 7.5 8.75 7.5H12.75V4.75C12.75 4.61193 12.6381 4.5 12.5 4.5ZM8.75 9C8.61193 9 8.5 9.11193 8.5 9.25V19.25C8.5 19.3881 8.61193 19.5 8.75 19.5H17.25C17.3881 19.5 17.5 19.3881 17.5 19.25V9.25C17.5 9.11193 17.3881 9 17.25 9H8.75Z" fill="currentColor"></path><path d="M10.5 12.25C10.5 11.8358 10.8358 11.5 11.25 11.5H14.75C15.1642 11.5 15.5 11.8358 15.5 12.25C15.5 12.6642 15.1642 13 14.75 13H11.25C10.8358 13 10.5 12.6642 10.5 12.25ZM10.5 15.25C10.5 14.8358 10.8358 14.5 11.25 14.5H14.75C15.1642 14.5 15.5 14.8358 15.5 15.25C15.5 15.6642 15.1642 16 14.75 16H11.25C10.8358 16 10.5 15.6642 10.5 15.25Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Calculator", path: "/labor-budget", pro: false, menuKey: "labor-budget-calculator" },
        { name: "Wizard", path: "/labor-budget-wizard", pro: false, menuKey: "labor-budget-wizard" }
      ],
    },
    {
      name: "Quote Management",
      menuKey: "quote-management",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 2.25C4.25736 2.25 3.25 3.25736 3.25 4.5V19.5C3.25 20.7426 4.25736 21.75 5.5 21.75H18.5C19.7426 21.75 20.75 20.7426 20.75 19.5V4.5C20.75 3.25736 19.7426 2.25 18.5 2.25H5.5ZM4.75 4.5C4.75 4.08579 5.08579 3.75 5.5 3.75H18.5C18.9142 3.75 19.25 4.08579 19.25 4.5V19.5C19.25 19.9142 18.9142 20.25 18.5 20.25H5.5C5.08579 20.25 4.75 19.9142 4.75 19.5V4.5Z" fill="currentColor"></path><path d="M7.25 7C7.25 6.58579 7.58579 6.25 8 6.25H16C16.4142 6.25 16.75 6.58579 16.75 7C16.75 7.41421 16.4142 7.75 16 7.75H8C7.58579 7.75 7.25 7.41421 7.25 7Z" fill="currentColor"></path><path d="M7.25 10.5C7.25 10.0858 7.58579 9.75 8 9.75H16C16.4142 9.75 16.75 10.0858 16.75 10.5C16.75 10.9142 16.4142 11.25 16 11.25H8C7.58579 11.25 7.25 10.9142 7.25 10.5Z" fill="currentColor"></path><path d="M7.25 14C7.25 13.5858 7.58579 13.25 8 13.25H12C12.4142 13.25 12.75 13.5858 12.75 14C12.75 14.4142 12.4142 14.75 12 14.75H8C7.58579 14.75 7.25 14.4142 7.25 14Z" fill="currentColor"></path><path d="M14.5 16.75C14.0858 16.75 13.75 17.0858 13.75 17.5C13.75 17.9142 14.0858 18.25 14.5 18.25H16C16.4142 18.25 16.75 17.9142 16.75 17.5C16.75 17.0858 16.4142 16.75 16 16.75H14.5Z" fill="currentColor"></path></svg>`,
      path: "/quote-management",
    },
    {
      name: "SOW Documents",
      menuKey: "sow-documents",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 4.5C5.25 3.25736 6.25736 2.25 7.5 2.25H13.3787C13.9755 2.25 14.5478 2.48705 14.9697 2.90901L17.341 5.28033C17.763 5.7023 18 6.27459 18 6.87132V19.5C18 20.7426 16.9926 21.75 15.75 21.75H7.5C6.25736 21.75 5.25 20.7426 5.25 19.5V4.5ZM7.5 3.75C7.08579 3.75 6.75 4.08579 6.75 4.5V19.5C6.75 19.9142 7.08579 20.25 7.5 20.25H15.75C16.1642 20.25 16.5 19.9142 16.5 19.5V6.87132C16.5 6.67241 16.421 6.48164 16.2803 6.341L13.909 3.96967C13.7684 3.82902 13.5776 3.75 13.3787 3.75H7.5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M18.2803 10.2197C18.5732 10.5126 18.5732 10.9874 18.2803 11.2803L12.2803 17.2803C12.1397 17.421 11.9489 17.5 11.75 17.5C11.5511 17.5 11.3603 17.421 11.2197 17.2803L9.21967 15.2803C8.92678 14.9874 8.92678 14.5126 9.21967 14.2197C9.51256 13.9268 9.98744 13.9268 10.2803 14.2197L11.75 15.6893L17.2197 10.2197C17.5126 9.92678 17.9874 9.92678 18.2803 10.2197Z" fill="currentColor"></path><path d="M9 8.25C8.58579 8.25 8.25 8.58579 8.25 9C8.25 9.41421 8.58579 9.75 9 9.75H11.5C11.9142 9.75 12.25 9.41421 12.25 9C12.25 8.58579 11.9142 8.25 11.5 8.25H9Z" fill="currentColor"></path><path d="M8.25 12C8.25 11.5858 8.58579 11.25 9 11.25H14C14.4142 11.25 14.75 11.5858 14.75 12C14.75 12.4142 14.4142 12.75 14 12.75H9C8.58579 12.75 8.25 12.4142 8.25 12Z" fill="currentColor"></path></svg>`,
      path: "/sow-generator",
    },
    {
      name: "Cisco Renewals",
      menuKey: "cisco-renewals",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4a2 2 0 012-2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-.5h12a.5.5 0 01.5.5v16a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z" fill="currentColor"/><path d="M8 7h8v1.5H8V7zm0 3h8v1.5H8V10zm0 3h5v1.5H8V13z" fill="currentColor"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity=".5"/><path d="M15.2 16l.5-.5.8.8 1.7-1.7.5.5-2.2 2.2-.5-.5-.8-.8z" fill="white"/></svg>`,
      subItems: [
        { name: "Renewals Summary", path: "/cisco-renewals/summary", pro: false, menuKey: "cisco-renewals-summary" },
        { name: "Hardware Renewals", path: "/cisco-renewals/hardware", pro: false, menuKey: "cisco-renewals-hardware" },
        { name: "Software Renewals", path: "/cisco-renewals/software", pro: false, menuKey: "cisco-renewals-software" },
      ],
    },
    {
      name: "Assessments",
      menuKey: "assessments",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.75 6.5C3.75 5.25736 4.75736 4.25 6 4.25H18C19.2426 4.25 20.25 5.25736 20.25 6.5V17.5C20.25 18.7426 19.2426 19.75 18 19.75H6C4.75736 19.75 3.75 18.7426 3.75 17.5V6.5ZM6 5.75C5.58579 5.75 5.25 6.08579 5.25 6.5V17.5C5.25 17.9142 5.58579 18.25 6 18.25H18C18.4142 18.25 18.75 17.9142 18.75 17.5V6.5C18.75 6.08579 18.4142 5.75 18 5.75H6Z" fill="currentColor"></path><path d="M7.5 8C7.5 7.58579 7.83579 7.25 8.25 7.25H15.75C16.1642 7.25 16.5 7.58579 16.5 8C16.5 8.41421 16.1642 8.75 15.75 8.75H8.25C7.83579 8.75 7.5 8.41421 7.5 8Z" fill="currentColor"></path><path d="M7.5 11C7.5 10.5858 7.83579 10.25 8.25 10.25H15.75C16.1642 10.25 16.5 10.5858 16.5 11C16.5 11.4142 16.1642 11.75 15.75 11.75H8.25C7.83579 11.75 7.5 11.4142 7.5 11Z" fill="currentColor"></path><path d="M7.5 14C7.5 13.5858 7.83579 13.25 8.25 13.25H12.75C13.1642 13.25 13.5 13.5858 13.5 14C13.5 14.4142 13.1642 14.75 12.75 14.75H8.25C7.83579 14.75 7.5 14.4142 7.5 14Z" fill="currentColor"></path></svg>`,
      path: "/assessment-generator",
    },
    {
      name: "E-Rate",
      menuKey: "e-rate",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z" fill="currentColor"></path><path d="M9 8.25C8.58579 8.25 8.25 8.58579 8.25 9V15C8.25 15.4142 8.58579 15.75 9 15.75H15C15.4142 15.75 15.75 15.4142 15.75 15C15.75 14.5858 15.4142 14.25 15 14.25H10.5V12.75H14C14.4142 12.75 14.75 12.4142 14.75 12C14.75 11.5858 14.4142 11.25 14 11.25H10.5V9.75H15C15.4142 9.75 15.75 9.41421 15.75 9C15.75 8.58579 15.4142 8.25 15 8.25H9Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Dashboard", path: "/e-rate/dashboard", pro: false, menuKey: "e-rate-dashboard" },
        { name: "Opportunities", path: "/e-rate", pro: false, menuKey: "e-rate-opportunities" },
        { name: "FRN Dashboard", path: "/e-rate/frn-dashboard", pro: false, menuKey: "e-rate-frn-dashboard" },
        { name: "FRN Status", path: "/e-rate/frn-status", pro: false, menuKey: "e-rate-frn-status" },
      ],
    },
    {
      name: "Admin",
      menuKey: "admin",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C8.27208 2.75 5.25 5.77208 5.25 9.5C5.25 13.2279 8.27208 16.25 12 16.25C15.7279 16.25 18.75 13.2279 18.75 9.5C18.75 5.77208 15.7279 2.75 12 2.75ZM6.75 9.5C6.75 6.6005 9.1005 4.25 12 4.25C14.8995 4.25 17.25 6.6005 17.25 9.5C17.25 12.3995 14.8995 14.75 12 14.75C9.1005 14.75 6.75 12.3995 6.75 9.5Z" fill="currentColor"></path><path d="M4 20.5C4 18.2909 5.79086 16.5 8 16.5H16C18.2091 16.5 20 18.2909 20 20.5C20 20.9142 19.6642 21.25 19.25 21.25C18.8358 21.25 18.5 20.9142 18.5 20.5C18.5 19.1193 17.3807 18 16 18H8C6.61929 18 5.5 19.1193 5.5 20.5C5.5 20.9142 5.16421 21.25 4.75 21.25C4.33579 21.25 4 20.9142 4 20.5Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Users", path: "/admin/users", pro: false, menuKey: "admin-users" },
        { name: "Customers", path: "/admin/customers", pro: false, menuKey: "admin-customers" },
        { name: "Create User", path: "/admin/create-user", pro: false, menuKey: "admin-create-user" },
        { name: "MSP Offerings", path: "/admin/offerings", pro: false, menuKey: "admin-msp-offerings" },
        { name: "Assessment Types", path: "/admin/assessment-types", pro: false, menuKey: "admin-assessment-types" },
        { name: "SOW Types", path: "/admin/sow-types", pro: false, menuKey: "admin-sow-types" },
        { name: "Labor Budget Admin", path: "/admin/labor-budget", pro: false, menuKey: "admin-labor-budget" },
        { name: "Export Schemas", path: "/admin/export-schemas", pro: false, menuKey: "admin-export-schemas" },
        { name: "E-Rate Settings", path: "/admin/erate-settings", pro: false, menuKey: "admin-erate-settings" },
        { name: "Settings", path: "/admin/settings", pro: false, menuKey: "admin-settings" },
        { name: "Menu Admin", path: "/admin/menu-admin", pro: false, menuKey: "admin-menu-admin" },
        { name: "Renewal Statuses", path: "/admin/renewal-statuses", pro: false, menuKey: "admin-renewal-statuses" },
        { name: "Renewals AI Admin", path: "/admin/renewals-ai", pro: false, menuKey: "admin-renewals-ai" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z" fill="currentColor"></path></svg>`,
      name: "User Profile",
      menuKey: "user-profile",
      path: "/profile",
    },
  ];

  // Support nav items (empty - items moved to "To Be Developed")
  supportItems: NavItem[] = [];

  // Filtered nav items based on menu configuration
  filteredNavItems: NavItem[] = [];
  filteredToBeDevelopedItems: NavItem[] = [];

  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$: Observable<boolean>;
  readonly isMobileOpen$: Observable<boolean>;
  readonly isHovered$: Observable<boolean>;

  private subscription: Subscription = new Subscription();

  // Items grouped under "Others" for sidebar (empty - moved to "To Be Developed")
  othersItems: NavItem[] = [];

  // Items grouped under "To Be Developed" for sidebar
  toBeDevelopedItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z" fill="currentColor"></path><path d="M12 6.5C11.5858 6.5 11.25 6.83579 11.25 7.25V12.75H7.25C6.83579 12.75 6.5 13.0858 6.5 13.5C6.5 13.9142 6.83579 14.25 7.25 14.25H11.25V18.25C11.25 18.6642 11.5858 19 12 19C12.4142 19 12.75 18.6642 12.75 18.25V14.25H16.75C17.1642 14.25 17.5 13.9142 17.5 13.5C17.5 13.0858 17.1642 12.75 16.75 12.75H12.75V7.25C12.75 6.83579 12.4142 6.5 12 6.5Z" fill="currentColor"></path></svg>`,
      name: "MSP Support",
      menuKey: "tbd-msp-support",
      path: "/msp-support",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.665 3.75618C11.8762 3.65061 12.1247 3.65061 12.3358 3.75618L18.7807 6.97853L12.3358 10.2009C12.1247 10.3064 11.8762 10.3064 11.665 10.2009L5.22014 6.97853L11.665 3.75618ZM4.29297 8.19199V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0365V11.6512C11.1631 11.6205 11.0777 11.5843 10.9942 11.5425L4.29297 8.19199ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19199L13.0066 11.5425C12.9229 11.5844 12.8372 11.6207 12.75 11.6515V20.037ZM13.0066 2.41453C12.3732 2.09783 11.6277 2.09783 10.9942 2.41453L4.03676 5.89316C3.27449 6.27429 2.79297 7.05339 2.79297 7.90563V16.0946C2.79297 16.9468 3.27448 17.7259 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.7259 21.2079 16.9468 21.2079 16.0946V7.90563C21.2079 7.05339 20.7264 6.27429 19.9641 5.89316L13.0066 2.41453Z" fill="currentColor"></path></svg>`,
      name: "UI Elements",
      menuKey: "tbd-ui-elements",
      subItems: [
        { name: "Alerts", path: "/alerts", pro: false, menuKey: "tbd-ui-alerts" },
        { name: "Avatar", path: "/avatars", pro: false, menuKey: "tbd-ui-avatar" },
        { name: "Badge", path: "/badge", pro: false, menuKey: "tbd-ui-badge" },
        { name: "Breadcrumb", path: "/breadcrumb", pro: false, menuKey: "tbd-ui-breadcrumb" },
        { name: "Buttons", path: "/buttons", pro: false, menuKey: "tbd-ui-buttons" },
        { name: "Buttons Group", path: "/buttons-group", pro: false, menuKey: "tbd-ui-buttons-group" },
        { name: "Cards", path: "/cards", pro: false, menuKey: "tbd-ui-cards" },
        { name: "Carousel", path: "/carousel", pro: false, menuKey: "tbd-ui-carousel" },
        { name: "Dropdowns", path: "/dropdowns", pro: false, menuKey: "tbd-ui-dropdowns" },
        { name: "Images", path: "/images", pro: false, menuKey: "tbd-ui-images" },
        { name: "Links", path: "/links", pro: false, menuKey: "tbd-ui-links" },
        { name: "List", path: "/list", pro: false, menuKey: "tbd-ui-list" },
        { name: "Modals", path: "/modals", pro: false, menuKey: "tbd-ui-modals" },
        { name: "Notification", path: "/notifications", pro: false, menuKey: "tbd-ui-notification" },
        { name: "Pagination", path: "/pagination", pro: false, menuKey: "tbd-ui-pagination" },
        { name: "Popovers", path: "/popovers", pro: false, menuKey: "tbd-ui-popovers" },
        { name: "Progressbar", path: "/progress-bar", pro: false, menuKey: "tbd-ui-progressbar" },
        { name: "Ribbons", path: "/ribbons", pro: false, menuKey: "tbd-ui-ribbons" },
        { name: "Spinners", path: "/spinners", pro: false, menuKey: "tbd-ui-spinners" },
        { name: "Tabs", path: "/tabs", pro: false, menuKey: "tbd-ui-tabs" },
        { name: "Tooltips", path: "/tooltips", pro: false, menuKey: "tbd-ui-tooltips" },
        { name: "Videos", path: "/videos", pro: false, menuKey: "tbd-ui-videos" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 2.75C14 2.33579 14.3358 2 14.75 2C15.1642 2 15.5 2.33579 15.5 2.75V5.73291L17.75 5.73291H19C19.4142 5.73291 19.75 6.0687 19.75 6.48291C19.75 6.89712 19.4142 7.23291 19 7.23291H18.5L18.5 12.2329C18.5 15.5691 15.9866 18.3183 12.75 18.6901V21.25C12.75 21.6642 12.4142 22 12 22C11.5858 22 11.25 21.6642 11.25 21.25V18.6901C8.01342 18.3183 5.5 15.5691 5.5 12.2329L5.5 7.23291H5C4.58579 7.23291 4.25 6.89712 4.25 6.48291C4.25 6.0687 4.58579 5.73291 5 5.73291L6.25 5.73291L8.5 5.73291L8.5 2.75C8.5 2.33579 8.83579 2 9.25 2C9.66421 2 10 2.33579 10 2.75L10 5.73291L14 5.73291V2.75ZM7 7.23291L7 12.2329C7 14.9943 9.23858 17.2329 12 17.2329C14.7614 17.2329 17 14.9943 17 12.2329L17 7.23291L7 7.23291Z" fill="currentColor"></path></svg>`,
      name: "Authentication",
      menuKey: "tbd-authentication",
      subItems: [
        { name: "Sign In", path: "/signin", pro: false, menuKey: "tbd-auth-signin" },
        { name: "Sign Up", path: "/signup", pro: false, menuKey: "tbd-auth-signup" },
        { name: "Reset Password", path: "/reset-password", pro: false, menuKey: "tbd-auth-reset-password" },
        {
          name: "Two Step Verification",
          path: "/two-step-verification",
          pro: false,
          menuKey: "tbd-auth-two-step",
        },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 17.0518V12C20 7.58174 16.4183 4 12 4C7.58168 4 3.99994 7.58174 3.99994 12V17.0518M19.9998 14.041V19.75C19.9998 20.5784 19.3282 21.25 18.4998 21.25H13.9998M6.5 18.75H5.5C4.67157 18.75 4 18.0784 4 17.25V13.75C4 12.9216 4.67157 12.25 5.5 12.25H6.5C7.32843 12.25 8 12.9216 8 13.75V17.25C8 18.0784 7.32843 18.75 6.5 18.75ZM17.4999 18.75H18.4999C19.3284 18.75 19.9999 18.0784 19.9999 17.25V13.75C19.9999 12.9216 19.3284 12.25 18.4999 12.25H17.4999C16.6715 12.25 15.9999 12.9216 15.9999 13.75V17.25C15.9999 18.0784 16.6715 18.75 17.4999 18.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
      name: "Support Tickets",
      menuKey: "tbd-support-tickets",
      subItems: [
        { name: "Ticket List", path: "/support-tickets", menuKey: "tbd-support-ticket-list" },
        { name: "Ticket Reply", path: "/support-ticket-reply", menuKey: "tbd-support-ticket-reply" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.5 8.187V17.25C3.5 17.6642 3.83579 18 4.25 18H19.75C20.1642 18 20.5 17.6642 20.5 17.25V8.18747L13.2873 13.2171C12.5141 13.7563 11.4866 13.7563 10.7134 13.2171L3.5 8.187ZM20.5 6.2286C20.5 6.23039 20.5 6.23218 20.5 6.23398V6.24336C20.4976 6.31753 20.4604 6.38643 20.3992 6.42905L12.4293 11.9867C12.1716 12.1664 11.8291 12.1664 11.5713 11.9867L3.60116 6.42885C3.538 6.38481 3.50035 6.31268 3.50032 6.23568C3.50028 6.10553 3.60577 6 3.73592 6H20.2644C20.3922 6 20.4963 6.10171 20.5 6.2286ZM22 6.25648V17.25C22 18.4926 20.9926 19.5 19.75 19.5H4.25C3.00736 19.5 2 18.4926 2 17.25V6.23398C2 6.22371 2.00021 6.2135 2.00061 6.20333C2.01781 5.25971 2.78812 4.5 3.73592 4.5H20.2644C21.2229 4.5 22 5.27697 22.0001 6.23549C22.0001 6.24249 22.0001 6.24949 22 6.25648Z" fill="currentColor"></path></svg>`,
      name: "Email",
      menuKey: "tbd-email",
      subItems: [
        { name: "Inbox", path: "/inbox", menuKey: "tbd-email-inbox" },
        { name: "Details", path: "/inbox-details", menuKey: "tbd-email-details" },
      ],
    },
    {
      icon: `<svg height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em"><path d="M18.75 2.42969V7.70424M9.42261 13.673C10.0259 14.4307 10.9562 14.9164 12 14.9164C13.0438 14.9164 13.9742 14.4307 14.5775 13.673M20 12V18.5C20 19.3284 19.3284 20 18.5 20H5.5C4.67157 20 4 19.3284 4 18.5V12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18.75 2.42969V2.43969M9.50391 9.875L9.50391 9.885M14.4961 9.875V9.885" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
      name: "AI Assistant",
      menuKey: "tbd-ai-assistant",
      subItems: [
        { name: "Text Generator", path: "/text-generator", menuKey: "tbd-ai-text" },
        { name: "Image Generator", path: "/image-generator", menuKey: "tbd-ai-image" },
        { name: "Code Generator", path: "/code-generator", menuKey: "tbd-ai-code" },
        { name: "Video Generator", path: "/video-generator", menuKey: "tbd-ai-video" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 5.5C3.25 4.25736 4.25736 3.25 5.5 3.25H10.6893C11.2861 3.25 11.8584 3.48705 12.2803 3.90901L15.591 7.21967C16.013 7.64164 16.25 8.21393 16.25 8.81066V18.5C16.25 19.7426 15.2426 20.75 14 20.75H5.5C4.25736 20.75 3.25 19.7426 3.25 18.5V5.5ZM5.5 4.75C5.08579 4.75 4.75 5.08579 4.75 5.5V18.5C4.75 18.9142 5.08579 19.25 5.5 19.25H14C14.4142 19.25 14.75 18.9142 14.75 18.5V8.81066C14.75 8.61174 14.671 8.42098 14.5303 8.28033L11.2197 4.96967C11.079 4.82902 10.8882 4.75 10.6893 4.75H5.5ZM18.5 7.25H19.25C20.4926 7.25 21.5 8.25736 21.5 9.5V19.25C21.5 20.4926 20.4926 21.5 19.25 21.5H10.5C9.25736 21.5 8.25 20.4926 8.25 19.25V18.5H9.75V19.25C9.75 19.6642 10.0858 20 10.5 20H19.25C19.6642 20 20 19.6642 20 19.25V9.5C20 9.08579 19.6642 8.75 19.25 8.75H18.5V7.25Z" fill="currentColor"></path></svg>`,
      name: "Managed Servers",
      menuKey: "tbd-managed-servers",
      path: "/msp-servers",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.31641 4H3.49696C4.24468 4 4.87822 4.55068 4.98234 5.29112L5.13429 6.37161M5.13429 6.37161L6.23641 14.2089C6.34053 14.9493 6.97407 15.5 7.72179 15.5L17.0833 15.5C17.6803 15.5 18.2205 15.146 18.4587 14.5986L21.126 8.47023C21.5572 7.4795 20.8312 6.37161 19.7507 6.37161H5.13429Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M7.7832 19.5H7.7932M16.3203 19.5H16.3303" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
      name: "E-Commerce",
      menuKey: "tbd-ecommerce",
      subItems: [
        { name: "Products", path: "/products-list", menuKey: "tbd-ecom-products" },
        { name: "Add Product", path: "/add-product", menuKey: "tbd-ecom-add-product" },
        { name: "Billing", path: "/billing", menuKey: "tbd-ecom-billing" },
        { name: "Invoices", path: "/invoices", menuKey: "tbd-ecom-invoices" },
        { name: "Single Invoice", path: "/single-invoice", menuKey: "tbd-ecom-single-invoice" },
        { name: "Create Invoice", path: "/create-invoice", menuKey: "tbd-ecom-create-invoice" },
        { name: "Transactions", path: "/transactions", menuKey: "tbd-ecom-transactions" },
        { name: "Single Transaction", path: "/single-transaction", menuKey: "tbd-ecom-single-transaction" },
      ],
    },
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 2C8.41421 2 8.75 2.33579 8.75 2.75V3.75H15.25V2.75C15.25 2.33579 15.5858 2 16 2C16.4142 2 16.75 2.33579 16.75 2.75V3.75H18.5C19.7426 3.75 20.75 4.75736 20.75 6V9V19C20.75 20.2426 19.7426 21.25 18.5 21.25H5.5C4.25736 21.25 3.25 20.2426 3.25 19V9V6C3.25 4.75736 4.25736 3.75 5.5 3.75H7.25V2.75C7.25 2.33579 7.58579 2 8 2ZM8 5.25H5.5C5.08579 5.25 4.75 5.58579 4.75 6V8.25H19.25V6C19.25 5.58579 18.9142 5.25 18.5 5.25H16H8ZM19.25 9.75H4.75V19C4.75 19.4142 5.08579 19.75 5.5 19.75H18.5C18.9142 19.75 19.25 19.4142 19.25 19V9.75Z" fill="currentColor"></path></svg>`,
      name: "Calendar",
      menuKey: "tbd-calendar",
      path: "/calendar",
    },
    {
      name: "Task",
      menuKey: "tbd-task",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.75586 5.50098C7.75586 5.08676 8.09165 4.75098 8.50586 4.75098H18.4985C18.9127 4.75098 19.2485 5.08676 19.2485 5.50098L19.2485 15.4956C19.2485 15.9098 18.9127 16.2456 18.4985 16.2456H8.50586C8.09165 16.2456 7.75586 15.9098 7.75586 15.4956V5.50098ZM8.50586 3.25098C7.26322 3.25098 6.25586 4.25834 6.25586 5.50098V6.26318H5.50195C4.25931 6.26318 3.25195 7.27054 3.25195 8.51318V18.4995C3.25195 19.7422 4.25931 20.7495 5.50195 20.7495H15.4883C16.7309 20.7495 17.7383 19.7421 17.7383 18.4995L17.7383 17.7456H18.4985C19.7411 17.7456 20.7485 16.7382 20.7485 15.4956L20.7485 5.50097C20.7485 4.25833 19.7411 3.25098 18.4985 3.25098H8.50586ZM16.2383 17.7456H8.50586C7.26322 17.7456 6.25586 16.7382 6.25586 15.4956V7.76318H5.50195C5.08774 7.76318 4.75195 8.09897 4.75195 8.51318V18.4995C4.75195 18.9137 5.08774 19.2495 5.50195 19.2495H15.4883C15.9025 19.2495 16.2383 18.9137 16.2383 18.4995L16.2383 17.7456Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "List", path: "/task-list", pro: false, menuKey: "tbd-task-list" },
        { name: "Kanban", path: "/task-kanban", pro: false, menuKey: "tbd-task-kanban" },
      ],
    },
    {
      name: "Forms",
      menuKey: "tbd-forms",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Form Elements", path: "/form-elements", pro: false, menuKey: "tbd-forms-elements" },
        { name: "Form Layout", path: "/form-layout", pro: false, menuKey: "tbd-forms-layout" },
      ],
    },
    {
      name: "Tables",
      menuKey: "tbd-tables",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 5.5C3.25 4.25736 4.25736 3.25 5.5 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V18.5C20.75 19.7426 19.7426 20.75 18.5 20.75H5.5C4.25736 20.75 3.25 19.7426 3.25 18.5V5.5ZM5.5 4.75C5.08579 4.75 4.75 5.08579 4.75 5.5V8.58325L19.25 8.58325V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H5.5ZM19.25 10.0833H15.416V13.9165H19.25V10.0833ZM13.916 10.0833L10.083 10.0833V13.9165L13.916 13.9165V10.0833ZM8.58301 10.0833H4.75V13.9165H8.58301V10.0833ZM4.75 18.5V15.4165H8.58301V19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5ZM10.083 19.25V15.4165L13.916 15.4165V19.25H10.083ZM15.416 19.25V15.4165H19.25V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15.416Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "Basic Tables", path: "/basic-tables", pro: false, menuKey: "tbd-tables-basic" },
        { name: "Data Tables", path: "/data-tables", pro: false, menuKey: "tbd-tables-data" },
      ],
    },
    {
      name: "Pages",
      menuKey: "tbd-pages",
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.50391 4.25C8.50391 3.83579 8.83969 3.5 9.25391 3.5H15.2777C15.4766 3.5 15.6674 3.57902 15.8081 3.71967L18.2807 6.19234C18.4214 6.333 18.5004 6.52376 18.5004 6.72268V16.75C18.5004 17.1642 18.1646 17.5 17.7504 17.5H16.248V17.4993H14.748V17.5H9.25391C8.83969 17.5 8.50391 17.1642 8.50391 16.75V4.25ZM14.748 19H9.25391C8.01126 19 7.00391 17.9926 7.00391 16.75V6.49854H6.24805C5.83383 6.49854 5.49805 6.83432 5.49805 7.24854V19.75C5.49805 20.1642 5.83383 20.5 6.24805 20.5H13.998C14.4123 20.5 14.748 20.1642 14.748 19.75L14.748 19ZM7.00391 4.99854V4.25C7.00391 3.00736 8.01127 2 9.25391 2H15.2777C15.8745 2 16.4468 2.23705 16.8687 2.659L19.3414 5.13168C19.7634 5.55364 20.0004 6.12594 20.0004 6.72268V16.75C20.0004 17.9926 18.9931 19 17.7504 19H16.248L16.248 19.75C16.248 20.9926 15.2407 22 13.998 22H6.24805C5.00541 22 3.99805 20.9926 3.99805 19.75V7.24854C3.99805 6.00589 5.00541 4.99854 6.24805 4.99854H7.00391Z" fill="currentColor"></path></svg>`,
      subItems: [
        { name: "File Manager", path: "/file-manager", pro: false, menuKey: "tbd-pages-file-manager" },
        { name: "Pricing Tables", path: "/pricing-tables", pro: false, menuKey: "tbd-pages-pricing" },
        { name: "Faqs", path: "/faq", pro: false, menuKey: "tbd-pages-faqs" },
        { name: "API Keys", path: "/api-keys", menuKey: "tbd-pages-api-keys" },
        { name: "Integrations", path: "/integrations", menuKey: "tbd-pages-integrations" },
        { name: "Blank Page", path: "/blank", pro: false, menuKey: "tbd-pages-blank" },
        { name: "404 Error", path: "/error-404", pro: false, menuKey: "tbd-pages-404" },
        { name: "500 Error", path: "/error-500", pro: false, menuKey: "tbd-pages-500" },
        { name: "503 Error", path: "/error-503", pro: false, menuKey: "tbd-pages-503" },
        { name: "Coming Soon", path: "/coming-soon", pro: false, menuKey: "tbd-pages-coming-soon" },
        { name: "Maintenance", path: "/maintenance", pro: false, menuKey: "tbd-pages-maintenance" },
        { name: "Success", path: "/success", pro: false, menuKey: "tbd-pages-success" },
      ],
    },
  ];


  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private menuConfigService: MenuConfigService,
    private rbacService: RBACService
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    // Load menu configuration and filter nav items
    this.menuConfigService.loadMenuConfig().subscribe({
      next: () => {
        this.applyMenuFilter();
      },
      error: () => {
        // If config fails to load, show all items
        this.filteredNavItems = [...this.navItems];
        this.filteredToBeDevelopedItems = [...this.toBeDevelopedItems];
      }
    });

    // Subscribe to menu config changes to re-filter dynamically
    this.subscription.add(
      this.menuConfigService.menuConfig$.subscribe(() => {
        this.applyMenuFilter();
        this.cdr.detectChanges();
      })
    );

    // Subscribe to router events
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    // Subscribe to combined observables to close submenus when all are false
    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
        ([isExpanded, isMobileOpen, isHovered]) => {
          if (!isExpanded && !isMobileOpen && !isHovered) {
            // this.openSubmenu = null;
            // this.savedSubMenuHeights = { ...this.subMenuHeights };
            // this.subMenuHeights = {};
            this.cdr.detectChanges();
          } else {
            // Restore saved heights when reopening
            // this.subMenuHeights = { ...this.savedSubMenuHeights };
            // this.cdr.detectChanges();
          }
        }
      )
    );

    // Initial load
    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  isActive(path: string | undefined): boolean {
    if (!path) return false;
    return this.router.url === path;
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges(); // Ensure UI updates
        }
      });
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  private setActiveMenuFromRoute(currentUrl:string) {
    const menuGroups = [
      { items: this.filteredNavItems, prefix: 'main' },
      { items: this.filteredToBeDevelopedItems, prefix: 'tobedeveloped' },
      { items: this.othersItems, prefix: 'others' },
      { items: this.supportItems, prefix: 'support' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;

              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges(); // Ensure UI updates
                }
              });
            }
          });
        }
      });
    });
  }

  onSubmenuClick() {
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }  


  onSingleMenuClick() {
    // Close any open submenu
    this.openSubmenu = null;
    this.subMenuHeights = {};
  
    // Also close sidebar if mobile
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }

  /**
   * Apply menu visibility filtering based on MenuConfiguration from DB.
   * Only Super Admins can see the Admin menu section.
   * Pending/guest users (no permissions) see no module sections.
   */
  applyMenuFilter(): void {
    const config = this.menuConfigService.getMenuConfig();
    const isSuperAdmin = this.rbacService.isSuperAdmin();
    const permissions = this.rbacService.getUserPermissions();
    const isPendingOrGuest = !permissions || permissions.roleType === 'pending' || permissions.moduleRoles.length === 0;

    // Pending/guest users see no modules at all
    if (isPendingOrGuest) {
      this.filteredNavItems = [];
      this.filteredToBeDevelopedItems = [];
      return;
    }

    // If no config loaded yet, show all items except Admin for non-admins
    if (!config || config.length === 0) {
      this.filteredNavItems = this.navItems.filter(item => {
        // Hide Admin section for non-admin users
        if (item.menuKey === 'admin' && !isSuperAdmin) return false;
        return true;
      });
      this.filteredToBeDevelopedItems = [...this.toBeDevelopedItems];
      return;
    }

    // Helper to filter a list of NavItems based on menu config and RBAC
    const filterItems = (items: NavItem[]): NavItem[] => {
      return items
        .filter(item => {
          if (!item.menuKey) return true;

          // Only Super Admins can see the Admin section
          if (item.menuKey === 'admin' && !isSuperAdmin) return false;

          const cfg = config.find(c => c.MenuItemKey === item.menuKey);
          if (!cfg) return true;

          // Super Admins always see protected items
          if (isSuperAdmin && cfg.IsProtected) return true;

          // Super Admins always see the entire Admin section
          if (isSuperAdmin && (item.menuKey === 'admin' || cfg.ParentKey === 'admin')) return true;

          return cfg.IsVisible;
        })
        .map(item => {
          if (item.subItems) {
            const filteredSubItems = item.subItems
              .filter(sub => {
                if (!sub.menuKey) return true;

                const subCfg = config.find(c => c.MenuItemKey === sub.menuKey);
                if (!subCfg) return true;

                if (isSuperAdmin && subCfg.IsProtected) return true;
                if (isSuperAdmin && subCfg.ParentKey === 'admin') return true;

                return subCfg.IsVisible;
              })
              .sort((a, b) => {
                const aCfg = config.find(c => c.MenuItemKey === a.menuKey);
                const bCfg = config.find(c => c.MenuItemKey === b.menuKey);
                return (aCfg?.SortOrder ?? 9999) - (bCfg?.SortOrder ?? 9999);
              });

            return { ...item, subItems: filteredSubItems };
          }
          return item;
        })
        .sort((a, b) => {
          const aCfg = config.find(c => c.MenuItemKey === a.menuKey);
          const bCfg = config.find(c => c.MenuItemKey === b.menuKey);
          return (aCfg?.SortOrder ?? 9999) - (bCfg?.SortOrder ?? 9999);
        });
    };

    this.filteredNavItems = filterItems(this.navItems);
    this.filteredToBeDevelopedItems = filterItems(this.toBeDevelopedItems);
  }
  
  
}
