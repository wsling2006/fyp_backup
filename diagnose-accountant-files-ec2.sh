#!/bin/bash
# Diagnostic script for EC2 - Check accountant file data in database
# This is READ-ONLY and won't change anything

echo "🔍 Checking accountant files in database..."
echo ""

cd /home/ubuntu/fyp_system/backend || cd ~/fyp_system/backend || exit 1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Use Node.js to query the database
node -e "
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\\n');

    // Get last 10 files
    const result = await client.query(\`
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
    \`);

    console.log(\`Found \${result.rows.length} files:\\n\`);

    result.rows.forEach((file, idx) => {
      const age = Math.floor((Date.now() - new Date(file.created_at)) / (1000 * 60 * 60 * 24));
      console.log(\`[\${idx + 1}] \${file.filename}\`);
      console.log(\`    Age: \${age} days ago\`);
      console.log(\`    Created: \${file.created_at}\`);
      console.log(\`    Stored size: \${file.size} bytes\`);
      console.log(\`    Actual data: \${file.actual_data_length} bytes\`);
      console.log(\`    First bytes: \${file.first_20_bytes_hex}\`);
      
      // Check for issues
      if (file.size != file.actual_data_length) {
        console.log(\`    ⚠️  SIZE MISMATCH!\`);
      }
      if (file.actual_data_length === 0) {
        console.log(\`    ❌ EMPTY FILE!\`);
      }
      if (age < 1) {
        console.log(\`    🆕 NEW FILE (uploaded today)\`);
      } else if (age > 10) {
        console.log(\`    📦 OLD FILE (uploaded \${age} days ago)\`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

check();
"
