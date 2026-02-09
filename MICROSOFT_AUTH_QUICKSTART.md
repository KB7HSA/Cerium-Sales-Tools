# Microsoft 365 Authentication - Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install @azure/msal-browser @azure/msal-angular
```

### 2. Create Azure AD App

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Azure Active Directory** → **App registrations** → **New registration**
3. Set:
   - Name: Your app name
   - Redirect URI: `Single-page application (SPA)` → `http://localhost:4200`
4. Click **Register**
5. Copy **Application (client) ID** and **Directory (tenant) ID**

### 3. Configure Permissions

1. Go to **API permissions** → **Add a permission** → **Microsoft Graph**
2. Add these **Delegated permissions**:
   - `User.Read`
   - `openid`
   - `profile`
   - `email`
3. Click **Grant admin consent**

### 4. Update Configuration

Edit `src/app/shared/config/msal.config.ts`:

```typescript
export const msalConfig = {
  auth: {
    clientId: 'PASTE_YOUR_CLIENT_ID_HERE',
    authority: 'https://login.microsoftonline.com/PASTE_YOUR_TENANT_ID_HERE',
    // ... rest stays the same
  }
};
```

### 5. Test!

Run your app and click **"Sign in with Microsoft"** on the login page.

```bash
npm start
```

---

## ✅ What's Already Integrated

- ✅ Microsoft authentication button on sign-in page
- ✅ Login with popup (smooth UX)
- ✅ Automatic token management
- ✅ Route protection guard (`msAuthGuard`)
- ✅ User profile access
- ✅ Sign-out functionality

---

## 📖 Need More Details?

See the complete guide: [MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md)

---

## 🔒 Example: Protect a Route

```typescript
// In app.routes.ts
import { msAuthGuard } from './shared/guards/ms-auth.guard';

{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [msAuthGuard] // 👈 Requires Microsoft login
}
```

---

## 👤 Example: Get User Info

```typescript
import { MicrosoftAuthService } from './shared/services/microsoft-auth.service';

constructor(private auth: MicrosoftAuthService) {
  const user = this.auth.getActiveAccount();
  console.log('User:', user?.name);
  console.log('Email:', user?.username);
}
```

---

## 🏢 Multi-Tenant Support

To allow users from any Microsoft 365 organization:

```typescript
authority: 'https://login.microsoftonline.com/common'
```

---

## 🌐 Production Deployment

1. Update Azure AD redirect URIs with production URL
2. Update `msal.config.ts`:
   ```typescript
   redirectUri: 'https://yourdomain.com',
   postLogoutRedirectUri: 'https://yourdomain.com'
   ```
3. Set logging to production mode (already configured)

---

## 🆘 Troubleshooting

**Login popup blocked?**
- Allow popups in browser, or use redirect flow instead

**"Invalid client" error?**
- Double-check your `clientId` in `msal.config.ts`

**"Redirect URI mismatch"?**
- Ensure Azure AD redirect URI matches exactly (including http/https)

---

For detailed troubleshooting, see [MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md#troubleshooting)
