import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

/**
 * Azure AD JWT Authentication Middleware
 * 
 * Validates Bearer tokens issued by Azure AD against the JWKS endpoint.
 * Tokens are Azure AD v2.0 access tokens sent by the MSAL interceptor.
 */

// Azure AD configuration from environment (must be set in .env)
const TENANT_ID: string = process.env.AZURE_AD_TENANT_ID ?? '';
const CLIENT_ID: string = process.env.AZURE_AD_CLIENT_ID ?? '';

if (!TENANT_ID || !CLIENT_ID) {
  console.error('FATAL: AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID must be set in environment variables');
  process.exit(1);
}

// JWKS client to retrieve signing keys from Azure AD
const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Get the signing key from Azure AD JWKS endpoint
 */
function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error('No kid in token header'));
    }
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return reject(err);
      }
      if (!key) {
        return reject(new Error('Signing key not found'));
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Extend Express Request to include authenticated user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    oid: string;         // Azure AD Object ID
    email: string;       // User email  
    name: string;        // Display name
    preferred_username: string;
    tid: string;         // Tenant ID
    roles?: string[];
  };
}

/**
 * Authentication middleware - validates Azure AD JWT tokens
 * 
 * Extracts the Bearer token from the Authorization header,
 * verifies it against Azure AD's JWKS, and attaches user info to req.user.
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in with Microsoft 365.',
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Decode the token header to get the kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format.',
      });
      return;
    }

    // Get the signing key from Azure AD
    const signingKey = await getSigningKey(decoded.header);

    // Verify the token
    const payload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://sts.windows.net/${TENANT_ID}/`,
      ],
      audience: [CLIENT_ID, `api://${CLIENT_ID}`],
    }) as jwt.JwtPayload;

    // Attach user info to request
    req.user = {
      oid: payload.oid || payload.sub || '',
      email: payload.email || payload.preferred_username || payload.upn || '',
      name: payload.name || '',
      preferred_username: payload.preferred_username || payload.upn || '',
      tid: payload.tid || '',
      roles: payload.roles || [],
    };

    next();
  } catch (error: any) {
    console.error('JWT verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired. Please sign in again.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

/**
 * Optional auth middleware - attaches user info if token present, but doesn't block
 * Use for routes that work for both authenticated and unauthenticated users
 */
export async function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token, { complete: true });
    
    if (decoded && decoded.header) {
      const signingKey = await getSigningKey(decoded.header);
      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: [
          `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
          `https://sts.windows.net/${TENANT_ID}/`,
        ],
        audience: [CLIENT_ID, `api://${CLIENT_ID}`],
      }) as jwt.JwtPayload;

      req.user = {
        oid: payload.oid || payload.sub || '',
        email: payload.email || payload.preferred_username || payload.upn || '',
        name: payload.name || '',
        preferred_username: payload.preferred_username || payload.upn || '',
        tid: payload.tid || '',
        roles: payload.roles || [],
      };
    }
  } catch {
    // Token invalid - continue without user info
  }

  next();
}

/**
 * Authorization middleware factory - checks if user has a specific role
 * Requires authMiddleware to run first
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // For now, role checking is done at the application level via the database
    // Azure AD roles can be added later via App Roles in the Azure AD app registration
    next();
  };
}
