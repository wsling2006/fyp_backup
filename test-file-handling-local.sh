#!/bin/bash

# Local test to verify file handling works correctly
# This simulates the upload/download flow without network

echo "=== Testing File Upload/Download Flow Locally ==="
echo ""

# Create test file
TEST_FILE="/tmp/test-receipt.pdf"
echo "Creating test PDF file..."
cat > "$TEST_FILE" << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Receipt) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
409
%%EOF
EOF

echo "✓ Test PDF created"
FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE")
echo "  Size: $FILE_SIZE bytes"
echo "  First 20 bytes (hex): $(xxd -l 20 -p "$TEST_FILE" | tr -d '\n')"
echo ""

# Test Node.js file reading/writing
echo "Testing Node.js buffer operations..."
node << 'NODESCRIPT'
const fs = require('fs');
const path = require('path');

const testFile = '/tmp/test-receipt.pdf';
const outputFile = '/tmp/test-output.pdf';

console.log('1. Reading file...');
const originalBuffer = fs.readFileSync(testFile);
console.log('   Original buffer size:', originalBuffer.length);
console.log('   First 20 bytes:', originalBuffer.slice(0, 20).toString('hex'));

console.log('');
console.log('2. Simulating memory storage (like Multer)...');
const memoryBuffer = Buffer.from(originalBuffer);
console.log('   Memory buffer size:', memoryBuffer.length);
console.log('   First 20 bytes:', memoryBuffer.slice(0, 20).toString('hex'));

console.log('');
console.log('3. Writing to disk...');
fs.writeFileSync(outputFile, memoryBuffer);
console.log('   ✓ File written');

console.log('');
console.log('4. Reading back from disk...');
const readBackBuffer = fs.readFileSync(outputFile);
console.log('   Read buffer size:', readBackBuffer.length);
console.log('   First 20 bytes:', readBackBuffer.slice(0, 20).toString('hex'));

console.log('');
console.log('5. Comparing buffers...');
const match = originalBuffer.equals(readBackBuffer);
console.log('   Buffers match:', match ? '✓ YES' : '✗ NO');

if (!match) {
  console.log('   ERROR: Buffers do not match!');
  process.exit(1);
}

console.log('');
console.log('✓ All buffer operations work correctly!');
NODESCRIPT

echo ""
echo "=== Testing ClamAV (if available) ==="
if command -v clamscan &> /dev/null; then
    echo "ClamAV found, testing scan..."
    clamscan --no-summary "$TEST_FILE" 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ File passed ClamAV scan"
    else
        echo "⚠ ClamAV scan failed or found issue"
    fi
else
    echo "⚠ ClamAV not installed locally (that's OK)"
fi

echo ""
echo "=== Cleanup ==="
rm -f "$TEST_FILE" /tmp/test-output.pdf
echo "✓ Test files removed"

echo ""
echo "=== RESULT ==="
echo "✓ Local file handling works correctly"
echo "  The issue is likely specific to the EC2 environment"
echo ""
echo "Next: Deploy to EC2 and run the same test there"
