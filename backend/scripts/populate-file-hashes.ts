#!/usr/bin/env ts-node

/**
 * Populate File Hashes Script
 * 
 * This script generates SHA256 hashes for existing files in the accountant_files table
 * that don't have hashes yet (uploaded before the hash feature was added).
 * 
 * Usage:
 *   ts-node scripts/populate-file-hashes.ts
 * 
 * Or add to package.json:
 *   "scripts": {
 *     "populate-hashes": "ts-node scripts/populate-file-hashes.ts"
 *   }
 */

import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AccountantFile } from '../src/accountant-files/accountant-file.entity';
import { User } from '../src/users/user.entity';

// Database configuration (adjust as needed)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'fyp_db',
  entities: [AccountantFile, User],
  synchronize: false, // Don't auto-sync in scripts
});

async function populateHashes() {
  console.log('🔧 Starting hash population for existing files...\n');

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const repo = AppDataSource.getRepository(AccountantFile);

    // Find all files without hashes
    const filesWithoutHash = await repo.find({
      where: { file_hash: null } as any,
      select: ['id', 'filename', 'data'],
    });

    console.log(`📊 Found ${filesWithoutHash.length} files without hashes\n`);

    if (filesWithoutHash.length === 0) {
      console.log('✅ All files already have hashes. Nothing to do.\n');
      await AppDataSource.destroy();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each file
    for (const file of filesWithoutHash) {
      try {
        // Generate SHA256 hash from file data
        const hash = crypto
          .createHash('sha256')
          .update(file.data)
          .digest('hex');

        // Update the file with the hash
        await repo.update(file.id, { file_hash: hash });

        console.log(`✅ ${file.filename} → ${hash.substring(0, 16)}...`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Error processing ${file.filename}: ${error.message}`);
        
        // Check if it's a duplicate hash error
        if (error.code === '23505') { // PostgreSQL unique violation
          console.log(`   ⚠️  This file is a duplicate of an existing file`);
        }
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors:  ${errorCount}`);
    console.log(`   📁 Total:   ${filesWithoutHash.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount > 0) {
      console.log('⚠️  Some files could not be processed.');
      console.log('   This usually means they are duplicates of existing files.');
      console.log('   You may want to review and manually delete duplicates.\n');
    }

    // Close connection
    await AppDataSource.destroy();
    console.log('✅ Done!\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
populateHashes().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
