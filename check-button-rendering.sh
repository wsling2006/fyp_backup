#!/bin/bash

# Quick diagnostic - Check if button is rendering

echo "========================================" echo "🔍 CHECKING CLAIMS BUTTON RENDERING"
echo "========================================"
echo ""

echo "Open your browser and:"
echo "1. Press F12 (open DevTools)"
echo "2. Go to Console tab"
echo "3. Look for these messages:"
echo ""
echo "[DEBUG] Request X: {hasClaims: ..., claimsCount: ..., claimsData: ...}"
echo ""
echo "Share the output with me."
echo ""
echo "Also, try this:"
echo "1. Right-click on the '1 Claim(s)' text"
echo "2. Select 'Inspect Element'"
echo "3. Check if it's a <button> or <span> element"
echo ""
echo "If it's a <span>, the button didn't render."
echo "If it's a <button>, try clicking it and check console for [BUTTON CLICKED] message."
echo ""
