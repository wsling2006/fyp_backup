#!/bin/bash

# Comprehensive diagnostic for blank file issue affecting BOTH features
# Run this ON EC2 to diagnose the problem

echo "============================================"
echo "BLANK FILE DIAGNOSTIC - COMPREHENSIVE CHECK"
echo "============================================"
echo ""

cd ~/fyp_system/backend || exit 1

# Test 1: Check if pg module can handle BYTEA
echo "TEST 1: PostgreSQL BYTEA Support"
echo "=================================="
node << 'NODESCRIPT'
const { Client } = require('pg');
const crypto = require('crypto');

async function test() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fyp_db',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    // Create test data
    const testData = Buffer.from('TEST FILE CONTENT - 12345', 'utf8');
    console.log('\nOriginal data:');
    console.log('  Size:', testData.length, 'bytes');
    console.log('  Hex:', testData.toString('hex'));
    console.log('  Text:', testData.toString('utf8'));
    
    // Create temp table and insert
    await client.query('CREATE TEMP TABLE test_blob (id SERIAL, data BYTEA)');
    await client.query('INSERT INTO test_blob (data) VALUES ($1)', [testData]);
    console.log('✓ Data inserted');
    
    // Read back
    const result = await client.query('SELECT data FROM test_blob LIMIT 1');
    const retrieved = result.rows[0].data;
    
    console.log('\nRetrieved data:');
    console.log('  Size:', retrieved.length, 'bytes');
    console.log('  Hex:', retrieved.toString('hex'));
    console.log('  Text:', retrieved.toString('utf8'));
    console.log('  Match:', testData.equals(retrieved) ? '✓ YES' : '✗ NO');
    
    if (!testData.equals(retrieved)) {
      console.log('\n✗ FAIL: Database BYTEA storage is broken!');
      process.exit(1);
    }
    
    console.log('\n✓ Database BYTEA storage works correctly');
    await client.end();
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

test();
NODESCRIPT

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ BYTEA test failed! Database has issues."
    exit 1
fi

echo ""
echo ""

# Test 2: Check actual accountant files in database
echo "TEST 2: Check Accountant Files in Database"
echo "==========================================="
node << 'NODESCRIPT'
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fyp_db',
  });

  try {
    await client.connect();
    
    // Get most recent accountant file
    const result = await client.query(`
      SELECT 
        id, 
        filename, 
        mimetype, 
        size,
        LENGTH(data) as data_length,
        SUBSTRING(ENCODE(data, 'hex'), 1, 40) as first_20_bytes_hex
      FROM accountant_files 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (result.rows.length === 0) {
      console.log('No accountant files found');
      return;
    }
    
    console.log('Most recent accountant files:');
    result.rows.forEach((row, i) => {
      console.log(`\n${i+1}. ${row.filename}`);
      console.log('   ID:', row.id);
      console.log('   Size (metadata):', row.size, 'bytes');
      console.log('   Data length (actual):', row.data_length, 'bytes');
      console.log('   MIME type:', row.mimetype);
      console.log('   First bytes:', row.first_20_bytes_hex);
      
      if (row.data_length === 0) {
        console.log('   ✗ WARNING: Data is EMPTY!');
      } else if (row.first_20_bytes_hex === '00000000000000000000000000000000000000000000') {
        console.log('   ✗ WARNING: Data is all zeros (blank)!');
      } else {
        console.log('   ✓ Data appears valid');
      }
    });
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
NODESCRIPT

echo ""
echo ""

# Test 3: Check if TypeORM is writing data correctly
echo "TEST 3: Test File Upload Simulation"
echo "===================================="
node << 'NODESCRIPT'
const { DataSource } = require('typeorm');
const path = require('path');

async function test() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fyp_db',
    entities: [path.join(__dirname, 'dist/**/*.entity{.ts,.js}')],
    synchronize: false,
  });

  try {
    await AppDataSource.initialize();
    console.log('✓ TypeORM initialized');
    
    // Simulate file upload
    const testBuffer = Buffer.from('TEST UPLOAD VIA TYPEORM', 'utf8');
    console.log('\nTest buffer:');
    console.log('  Size:', testBuffer.length);
    console.log('  Hex:', testBuffer.toString('hex'));
    console.log('  Is Buffer:', Buffer.isBuffer(testBuffer));
    
    // Insert using TypeORM query
    await AppDataSource.query(`
      INSERT INTO accountant_files (id, filename, mimetype, size, data, created_at)
      VALUES (gen_random_uuid(), 'test-typeorm.txt', 'text/plain', $1, $2, NOW())
    `, [testBuffer.length, testBuffer]);
    
    console.log('✓ Inserted via TypeORM query');
    
    // Read back
    const result = await AppDataSource.query(`
      SELECT 
        filename, 
        size, 
        LENGTH(data) as data_length,
        ENCODE(data, 'escape') as data_text
      FROM accountant_files 
      WHERE filename = 'test-typeorm.txt'
      LIMIT 1
    `);
    
    if (result.length === 0) {
      console.log('✗ Could not find inserted record');
    } else {
      const row = result[0];
      console.log('\nRetrieved:');
      console.log('  Size (metadata):', row.size);
      console.log('  Data length:', row.data_length);
      console.log('  Data content:', row.data_text);
      
      if (row.data_length === testBuffer.length) {
        console.log('  ✓ Size matches');
      } else {
        console.log('  ✗ Size mismatch!');
      }
    }
    
    // Cleanup
    await AppDataSource.query(`DELETE FROM accountant_files WHERE filename = 'test-typeorm.txt'`);
    
    await AppDataSource.destroy();
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

test();
NODESCRIPT

echo ""
echo ""

# Test 4: Check PM2 environment and memory
echo "TEST 4: System Environment Check"
echo "================================="
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""
echo "PM2 status:"
pm2 list
echo ""
echo "Memory usage:"
free -h
echo ""
echo "Disk space:"
df -h | grep -E "(Filesystem|/$)"

echo ""
echo ""
echo "============================================"
echo "DIAGNOSTIC COMPLETE"
echo "============================================"
echo ""
echo "Review the output above to identify the issue:"
echo "1. If TEST 1 failed → PostgreSQL BYTEA support is broken"
echo "2. If TEST 2 shows empty/zero data → Files aren't being stored"
echo "3. If TEST 3 fails → TypeORM has issues writing binary data"
echo "4. If all tests pass → The issue is in the application logic"
