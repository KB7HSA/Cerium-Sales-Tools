import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { AnalyticsComponent } from './pages/dashboard/analytics/analytics.component';
import { MarketingComponent } from './pages/dashboard/marketing/marketing.component';
import { CrmComponent } from './pages/dashboard/crm/crm.component';
import { StocksComponent } from './pages/dashboard/stocks/stocks.component';
import { SaasComponent } from './pages/dashboard/saas/saas.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { TaskListComponent } from './pages/task/task-list/task-list.component';
import { TaskKanbanComponent } from './pages/task/task-kanban/task-kanban.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { FormLayoutComponent } from './pages/forms/form-layout/form-layout.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { DataTablesComponent } from './pages/tables/data-tables/data-tables.component';
import { FileManagerComponent } from './pages/file-manager/file-manager.component';
import { PricingTablesComponent } from './pages/pricing-tables/pricing-tables.component';
import { FaqsComponent } from './pages/faqs/faqs.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { Error500Component } from './pages/other-page/error-500/error-500.component';
import { Error503Component } from './pages/other-page/error-503/error-503.component';
import { ComingSoonComponent } from './pages/other-page/coming-soon/coming-soon.component';
import { MaintenanceComponent } from './pages/other-page/maintenance/maintenance.component';
import { SuccessComponent } from './pages/other-page/success/success.component';
import { ChatsComponent } from './pages/chats/chats.component';
import { EmailInboxComponent } from './pages/email/email-inbox/email-inbox.component';
import { EmailDetailsComponent } from './pages/email/email-details/email-details.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { PieChartComponent } from './pages/charts/pie-chart/pie-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { BreadcrumbComponent } from './pages/ui-elements/breadcrumb/breadcrumb.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ButtonGroupComponent } from './pages/ui-elements/button-group/button-group.component';
import { CardsComponent } from './pages/ui-elements/cards/cards.component';
import { CarouselComponent } from './pages/ui-elements/carousel/carousel.component';
import { DropdownsComponent } from './pages/ui-elements/dropdowns/dropdowns.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { LinksComponent } from './pages/ui-elements/links/links.component';
import { ListsComponent } from './pages/ui-elements/lists/lists.component';
import { ModalsComponent } from './pages/ui-elements/modals/modals.component';
import { NotificationsComponent } from './pages/ui-elements/notifications/notifications.component';
import { PaginationsComponent } from './pages/ui-elements/paginations/paginations.component';
import { PopoversComponent } from './pages/ui-elements/popovers/popovers.component';
import { ProgressBarComponent } from './pages/ui-elements/progress-bar/progress-bar.component';
import { RibbonsComponent } from './pages/ui-elements/ribbons/ribbons.component';
import { SpinnersComponent } from './pages/ui-elements/spinners/spinners.component';
import { TabsComponent } from './pages/ui-elements/tabs/tabs.component';
import { TooltipsComponent } from './pages/ui-elements/tooltips/tooltips.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { ResetPasswordComponent } from './pages/auth-pages/reset-password/reset-password.component';
import { TwoStepVerificationComponent } from './pages/auth-pages/two-step-verification/two-step-verification.component';
import { LogisticsComponent } from './pages/dashboard/logistics/logistics.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { TextGeneratorComponent } from './pages/ai/text-generator/text-generator.component';
import { AlternativeLayoutComponent } from './shared/layout/alternative-layout/alternative-layout.component';
import { ImageGeneratorComponent } from './pages/ai/image-generator/image-generator.component';
import { CodeGeneratorComponent } from './pages/ai/code-generator/code-generator.component';
import { VideoGeneratorComponent } from './pages/ai/video-generator/video-generator.component';
import { ProductListComponent } from './pages/ecommerce/product-list/product-list.component';
import { AddProductComponent } from './pages/ecommerce/add-product/add-product.component';
import { BillingComponent } from './pages/ecommerce/billing/billing.component';
import { InvoiceComponent } from './pages/ecommerce/invoice/invoice.component';
import { SingleInvoiceComponent } from './pages/ecommerce/single-invoice/single-invoice.component';
import { CreateInvoiceComponent } from './pages/ecommerce/create-invoice/create-invoice.component';
import { TransactionsComponent } from './pages/ecommerce/transactions/transactions.component';
import { SingleTransactionComponent } from './pages/ecommerce/single-transaction/single-transaction.component';
import { TicketListComponent } from './pages/support/ticket-list/ticket-list.component';
import { TicketReplyComponent } from './pages/support/ticket-reply/ticket-reply.component';
import { ApiKeysComponent } from './pages/other-page/api-keys/api-keys.component';
import { IntegrationsComponent } from './pages/other-page/integrations/integrations.component';
import { ServicesOverviewComponent } from './pages/msp-services/services-overview.component';
import { ManagedServersComponent } from './pages/msp-services/managed-servers.component';
import { SupportComponent } from './pages/msp-services/support.component';
import { MspQuoteComponent } from './pages/msp-services/msp-quote.component';
import { QuoteManagementComponent } from './pages/msp-services/quote-management.component';
import { MspDashboardComponent } from './pages/msp-services/msp-dashboard.component';
import { UserManagementComponent } from './pages/admin/user-management.component';
import { UserFormComponent } from './pages/admin/user-form.component';
import { MSPOfferingsComponent } from './pages/admin/msp-offerings.component';
import { MSPOfferingFormComponent } from './pages/admin/msp-offering-form.component';
import { LaborBudgetComponent } from './pages/labor-budget/labor-budget.component';
import { LaborBudgetWizardComponent } from './pages/labor-budget-wizard/labor-budget-wizard.component';
import { LaborBudgetAdminComponent } from './pages/admin/labor-budget-admin.component';
import { AdminSettingsComponent } from './pages/admin/admin-settings.component';
import { SowGeneratorComponent } from './pages/sow-generator/sow-generator.component';
import { CustomerManagementComponent } from './pages/admin/customer-management.component';

