/**
 * Database Connection Test Script
 * Tests connectivity to Azure SQL Server and verifies MSP offerings functionality
 */

import 'dotenv/config'; // Load environment variables
import { getConnectionPool, executeQuery } from './src/config/database';
import { MSPOfferingService } from './src/services/msp-offering.service';

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Azure SQL Server Connection...\n');
  
  try {
    // Test 1: Basic Connection
    console.log('Test 1: Establishing connection to Azure SQL Server...');
    const pool = await getConnectionPool();
    console.log('✅ Connection pool established successfully\n');

    // Test 2: Query Database Version
    console.log('Test 2: Querying SQL Server version...');
    const versionResult = await executeQuery<any>('SELECT @@VERSION AS Version', {});
    if (versionResult && versionResult.length > 0) {
      console.log('✅ SQL Server Version:', versionResult[0].Version.substring(0, 100) + '...\n');
    }

    // Test 3: Check if MspOfferings table exists
    console.log('Test 3: Checking if MspOfferings table exists...');
    const tableCheck = await executeQuery<any>(
      `SELECT COUNT(*) as TableExists 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'MspOfferings'`,
      {}
    );
    
    if (tableCheck && tableCheck[0].TableExists > 0) {
      console.log('✅ MspOfferings table exists\n');
    } else {
      console.log('❌ MspOfferings table not found\n');
      return;
    }

    // Test 4: Check if MspOfferingAddOns table exists
    console.log('Test 4: Checking if MspOfferingAddOns table exists...');
    const addOnsTableCheck = await executeQuery<any>(
      `SELECT COUNT(*) as TableExists 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'MspOfferingAddOns'`,
      {}
    );
    
    if (addOnsTableCheck && addOnsTableCheck[0].TableExists > 0) {
      console.log('✅ MspOfferingAddOns table exists\n');
    } else {
      console.log('⚠️  MspOfferingAddOns table not found - run migration script: db/add-offering-addons-table.sql\n');
    }

    // Test 5: Count MSP Offerings
    console.log('Test 5: Counting MSP offerings in database...');
    const countResult = await executeQuery<any>('SELECT COUNT(*) as OfferingCount FROM dbo.MspOfferings', {});
    console.log(`✅ Found ${countResult[0].OfferingCount} MSP offerings in database\n`);

    // Test 6: Fetch all offerings using service
    console.log('Test 6: Testing MSPOfferingService.getAllOfferings()...');
    const offerings = await MSPOfferingService.getAllOfferings(false);
    console.log(`✅ Service returned ${offerings.length} offerings`);
    
    if (offerings.length > 0) {
      const firstOffering = offerings[0];
      console.log('\nSample Offering:');
      console.log(`  - ID: ${firstOffering.Id}`);
      console.log(`  - Name: ${firstOffering.Name}`);
      console.log(`  - Category: ${firstOffering.Category}`);
      console.log(`  - Features: ${firstOffering.Features?.length || 0}`);
      console.log(`  - Service Levels: ${firstOffering.ServiceLevels?.length || 0}`);
      console.log(`  - Add-ons: ${firstOffering.AddOns?.length || 0}`);
    }

    // Test 7: Check connection pool status
    console.log('\n\nTest 7: Connection pool status...');
    console.log(`✅ Pool connected: ${pool.connected}`);
    console.log(`✅ Pool size: ${pool.size}`);
    
    console.log('\n\n✅ ALL TESTS PASSED - Database is connected and functional!\n');
    
    await pool.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION TEST FAILED:', error);
    console.error('\nError Details:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
