#!/bin/bash

# Quick test to check uploaded files on EC2
# This will show the actual content of the most recent uploaded files

ssh fyp << 'ENDSSH'
    echo "=== Checking Upload Directory ==="
    cd ~/fyp_system/backend/uploads/receipts/ 2>/dev/null || {
        echo "ERROR: Upload directory not found!"
        exit 1
    }
    
    echo "Total files: $(ls -1 | wc -l)"
    echo ""
    
    echo "=== Most Recent 5 Files ==="
    ls -lht | head -6
    echo ""
    
    echo "=== Detailed Check of Most Recent File ==="
    LATEST=$(ls -t | head -1)
    if [ -z "$LATEST" ]; then
        echo "No files found!"
        exit 1
    fi
    
    echo "Filename: $LATEST"
    echo ""
    
    # Get file info
    echo "File Information:"
    stat "$LATEST" 2>/dev/null || stat -c "%n: size=%s, modified=%y" "$LATEST"
    echo ""
    
    # Get file type
    echo "File Type:"
    file "$LATEST"
    echo ""
    
    # Get file size
    SIZE=$(stat -f%z "$LATEST" 2>/dev/null || stat -c%s "$LATEST")
    echo "Size: $SIZE bytes"
    echo ""
    
    # Check if file is empty or very small
    if [ "$SIZE" -lt 100 ]; then
        echo "WARNING: File is suspiciously small!"
        echo "Full content (hex):"
        xxd "$LATEST"
        echo ""
        echo "Full content (text):"
        cat "$LATEST"
        echo ""
    else
        echo "File appears to have content. First 200 bytes (hex):"
        xxd -l 200 "$LATEST"
        echo ""
    fi
    
    # Check if it matches PDF/JPEG/PNG signatures
    echo "File Signature Check:"
    HEAD=$(xxd -l 4 -p "$LATEST")
    case "$HEAD" in
        25504446)
            echo "✓ Valid PDF signature detected (25 50 44 46 = %PDF)"
            ;;
        ffd8ffe0|ffd8ffe1|ffd8ffe2)
            echo "✓ Valid JPEG signature detected (ff d8 ff ...)"
            ;;
        89504e47)
            echo "✓ Valid PNG signature detected (89 50 4e 47 = PNG)"
            ;;
        58354f21|5835304f)
            echo "⚠ EICAR test file signature detected!"
            echo "This is the antivirus test file, not a real receipt!"
            ;;
        00000000)
            echo "✗ File contains only zeros - BLANK FILE!"
            ;;
        *)
            echo "? Unknown signature: $HEAD"
            ;;
    esac
    
    echo ""
    echo "=== Checking Database for This File ==="
    cd ~/fyp_system/backend
    node -p "
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'uploads/receipts', '$LATEST');
    const { DataSource } = require('typeorm');
    
    const AppDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fyp_db',
      entities: [path.join(__dirname, 'src/**/*.entity.{ts,js}')],
      synchronize: false,
    });
    
    (async () => {
      try {
        await AppDataSource.initialize();
        const claims = await AppDataSource.query(\`
          SELECT id, receipt_file_original_name, file_hash, amount_claimed, created_at
          FROM claims 
          WHERE receipt_file_path = \$1
        \`, [filePath]);
        
        if (claims.length > 0) {
          console.log('Database record found:');
          console.log('  ID:', claims[0].id);
          console.log('  Original Name:', claims[0].receipt_file_original_name);
          console.log('  File Hash:', claims[0].file_hash);
          console.log('  Amount:', claims[0].amount_claimed);
          console.log('  Created:', claims[0].created_at);
        } else {
          console.log('No database record found for this file!');
        }
        
        await AppDataSource.destroy();
      } catch (err) {
        console.error('Database error:', err.message);
      }
    })();
    " 2>/dev/null || echo "Could not query database"
    
ENDSSH
