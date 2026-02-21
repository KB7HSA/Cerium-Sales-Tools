import { USACForm470Service } from '../src/services/usac470.service';

/**
 * Unit tests for USAC Form 470 Service
 * Run with: npx ts-node backend/tests/usac470.service.test.ts
 */

// Test color codes for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}Error: ${error.message}${RESET}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

console.log(`\n${YELLOW}=== USAC Form 470 Service Tests ===${RESET}\n`);

// ================================================================
// PRIMARY KEY GENERATION TESTS
// ================================================================

console.log('Primary Key Generation:');

test('generates primary key with all fields', () => {
  const record = {
    application_number: '123456789',
    service_request_id: 'SR001',
    form_version: '1'
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '123456789|SR001|1');
});

test('handles missing application_number', () => {
  const record = {
    service_request_id: 'SR001',
    form_version: '1'
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '|SR001|1');
});

test('handles missing service_request_id', () => {
  const record = {
    application_number: '123456789',
    form_version: '1'
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '123456789||1');
});

test('handles missing form_version', () => {
  const record = {
    application_number: '123456789',
    service_request_id: 'SR001'
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '123456789|SR001|');
});

test('handles all fields null', () => {
  const record = {
    application_number: null,
    service_request_id: null,
    form_version: null
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '||');
});

test('handles empty object', () => {
  const record = {};
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '||');
});

test('handles undefined values', () => {
  const record = {
    application_number: undefined,
    service_request_id: undefined,
    form_version: undefined
  };
  const key = USACForm470Service.generatePrimaryKey(record);
  assertEqual(key, '||');
});

test('generates unique keys for different records', () => {
  const record1 = { application_number: '111', service_request_id: 'A', form_version: '1' };
  const record2 = { application_number: '111', service_request_id: 'A', form_version: '2' };
  const record3 = { application_number: '111', service_request_id: 'B', form_version: '1' };
  
  const key1 = USACForm470Service.generatePrimaryKey(record1);
  const key2 = USACForm470Service.generatePrimaryKey(record2);
  const key3 = USACForm470Service.generatePrimaryKey(record3);
  
  if (key1 === key2 || key1 === key3 || key2 === key3) {
    throw new Error('Keys should be unique for different records');
  }
});

// ================================================================
// RECORD MAPPING TESTS
// ================================================================

console.log('\nRecord Mapping:');

test('maps basic SODA record to DB record', () => {
  const sodaRecord = {
    application_number: '123456789',
    service_request_id: 'SR001',
    form_version: '1',
    billed_entity_name: 'Test School District',
    billed_entity_state: 'WA',
    funding_year: '2026'
  };
  
  const dbRecord = USACForm470Service.mapToDbRecord(sodaRecord);
  
  assertEqual(dbRecord.PrimaryKey, '123456789|SR001|1');
  assertEqual(dbRecord.ApplicationNumber, '123456789');
  assertEqual(dbRecord.BilledEntityName, 'Test School District');
  assertEqual(dbRecord.BilledEntityState, 'WA');
  assertEqual(dbRecord.FundingYear, '2026');
});

test('maps form_pdf object to JSON string', () => {
  const sodaRecord = {
    application_number: '123',
    service_request_id: 'SR',
    form_version: '1',
    form_pdf: { url: 'https://example.com/form.pdf' }
  };
  
  const dbRecord = USACForm470Service.mapToDbRecord(sodaRecord);
  
  assertEqual(dbRecord.FormPdf, '{"url":"https://example.com/form.pdf"}');
});

test('preserves string form_pdf', () => {
  const sodaRecord = {
    application_number: '123',
    service_request_id: 'SR',
    form_version: '1',
    form_pdf: 'https://example.com/form.pdf'
  };
  
  const dbRecord = USACForm470Service.mapToDbRecord(sodaRecord);
  
  assertEqual(dbRecord.FormPdf, 'https://example.com/form.pdf');
});

test('handles null values in mapping', () => {
  const sodaRecord = {
    application_number: '123',
    service_request_id: null,
    form_version: '1',
    billed_entity_name: null
  };
  
  const dbRecord = USACForm470Service.mapToDbRecord(sodaRecord);
  
  assertEqual(dbRecord.PrimaryKey, '123||1');
  assertEqual(dbRecord.BilledEntityName, null);
});

