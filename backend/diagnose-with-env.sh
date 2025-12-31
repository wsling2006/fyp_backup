#!/bin/bash

# Diagnostic with proper environment loading
# Run this ON EC2 in the backend directory where .env is located

echo "============================================"
echo "BLANK FILE DIAGNOSTIC - WITH ENV LOADING"
echo "============================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "✗ Error: .env file not found in current directory"
    echo "Please run this from: ~/fyp_system/backend/"
    exit 1
fi

echo "✓ Found .env file"
echo ""

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "Environment loaded:"
echo "  DB_HOST: ${DB_HOST:-localhost}"
echo "  DB_PORT: ${DB_PORT:-5432}"
echo "  DB_USER: ${DB_USER:-postgres}"
echo "  DB_NAME: ${DB_NAME:-fyp_db}"
echo "  DB_PASSWORD: ${DB_PASSWORD:0:3}... (hidden)"
echo ""

# Test 1: Check if pg module can handle BYTEA
echo "TEST 1: PostgreSQL BYTEA Support"
echo "=================================="
node << 'NODESCRIPT'
const { Client } = require('pg');

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
    
    // Create test data - simple string
    const testData = Buffer.from('TEST FILE CONTENT', 'utf8');
    console.log('\nOriginal test data:');
    console.log('  Size:', testData.length, 'bytes');
    console.log('  Hex:', testData.toString('hex').substring(0, 40));
    console.log('  Text:', testData.toString('utf8'));
    
    // Create temp table and insert
    await client.query('CREATE TEMP TABLE test_blob (id SERIAL, data BYTEA)');
    await client.query('INSERT INTO test_blob (data) VALUES ($1)', [testData]);
    console.log('✓ Data inserted into temp table');
    
    // Read back
    const result = await client.query('SELECT data FROM test_blob LIMIT 1');
    const retrieved = result.rows[0].data;
    
    console.log('\nRetrieved from database:');
    console.log('  Size:', retrieved.length, 'bytes');
    console.log('  Hex:', retrieved.toString('hex').substring(0, 40));
    console.log('  Text:', retrieved.toString('utf8'));
    console.log('  Buffers match:', testData.equals(retrieved) ? '✓ YES' : '✗ NO');
    
    if (!testData.equals(retrieved)) {
      console.log('\n✗ FAIL: Database is corrupting BYTEA data!');
      await client.end();
      process.exit(1);
    }
    
    console.log('\n✓ SUCCESS: Database BYTEA storage works correctly');
    await client.end();
  } catch (err) {
    console.error('✗ Database error:', err.message);
    process.exit(1);
  }
}

test();
NODESCRIPT

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ TEST 1 FAILED - Cannot proceed with other tests"
    exit 1
fi

echo ""
echo ""

# Test 2: Check actual accountant files in database
echo "TEST 2: Accountant Files in Database"
echo "====================================="
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
    
    // Get most recent accountant files
    const result = await client.query(`
      SELECT 
        id, 
        filename, 
        mimetype, 
        size,
        LENGTH(data) as data_length,
        SUBSTRING(ENCODE(data, 'hex'), 1, 40) as first_bytes
      FROM accountant_files 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('No accountant files found in database');
      await client.end();
      return;
    }
    
    console.log(`Found ${result.rows.length} recent files:\n`);
    
    let hasBlankFiles = false;
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.filename}`);
      console.log('   Size (metadata): ${row.size} bytes');
      console.log('   Actual data length: ${row.data_length} bytes');
      console.log('   MIME type: ${row.mimetype}');
      console.log('   First bytes: ${row.first_bytes || 'NULL'}');
      
      if (row.data_length === 0 || row.data_length === null) {
        console.log('   ✗ STATUS: DATA IS EMPTY!');
        hasBlankFiles = true;
      } else if (row.first_bytes === null || row.first_bytes === '0000000000000000000000000000000000000000') {
        console.log('   ✗ STATUS: DATA IS ALL ZEROS (BLANK)!');
        hasBlankFiles = true;
      } else {
        console.log('   ✓ STATUS: Data appears valid');
      }
      console.log('');
    });
    
    if (hasBlankFiles) {
      console.log('⚠ WARNING: Some files have empty or blank data!');
      console.log('This means files are NOT being stored in the database.');
    } else {
      console.log('✓ All checked files have valid data');
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
NODESCRIPT

echo ""
echo ""

# Test 3: Check claims with file data
echo "TEST 3: Claim Files in Database"
echo "================================"
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
    
    // Check if receipt_file_data column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'claims' 
      AND column_name = 'receipt_file_data'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠ Column receipt_file_data does not exist yet');
      console.log('Migration has not been run.');
      await client.end();
      return;
    }
    
    console.log('✓ Column receipt_file_data exists\n');
    
    // Get claims with file data
    const result = await client.query(`
      SELECT 
        id,
        receipt_file_original_name,
        receipt_file_size,
        LENGTH(receipt_file_data) as actual_data_length,
        SUBSTRING(ENCODE(receipt_file_data, 'hex'), 1, 40) as first_bytes
      FROM claims 
      WHERE receipt_file_data IS NOT NULL
      ORDER BY uploaded_at DESC 
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('No claims with database-stored files found.');
      console.log('(This is normal if you haven\'t uploaded any new claims yet)');
    } else {
      console.log(`Found ${result.rows.length} claims with file data:\n`);
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.receipt_file_original_name}`);
        console.log('   Size (metadata): ${row.receipt_file_size} bytes');
        console.log('   Actual length: ${row.actual_data_length} bytes');
        console.log('   First bytes: ${row.first_bytes || 'NULL'}');
        console.log('');
      });
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
NODESCRIPT

echo ""
echo ""
echo "============================================"
echo "DIAGNOSTIC COMPLETE"
echo "============================================"
echo ""
echo "Summary:"
echo "--------"
echo "• If TEST 1 passed: Database can store/retrieve binary data ✓"
echo "• If TEST 2 shows blank files: Application isn't saving data properly"
echo "• Check the 'Data length' vs 'Size' columns above"
echo ""
echo "Next step: Share this output for analysis"
