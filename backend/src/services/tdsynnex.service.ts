/**
 * TD SYNNEX Partner API Service
 * 
 * Handles authentication and API calls to the TD SYNNEX Partner API.
 * Uses OAuth2 client credentials flow for authentication.
 * 
 * API Docs: https://api-uat.us.tdsynnex.com
 * Auth endpoint: https://sso.us.tdsynnex.com/oauth2/v1/token
 */

import axios from 'axios';

// ── Configuration ──────────────────────────────────────────────
const SSO_URL = process.env.TDSYNNEX_SSO_URL || 'https://sso.us.tdsynnex.com';
const API_BASE_URL = process.env.TDSYNNEX_API_URL || 'https://api-uat.us.tdsynnex.com';
const CLIENT_ID = process.env.TDSYNNEX_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TDSYNNEX_CLIENT_SECRET || '';

// ── Interfaces ─────────────────────────────────────────────────

export interface TDSynnexTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ShipmentSubLine {
  displayLineNumber: string;
  techDataPONumber: string | null;
  vendorSalesOrderNumber: string | null;
  quantity: string;
  shipDate: string | null;
  warehouse: string | null;
  deliveryNumber: string | null;
  lineStatus: string;
  tracking: Array<{
    trackingNumber?: string;
    carrierDescription?: string;
  }>;
}

export interface ShipmentLine {
  displayLineNumber: string;
  lineNumber: string;
  partNumber: string;
  manufacturerPartNumber: string;
  configStatus: string | null;
  totalQuantity: string;
  hasMultipleTrackingNumbers: boolean;
  hasMultipleCarrier: boolean;
  lineStatusCode: string | null;
  lineStatus: string;
  uniqueID: string | null;
  subLines: ShipmentSubLine[];
}

export interface ShipmentDetailsResponse {
  orderNumber: string;
  purchaseOrder: string;
  orderStatus: string;
  orderStatusCode: string | null;
  uniqueID: string | null;
  lines: ShipmentLine[];
  errorMessage: string | null;
}

export interface TDSynnexApiError {
  requestId?: string;
  data?: {
    errorCode: string;
    errorMessage: string;
  };
}

// ── Token Cache ────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

// ── Service Class ──────────────────────────────────────────────

export class TDSynnexService {

  /**
   * Obtain an OAuth2 access token using client_credentials grant.
   * Caches the token and auto-refreshes when expired.
   */
  static async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
      return cachedToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('TD SYNNEX credentials not configured. Set TDSYNNEX_CLIENT_ID and TDSYNNEX_CLIENT_SECRET in .env');
    }

    console.log('[TDSynnex] Requesting new access token...');

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    try {
      const response = await axios.post<TDSynnexTokenResponse>(
        `${SSO_URL}/oauth2/v1/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      cachedToken = response.data.access_token;
      tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

      console.log(`[TDSynnex] Token acquired, expires in ${response.data.expires_in}s`);
      return cachedToken;
    } catch (err: any) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('[TDSynnex] Token request failed:', detail);
      throw new Error(`TD SYNNEX authentication failed: ${detail}`);
    }
  }

  /**
   * Query shipment details for a given order number.
   * 
   * Endpoint: GET /api/v1/orders/shipment/details/orderNo/{orderNo}
   */
  static async getOrderShipmentDetails(orderNo: string): Promise<ShipmentDetailsResponse> {
    if (!orderNo || !orderNo.trim()) {
      throw new Error('Order number is required');
    }

    const token = await this.getAccessToken();
    const url = `${API_BASE_URL}/api/v1/orders/shipment/details/orderNo/${encodeURIComponent(orderNo.trim())}`;

    console.log(`[TDSynnex] Querying shipment details for order: ${orderNo}`);

    try {
      const response = await axios.get<ShipmentDetailsResponse>(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = response.data;
      console.log(`[TDSynnex] Shipment details received for order: ${orderNo}, status: ${data.orderStatus}, lines: ${data.lines?.length || 0}`);
      return data;
    } catch (err: any) {
      const status = err.response?.status || 'unknown';
      const detail = err.response?.data?.data?.errorMessage
        || err.response?.data?.errorMessage
        || (typeof err.response?.data === 'string' ? err.response.data : null)
        || err.message;
      console.error(`[TDSynnex] Shipment query failed (${status}):`, detail);
      throw new Error(`TD SYNNEX API error (${status}): ${detail}`);
    }
  }

  /**
   * Check if TD SYNNEX credentials are configured in environment.
   */
  static isConfigured(): boolean {
    return !!(CLIENT_ID && CLIENT_SECRET);
  }
}