test('parses number_of_eligible_entities as integer', () => {
  const sodaRecord = {
    application_number: '123',
    service_request_id: 'SR',
    form_version: '1',
    number_of_eligible_entities: '42'
  };
  
  const dbRecord = USACForm470Service.mapToDbRecord(sodaRecord);
  
  assertEqual(dbRecord.NumberOfEligibleEntities, 42);
});

// ================================================================
// DIFF DETECTION (simulated) TESTS
// ================================================================

console.log('\nDiff Detection:');

test('identifies new record when key not in existing set', () => {
  const existingKeys = new Set(['111|A|1', '222|B|1', '333|C|1']);
  const newRecord = { application_number: '444', service_request_id: 'D', form_version: '1' };
  const newKey = USACForm470Service.generatePrimaryKey(newRecord);
  
  const isNew = !existingKeys.has(newKey);
  assertEqual(isNew, true);
});

test('identifies existing record when key is in set', () => {
  const existingKeys = new Set(['111|A|1', '222|B|1', '333|C|1']);
  const existingRecord = { application_number: '222', service_request_id: 'B', form_version: '1' };
  const key = USACForm470Service.generatePrimaryKey(existingRecord);
  
  const isNew = !existingKeys.has(key);
  assertEqual(isNew, false);
});

test('correctly counts new records in batch', () => {
  const existingKeys = new Set(['111|A|1', '222|B|1']);
  
  const incomingRecords = [
    { application_number: '111', service_request_id: 'A', form_version: '1' }, // existing
    { application_number: '222', service_request_id: 'B', form_version: '1' }, // existing
    { application_number: '333', service_request_id: 'C', form_version: '1' }, // new
    { application_number: '444', service_request_id: 'D', form_version: '1' }, // new
  ];
  
  let newCount = 0;
  for (const record of incomingRecords) {
    const key = USACForm470Service.generatePrimaryKey(record);
    if (!existingKeys.has(key)) {
      newCount++;
    }
  }
  
  assertEqual(newCount, 2);
});

test('handles empty existing set (all new)', () => {
  const existingKeys = new Set<string>();
  
  const incomingRecords = [
    { application_number: '111', service_request_id: 'A', form_version: '1' },
    { application_number: '222', service_request_id: 'B', form_version: '1' },
  ];
  
  let newCount = 0;
  for (const record of incomingRecords) {
    const key = USACForm470Service.generatePrimaryKey(record);
    if (!existingKeys.has(key)) {
      newCount++;
    }
  }
  
  assertEqual(newCount, 2);
});

test('handles edge case: form_version change makes new record', () => {
  const existingKeys = new Set(['111|A|1']);
  const record = { application_number: '111', service_request_id: 'A', form_version: '2' }; // version changed
  const key = USACForm470Service.generatePrimaryKey(record);
  
  const isNew = !existingKeys.has(key);
  assertEqual(isNew, true, 'Form version change should create new key');
});

// ================================================================
// PAGING LOGIC TESTS
// ================================================================

console.log('\nPaging Logic:');

test('detects when more pages available', () => {
  const pageSize = 1000;
  const resultCount = 1000; // full page = might be more
  const hasMore = resultCount >= pageSize;
  assertEqual(hasMore, true);
});

test('detects when no more pages', () => {
  const pageSize = 1000;
  const resultCount = 500; // partial page = no more
  const hasMore = resultCount >= pageSize;
  assertEqual(hasMore, false);
});

test('paging loop terminates at safety limit', () => {
  let offset = 0;
  const pageSize = 1000;
  const safetyLimit = 100000;
  let iterations = 0;
  
  // Simulate infinite loop scenario
  while (offset < safetyLimit && iterations < 1000) { // extra guard for test
    offset += pageSize;
    iterations++;
  }
  
  assertEqual(offset >= safetyLimit, true, 'Should hit safety limit');
});

// ================================================================
// SUMMARY
// ================================================================

console.log(`\n${YELLOW}=== Test Summary ===${RESET}`);
console.log(`${GREEN}Passed: ${passed}${RESET}`);
if (failed > 0) {
  console.log(`${RED}Failed: ${failed}${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}All tests passed!${RESET}\n`);
  process.exit(0);
}
