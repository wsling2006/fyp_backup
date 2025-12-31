#!/bin/bash

# Create a comprehensive diagnostic script to check the upload flow
cat << 'NESTED_EOF' > /tmp/diagnostic-upload.sh
#!/bin/bash

echo "=== Upload Directory Check ==="
ls -lh ~/fyp_system/backend/uploads/receipts/ 2>/dev/null | tail -10

echo ""
echo "=== Most Recent Files (with hex dump of first 100 bytes) ==="
for file in $(ls -t ~/fyp_system/backend/uploads/receipts/ 2>/dev/null | head -3); do
  echo "File: $file"
  stat ~/fyp_system/backend/uploads/receipts/$file 2>/dev/null | grep -E "Size|Modify"
  echo "First 100 bytes (hex):"
  xxd -l 100 ~/fyp_system/backend/uploads/receipts/$file 2>/dev/null
  echo "File signature:"
  file ~/fyp_system/backend/uploads/receipts/$file 2>/dev/null
  echo "---"
done

echo ""
echo "=== Check for Empty/Small Files ==="
find ~/fyp_system/backend/uploads/receipts/ -type f -size -100c 2>/dev/null | while read f; do
  echo "Small file: $f ($(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null) bytes)"
  cat "$f" 2>/dev/null | xxd | head -5
done

echo ""
echo "=== Database Check (recent claims) ==="
cd ~/fyp_system/backend
node -e "
const { DataSource } = require('typeorm');
const path = require('path');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fyp_db',
  entities: [path.join(__dirname, 'src/**/*.entity{.ts,.js}')],
  synchronize: false,
});

AppDataSource.initialize()
  .then(async () => {
    const claims = await AppDataSource.query(\`
      SELECT 
        id, 
        receipt_file_path, 
        receipt_file_original_name,
        file_hash,
        amount_claimed,
        created_at
      FROM claims 
      ORDER BY created_at DESC 
      LIMIT 5
    \`);
    
    console.log('Recent claims:');
    for (const claim of claims) {
      console.log(\`ID: \${claim.id}\`);
      console.log(\`  File: \${claim.receipt_file_original_name}\`);
      console.log(\`  Path: \${claim.receipt_file_path}\`);
      console.log(\`  Hash: \${claim.file_hash}\`);
      console.log(\`  Created: \${claim.created_at}\`);
      
      // Check if file exists and size
      const fs = require('fs');
      try {
        const stats = fs.statSync(claim.receipt_file_path);
        console.log(\`  Disk Size: \${stats.size} bytes\`);
        
        // Read first few bytes to check content
        const buffer = fs.readFileSync(claim.receipt_file_path);
        console.log(\`  First 20 bytes: \${buffer.slice(0, 20).toString('hex')}\`);
      } catch (err) {
        console.log(\`  Error: \${err.message}\`);
      }
      console.log('');
    }
    
    await AppDataSource.destroy();
  })
  .catch(err => console.error('Error:', err.message));
" 2>/dev/null || echo "Could not query database"

NESTED_EOF

chmod +x /tmp/diagnostic-upload.sh
echo "Diagnostic script created. To run on EC2, execute:"
echo "scp /tmp/diagnostic-upload.sh fyp:/tmp/ && ssh fyp 'bash /tmp/diagnostic-upload.sh'"
