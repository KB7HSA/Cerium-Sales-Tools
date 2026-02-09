# Microsoft 365 Authentication Integration Guide

This guide explains how to set up and use Microsoft 365 (Azure AD) authentication in your Angular application.

## Table of Contents
1. [Installation](#installation)
2. [Azure AD Configuration](#azure-ad-configuration)
3. [Application Configuration](#application-configuration)
4. [Usage](#usage)
5. [Protecting Routes](#protecting-routes)
6. [API Access](#api-access)
7. [Troubleshooting](#troubleshooting)

---

## Installation

Install the required MSAL (Microsoft Authentication Library) packages:

```bash
npm install @azure/msal-browser @azure/msal-angular
```

## Azure AD Configuration

### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Your app name (e.g., "TailAdmin App")
   - **Supported account types**: Choose based on your needs:
     - Single tenant (your organization only)
     - Multi-tenant (any Azure AD directory)
     - Multi-tenant + personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:4200` (for development)
5. Click **Register**

### Step 2: Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Single-page application**, add redirect URIs:
   - `http://localhost:4200`
   - `https://yourdomain.com` (for production)
3. Under **Logout URL**: Add `http://localhost:4200`
4. Under **Implicit grant and hybrid flows**:
   - ✅ Check **ID tokens** (if using ID tokens)
5. Click **Save**

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `User.Read` (Read user profile)
   - `openid` (Sign in users)
   - `profile` (View users' basic profile)
   - `email` (View users' email address)
6. Click **Add permissions**
7. (Optional) Click **Grant admin consent** for your organization

### Step 4: Get Your Credentials

1. Go to **Overview** page
2. Copy the following values:
   - **Application (client) ID**
   - **Directory (tenant) ID**

---

## Application Configuration

### Update MSAL Configuration

Edit `src/app/shared/config/msal.config.ts`:

```typescript
export const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID_HERE', // Replace with your Application (client) ID
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE', // Replace with your Directory (tenant) ID
    redirectUri: 'http://localhost:4200', // Update for production
    postLogoutRedirectUri: 'http://localhost:4200'
  },
  // ... rest of config
};
```

**For multi-tenant apps**, use:
```typescript
authority: 'https://login.microsoftonline.com/common'
```

**For production**, update redirect URIs:
```typescript
redirectUri: 'https://yourdomain.com',
postLogoutRedirectUri: 'https://yourdomain.com'
```

---

## Usage

### Sign In

The sign-in functionality is already integrated in the sign-in page. Users can click the **"Sign in with Microsoft"** button to authenticate.

#### Programmatic Sign-In

```typescript
import { MicrosoftAuthService } from './shared/services/microsoft-auth.service';

constructor(private microsoftAuth: MicrosoftAuthService) {}

// Using popup (recommended for better UX)
signIn() {
  this.microsoftAuth.loginPopup().subscribe({
    next: (result) => {
      console.log('Login successful', result);
      // Navigate to dashboard or handle success
    },
    error: (error) => {
      console.error('Login failed', error);
      // Handle error
    }
  });
}

// Using redirect (alternative)
signInRedirect() {
  this.microsoftAuth.loginRedirect();
}
```

### Sign Out

```typescript
// Sign out with popup
signOut() {
  this.microsoftAuth.logout();
}

// Sign out with redirect
signOutRedirect() {
  this.microsoftAuth.logoutRedirect();
}
```

### Get User Information

```typescript
// Get active account
const account = this.microsoftAuth.getActiveAccount();
console.log('User:', account?.name);
console.log('Email:', account?.username);

// Check if user is authenticated
const isAuthenticated = this.microsoftAuth.isAuthenticated;
```

---

## Protecting Routes

Use the `msAuthGuard` to protect routes that require authentication:

```typescript
// In app.routes.ts
import { msAuthGuard } from './shared/guards/ms-auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivate: [msAuthGuard] // Protect this route
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [msAuthGuard] // Protect this route
  },
  // ... other routes
];
```

---

## API Access

### Calling Microsoft Graph API

```typescript
import { MicrosoftAuthService } from './shared/services/microsoft-auth.service';
import { HttpClient } from '@angular/common/http';

constructor(
  private microsoftAuth: MicrosoftAuthService,
  private http: HttpClient
) {}

getUserProfile() {
  // Get access token
  this.microsoftAuth.acquireTokenSilent(['User.Read']).subscribe({
    next: (result) => {
      // Call Microsoft Graph API
      this.http.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${result.accessToken}`
        }
      }).subscribe(profile => {
        console.log('User profile:', profile);
      });
    },
    error: (error) => {
      console.error('Token acquisition failed', error);
    }
  });
}
```

### Available Graph API Endpoints

Common Microsoft Graph API endpoints:

- **User Profile**: `https://graph.microsoft.com/v1.0/me`
- **Profile Photo**: `https://graph.microsoft.com/v1.0/me/photo/$value`
- **Mail**: `https://graph.microsoft.com/v1.0/me/messages`
- **Calendar**: `https://graph.microsoft.com/v1.0/me/calendar/events`
- **OneDrive**: `https://graph.microsoft.com/v1.0/me/drive`

See [Microsoft Graph API documentation](https://docs.microsoft.com/en-us/graph/api/overview) for more endpoints.

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure you're using the correct redirect URI in Azure AD
- Check that your app is registered as a Single-Page Application (SPA)

#### 2. Login Popup Blocked
- Some browsers block popups by default
- Use redirect flow instead: `loginRedirect()` instead of `loginPopup()`

#### 3. "Invalid Client" Error
- Verify your `clientId` is correct
- Check that your app registration exists in Azure AD

#### 4. "Redirect URI Mismatch" Error
- Ensure the redirect URI in code matches Azure AD configuration
- Remember to update for both development and production environments

#### 5. Token Acquisition Fails
- Check that required API permissions are granted
- Verify the scopes requested match configured permissions

### Enable Debug Logging

For development, enable detailed logging in `msal.config.ts`:

```typescript
system: {
  loggerOptions: {
    logLevel: LogLevel.Verbose, // Change to Verbose for debugging
    piiLoggingEnabled: true // Enable for development only
  }
}
```

**⚠️ Warning**: Never enable `piiLoggingEnabled` in production!

---

## Production Checklist

Before deploying to production:

- [ ] Update `clientId` with production app registration
- [ ] Update `authority` with correct tenant ID
- [ ] Update `redirectUri` to production URL
- [ ] Add production redirect URI to Azure AD app registration
- [ ] Set `piiLoggingEnabled: false`
- [ ] Set `logLevel` to `Error` or `Warning`
- [ ] Test login/logout flows
- [ ] Test protected routes
- [ ] Test token refresh
- [ ] Grant admin consent for required permissions (if needed)

---

## Additional Resources

- [Microsoft Authentication Library (MSAL) for Angular](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular)
- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/api/overview)
- [MSAL Angular Samples](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-angular-v3-samples)

---

## Support

For issues and questions:
- Check [MSAL GitHub Issues](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues)
- Review [Microsoft Q&A](https://docs.microsoft.com/en-us/answers/topics/azure-active-directory.html)
