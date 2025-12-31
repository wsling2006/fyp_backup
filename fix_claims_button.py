#!/usr/bin/env python3
"""Replace the claims span with a download button"""

import re

# Read the file
with open('frontend/app/purchase-requests/page.tsx', 'r') as f:
    content = f.read()

# Define the old text (exact match with proper indentation)
old_pattern = r'''                      \{request\.claims\.length > 0 && \(
                        <span className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg text-center">
                          \{request\.claims\.length\} Claim\(s\)
                        </span>
                      \)\}'''

# Define the new button code
new_code = '''                      {request.claims.length > 0 && (
                        <button
                          onClick={() => {
                            console.log('[CLAIMS BUTTON CLICKED]', request.claims);
                            if (request.claims.length === 1) {
                              const claim = request.claims[0];
                              const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/purchase-requests/claims/${claim.id}/download`;
                              window.open(downloadUrl, '_blank');
                            } else {
                              setSelectedRequest(request);
                              setShowViewClaimsModal(true);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap font-bold"
                          title={request.claims.length === 1 ? "Click to download receipt" : "Click to view all claims"}
                        >
                          DOWNLOAD {request.claims.length} CLAIM(S)
                        </button>
                      )}'''

# Try to replace using regex
new_content = re.sub(old_pattern, new_code, content)

if new_content != content:
    # Write the updated content
    with open('frontend/app/purchase-requests/page.tsx', 'w') as f:
        f.write(new_content)
    print("✓ Successfully replaced span with button!")
else:
    print("✗ Pattern not found. Trying alternate method...")
    
    # Try line-by-line replacement
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'Claim(s)' in line:
            print(f"Found at line {i+1}")
            # Show context
            start = max(0, i-3)
            end = min(len(lines), i+4)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}")
