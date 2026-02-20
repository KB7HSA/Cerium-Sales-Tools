import sql from 'mssql';

/**
 * SQL Server Connection Pool Configuration
 * Connects to Azure SQL Server via ceriumdemo.database.windows.net
 */
export const sqlConfig = {
  server: process.env.DB_HOST || 'ceriumdemo.database.windows.net',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'ceriumsqladmin',
  password: process.env.DB_PASSWORD || 'q7$fbVEXk3SJghD',
  database: process.env.DB_NAME || 'CeriumSalesTools',
  options: {
    encrypt: true, // Azure requires encryption
    trustServerCertificate: true,
    enableKeepAlive: true,
    keepAliveInitialDelaySeconds: 30,
    connectionTimeout: 60000, // Increased to 60 seconds
    requestTimeout: 60000,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

/**
 * Initialize and return SQL Server connection pool
 */
export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  try {
    pool = new sql.ConnectionPool(sqlConfig);

    pool.on('error', (err: Error) => {
      console.error('SQL Server Connection Pool Error:', err);
      pool = null; // Reset pool on error
    });

    await pool.connect();
    console.log('✅ Connected to SQL Server:', sqlConfig.server);
    return pool;
  } catch (error) {
    console.error('❌ Failed to connect to SQL Server:', error);
    throw error;
  }
}

/**
 * Close the connection pool
 */
export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('✅ SQL Server connection pool closed');
    } catch (error) {
      console.error('❌ Error closing connection pool:', error);
    }
  }
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery<T = any>(
  query: string,
  params?: Record<string, any> | any[]
): Promise<T[]> {
  try {
    const connPool = await getConnectionPool();
    const request = connPool.request();

    // Add parameters if provided
    if (params) {
      if (Array.isArray(params)) {
        // Legacy array-based parameters
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      } else if (typeof params === 'object') {
        // Named parameters object - pass value directly
        Object.keys(params).forEach((key) => {
          request.input(key, params[key]);
        });
      }
    }

    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  }
}

/**
 * Execute a stored procedure
 */
export async function executeStoredProcedure<T = any>(
  procedureName: string,
  params?: Record<string, any>
): Promise<T[]> {
  try {
    const connPool = await getConnectionPool();
    const request = connPool.request();

    // Add parameters if provided
    if (params) {
      Object.keys(params).forEach((key) => {
        request.input(key, params[key]);
      });
    }

    const result = await request.execute(procedureName);
    return result.recordset as T[];
  } catch (error) {
    console.error(`❌ Stored procedure '${procedureName}' error:`, error);
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function executeTransaction(callback: (request: sql.Request) => Promise<void>): Promise<void> {
  const connPool = await getConnectionPool();
  const transaction = new sql.Transaction(connPool);

  try {
    await transaction.begin();
    const request = transaction.request();
    await callback(request);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Transaction error:', error);
    throw error;
  }
}
