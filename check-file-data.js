#!/usr/bin/env node
/**
 * Diagnostic script to check accountant file data in database
 * This helps identify if files are being stored/retrieved correctly
 */

const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function checkFileData() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all files ordered by creation date
    const result = await client.query(`
      SELECT 
        id, 
        filename, 
        mimetype,
        size,
        octet_length(data) as actual_data_length,
        created_at,
        substring(encode(data, 'hex') from 1 for 40) as first_20_bytes_hex,
        file_hash
      FROM accountant_files 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} files:\n`);

    result.rows.forEach((file, idx) => {
      console.log(`[${idx + 1}] File: ${file.filename}`);
      console.log(`    ID: ${file.id}`);
      console.log(`    Created: ${file.created_at}`);
      console.log(`    MIME: ${file.mimetype}`);
      console.log(`    Stored size: ${file.size} bytes`);
      console.log(`    Actual data length: ${file.actual_data_length} bytes`);
      console.log(`    Hash: ${file.file_hash || 'NULL'}`);
      console.log(`    First 20 bytes (hex): ${file.first_20_bytes_hex}`);
      
      // Check for issues
      if (file.size != file.actual_data_length) {
        console.log(`    ⚠️  SIZE MISMATCH! Stored size (${file.size}) != Actual data (${file.actual_data_length})`);
      }
      if (file.actual_data_length === 0) {
        console.log(`    ❌ EMPTY FILE - Data column is empty!`);
      }
      if (!file.first_20_bytes_hex || file.first_20_bytes_hex.length === 0) {
        console.log(`    ❌ NO DATA - File has no content!`);
      }
      console.log('');
    });

    // Check for very recent files (last hour)
    const recentResult = await client.query(`
      SELECT 
        COUNT(*) as recent_count,
        MIN(created_at) as oldest_recent,
        MAX(created_at) as newest_recent
      FROM accountant_files 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    if (recentResult.rows[0].recent_count > 0) {
      console.log(`\n📊 Files uploaded in last hour: ${recentResult.rows[0].recent_count}`);
      console.log(`   Oldest: ${recentResult.rows[0].oldest_recent}`);
      console.log(`   Newest: ${recentResult.rows[0].newest_recent}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkFileData().catch(console.error);