export const routes: Routes = [
  {
    path:'',
    component:AppLayoutComponent,
    children:[
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title:
          'Angular Ecommerce Dashboard | Cerium Sales Tools',
      },
      {
        path:'analytics',
        component:AnalyticsComponent,
        title:'Angular Analytics Dashboard | Cerium Sales Tools'
      },
      {
        path:'marketing',
        component:MarketingComponent,
        title:'Angular Marketing Dashboard | Cerium Sales Tools'
      },
      {
        path:'crm',
        component:CrmComponent,
        title:'Angular CRM Dashboard | Cerium Sales Tools'
      },
      {
        path:'stocks',
        component:StocksComponent,
        title:'Angular Stocks Dashboard | Cerium Sales Tools'
      },
      {
        path:'saas',
        component:SaasComponent,
        title:'Angular SaaS Dashboard | Cerium Sales Tools'
      },
      {
        path:'logistics',
        component:LogisticsComponent,
        title:'Angular Logistics Dashboard | Cerium Sales Tools'
      },
      {
        path:'calendar',
        component:CalenderComponent,
        title:'Angular Calender | Cerium Sales Tools'
      },
      // ecommerce pages
      {
        path:'products-list',
        component:ProductListComponent,
        title:'Angular Product List Dashboard | Cerium Sales Tools'
      },
      {
        path:'add-product',
        component:AddProductComponent,
        title:'Angular Add Product Dashboard | Cerium Sales Tools'
      },
      {
        path:'billing',
        component:BillingComponent,
        title:'Angular Ecommerce Billing Dashboard | Cerium Sales Tools'
      },
      {
        path:'invoices',
        component:InvoiceComponent,
        title:'Angular Ecommerce Invoice Dashboard | Cerium Sales Tools'
      },
      {
        path:'single-invoice',
        component:SingleInvoiceComponent,
        title:'Angular Single Invoice Dashboard | Cerium Sales Tools'
      },
      {
        path:'create-invoice',
        component:CreateInvoiceComponent,
        title:'Angular Create Invoice Dashboard | Cerium Sales Tools'
      },
      {
        path:'transactions',
        component:TransactionsComponent,
        title:'Angular Transactions Dashboard | Cerium Sales Tools'
      },
      {
        path:'single-transaction',
        component:SingleTransactionComponent,
        title:'Angular Single Transaction Dashboard | Cerium Sales Tools'
      },
      {
        path:'profile',
        component:ProfileComponent,
        title:'Angular Profile Dashboard | Cerium Sales Tools'
      },
      {
        path:'task-list',
        component:TaskListComponent,
        title:'Angular Task List Dashboard | Cerium Sales Tools'
      },
      {
        path:'task-kanban',
        component:TaskKanbanComponent,
        title:'Angular Task Kanban Dashboard | Cerium Sales Tools'
      },
      {
        path:'form-elements',
        component:FormElementsComponent,
        title:'Angular Form Elements Dashboard | Cerium Sales Tools'
      },
      {
        path:'form-layout',
        component:FormLayoutComponent,
        title:'Angular Form Layout Dashboard | Cerium Sales Tools'
      },
      {
        path:'basic-tables',
        component:BasicTablesComponent,
        title:'Angular Basic Tables Dashboard | Cerium Sales Tools'
      },
      {
        path:'data-tables',
        component:DataTablesComponent,
        title:'Angular Data Tables Dashboard | Cerium Sales Tools'
      },
      {
        path:'file-manager',
        component:FileManagerComponent,
        title:'Angular File Manager Dashboard | Cerium Sales Tools'
      },
      {
        path:'pricing-tables',
        component:PricingTablesComponent,
        title:'Angular Pricing Dashboard | Cerium Sales Tools'
      },
      {
        path:'faq',
        component:FaqsComponent,
        title:'Angular Faqs Dashboard | Cerium Sales Tools'
      },
      {
        path:'api-keys',
        component:ApiKeysComponent,
        title:'Angular Api Keys Dashboard | Cerium Sales Tools'
      },
      {
        path:'integrations',
        component:IntegrationsComponent,
        title:'Angular Integrations Dashboard | Cerium Sales Tools'
      },
      // MSP Services
      {
        path:'msp-dashboard',
        component:MspDashboardComponent,
        title:'MSP Services Dashboard | Cerium Sales Tools'
      },
      {
        path:'msp-services',
        component:ServicesOverviewComponent,
        title:'MSP Services Overview | Cerium Sales Tools'
      },
      {
        path:'msp-servers',
        component:ManagedServersComponent,
        title:'Managed Servers | Cerium Sales Tools'
      },
      {
        path:'msp-support',
        component:SupportComponent,
        title:'MSP Support Tickets | Cerium Sales Tools'
      },
      {
        path:'msp-quote',
        component:MspQuoteComponent,
        title:'MSP Services Quote | Cerium Sales Tools'
      },
      {
        path:'labor-budget',
        component:LaborBudgetComponent,
        title:'Labor Budget | Cerium Sales Tools'
      },
      {
        path:'labor-budget-wizard',
        component:LaborBudgetWizardComponent,
        title:'Labor Budget Wizard | Cerium Sales Tools'
      },
      {
        path:'quote-management',
        component:QuoteManagementComponent,
        title:'Quote Management | Cerium Sales Tools'
      },
      {
        path:'sow-generator',
        component:SowGeneratorComponent,
        title:'SOW Generator | Cerium Sales Tools'
      },
      // Admin
      {
        path:'admin/users',
        component:UserManagementComponent,
        title:'User Management | Cerium Sales Tools'
      },
      {
        path:'admin/customers',
        component:CustomerManagementComponent,
        title:'Customer Management | Cerium Sales Tools'
      },
      {
        path:'admin/create-user',
        component:UserFormComponent,
        title:'Create User | Cerium Sales Tools'
      },
      {
        path:'admin/edit-user/:id',
        component:UserFormComponent,
        title:'Edit User | Cerium Sales Tools'
      },
      {
        path:'admin/offerings',
        component:MSPOfferingsComponent,
        title:'MSP Offerings | Cerium Sales Tools'
      },
      {
        path:'admin/create-offering',
        component:MSPOfferingFormComponent,
        title:'Create Offering | Cerium Sales Tools'
      },
      {
        path:'admin/edit-offering/:id',
        component:MSPOfferingFormComponent,
        title:'Edit Offering | Cerium Sales Tools'
      },
      {
        path:'admin/labor-budget',
        component:LaborBudgetAdminComponent,
        title:'Labor Budget Admin | Cerium Sales Tools'
      },
      {
        path:'admin/settings',
        component:AdminSettingsComponent,
        title:'Admin Settings | Cerium Sales Tools'
      },
      {
        path:'blank',
        component:BlankComponent,
        title:'Angular Blank Dashboard | Cerium Sales Tools'
      },
      {
        path:'chat',
        component:ChatsComponent,
        title:'Angular Chats Dashboard | Cerium Sales Tools'
      },
      // support tickets
      {
        path:'support-tickets',
        component:TicketListComponent,
        title:'Angular Support Tickets Dashboard | Cerium Sales Tools'
      },
      {
        path:'support-ticket-reply',
        component:TicketReplyComponent,
        title:'Angular Ticket Details Dashboard | Cerium Sales Tools'
      },
      {
        path:'inbox',
        component:EmailInboxComponent,
        title:'Angular Email Inbox Dashboard | Cerium Sales Tools'
      },
      {
        path:'inbox-details',
        component:EmailDetailsComponent,
        title:'Angular Email Inbox Details Dashboard | Cerium Sales Tools'
      },
      {
        path:'invoice',
        component:InvoicesComponent,
        title:'Angular Invoice Details Dashboard | Cerium Sales Tools'
      },
      {
        path:'line-chart',
        component:LineChartComponent,
        title:'Angular Line Chart Dashboard | Cerium Sales Tools'
      },
      {
        path:'bar-chart',
        component:BarChartComponent,
        title:'Angular Bar Chart Dashboard | Cerium Sales Tools'
      },
      {
        path:'pie-chart',
        component:PieChartComponent,
        title:'Angular Pie Chart Dashboard | Cerium Sales Tools'
      },
      {
        path:'alerts',
        component:AlertsComponent,
        title:'Angular Alerts Dashboard | Cerium Sales Tools'
      },
      {
        path:'avatars',
        component:AvatarElementComponent,
        title:'Angular Avatars Dashboard | Cerium Sales Tools'
      },
      {
        path:'badge',
        component:BadgesComponent,
        title:'Angular Badges Dashboard | Cerium Sales Tools'
      },
      {
        path:'breadcrumb',
        component:BreadcrumbComponent,
        title:'Angular Breadcrumb Dashboard | Cerium Sales Tools'
      },
      {
        path:'buttons',
        component:ButtonsComponent,
        title:'Angular Buttons Dashboard | Cerium Sales Tools'
      },
      {
        path:'buttons-group',
        component:ButtonGroupComponent,
        title:'Angular Buttons Group Dashboard | Cerium Sales Tools'
      },
      {
        path:'cards',
        component:CardsComponent,
        title:'Angular Cards Dashboard | Cerium Sales Tools'
      },
      {
        path:'carousel',
        component:CarouselComponent,
        title:'Angular Carousel Dashboard | Cerium Sales Tools'
      },
      {
        path:'dropdowns',
        component:DropdownsComponent,
        title:'Angular Dropdown Dashboard | Cerium Sales Tools'
      },
      {
        path:'images',
        component:ImagesComponent,
        title:'Angular Images Dashboard | Cerium Sales Tools'
      },
      {
        path:'links',
        component:LinksComponent,
        title:'Angular Links Dashboard | Cerium Sales Tools'
      },
      {
        path:'list',
        component:ListsComponent,
        title:'Angular Lists Dashboard | Cerium Sales Tools'
      },
      {
        path:'modals',
        component:ModalsComponent,
        title:'Angular Modals Dashboard | Cerium Sales Tools'
      },
      {
        path:'notifications',
        component:NotificationsComponent,
        title:'Angular Notifications Dashboard | Cerium Sales Tools'
      },
      {
        path:'pagination',
        component:PaginationsComponent,
        title:'Angular Pagination Dashboard | Cerium Sales Tools'
      },
      {
        path:'popovers',
        component:PopoversComponent,
        title:'Angular Popovers Dashboard | Cerium Sales Tools'
      },
      {
        path:'progress-bar',
        component:ProgressBarComponent,
        title:'Angular Progressbar Dashboard | Cerium Sales Tools'
      },
      {
        path:'ribbons',
        component:RibbonsComponent,
        title:'Angular Ribbons Dashboard | Cerium Sales Tools'
      },
      {
        path:'spinners',
        component:SpinnersComponent,
        title:'Angular Spinners Dashboard | Cerium Sales Tools'
      },
      {
        path:'tabs',
        component:TabsComponent,
        title:'Angular Tabs Dashboard | Cerium Sales Tools'
      },
      {
        path:'tooltips',
        component:TooltipsComponent,
        title:'Angular Tooltips Dashboard | Cerium Sales Tools'
      },
      {
        path:'videos',
        component:VideosComponent,
        title:'Angular Videos Dashboard | Cerium Sales Tools'
      },
    ]
  },
  {
    path:'',
    component:AlternativeLayoutComponent,
    children:[
       // ai pages
      {
        path:'text-generator',
        component:TextGeneratorComponent,
        title:'Angular AI Text Generator | Cerium Sales Tools'
      },
      {
        path:'image-generator',
        component:ImageGeneratorComponent,
        title:'Angular AI Image Generator | Cerium Sales Tools'
      },
      {
        path:'code-generator',
        component:CodeGeneratorComponent,
        title:'Angular AI Code Generator | Cerium Sales Tools'
      },
      {
        path:'video-generator',
        component:VideoGeneratorComponent,
        title:'Angular AI Video Generator | Cerium Sales Tools'
      },
    ]
  },
  {
    path:'coming-soon',
    component:ComingSoonComponent,
    title:'Angular Coming soon Dashboard | Cerium Sales Tools'
  },
  {
    path:'maintenance',
    component:MaintenanceComponent,
    title:'Angular Maintenance Dashboard | Cerium Sales Tools'
  },
  {
    path:'success',
    component:SuccessComponent,
    title:'Angular Success Dashboard | Cerium Sales Tools'
  },
  // auth pages
  {
    path:'signin',
    component:SignInComponent,
    title:'Angular Sign In Dashboard | Cerium Sales Tools'
  },
  {
    path:'signup',
    component:SignUpComponent,
    title:'Angular Sign Up Dashboard | Cerium Sales Tools'
  },
  {
    path:'reset-password',
    component:ResetPasswordComponent,
    title:'Angular Reset Password Dashboard | Cerium Sales Tools'
  },
  {
    path:'two-step-verification',
    component:TwoStepVerificationComponent,
    title:'Angular Two Step Verification Dashboard | Cerium Sales Tools'
  },
  // error pages
  {
    path:'error-500',
    component:Error500Component,
    title:'Angular Error 500 Dashboard | Cerium Sales Tools'
  },
  {
    path:'error-503',
    component:Error503Component,
    title:'Angular Error 503 Dashboard | Cerium Sales Tools'
  },
  {
    path:'**',
    component:NotFoundComponent,
    title:'Angular NotFound Dashboard | Cerium Sales Tools'
  },
];
