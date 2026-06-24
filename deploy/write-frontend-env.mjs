#!/usr/bin/env node
/**
 * Generate src/environments/environment.prod.ts at Docker build time.
 * Usage: APP_URL=... AZURE_AD_CLIENT_ID=... AZURE_AD_TENANT_ID=... node deploy/write-frontend-env.mjs [outFile]
 */
import fs from 'node:fs';
import path from 'node:path';

const strip = (value) => (value ?? '').trim().replace(/^["']|["']$/g, '');

const appUrl = strip(process.env.APP_URL).replace(/\/$/, '');
const clientId = strip(process.env.AZURE_AD_CLIENT_ID);
const tenantId = strip(process.env.AZURE_AD_TENANT_ID);
const redirectPath = strip(process.env.MSAL_REDIRECT_PATH || '/auth-callback').replace(/\/$/, '') || '/auth-callback';
const redirectUri = redirectPath === '/' ? appUrl : `${appUrl}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`;
const postLogoutRedirectUri = `${appUrl}/signin`;
const outFile = process.argv[2] ?? 'src/environments/environment.prod.ts';

if (!/^https?:\/\/[^\s/?#]+/.test(appUrl)) {
  console.error('FATAL: APP_URL must be an absolute URL (e.g. https://203.0.113.10)');
  console.error('Got:', JSON.stringify(appUrl));
  process.exit(1);
}

if (!clientId || !tenantId) {
  console.error('FATAL: AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID are required');
  process.exit(1);
}

const escape = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const content = `/**
 * Production Environment — generated at Docker build time
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  apiTimeout: 30000,
  azureAd: {
    clientId: '${escape(clientId)}',
    tenantId: '${escape(tenantId)}',
    redirectUri: '${escape(redirectUri)}',
    postLogoutRedirectUri: '${escape(postLogoutRedirectUri)}',
  },
};
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, content);
console.log(`Wrote ${outFile}`);
console.log(`  redirectUri: ${redirectUri}`);
console.log(`  postLogoutRedirectUri: ${postLogoutRedirectUri}`);
console.log(`  clientId:    ${clientId.slice(0, 8)}...`);
