#!/bin/bash
# GitHub руу push хийх — энийг та терминалаас ажиллуулна.
# Нэг удаа: chmod +x scripts/push-to-github.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Remote шалгаж байна ==="
git remote -v

echo ""
echo "=== main салбарыг GitHub руу түлхэж байна ==="
echo "Username асуувал: grafxlkhagva"
echo "Password асуувал: Personal Access Token оруулна (https://github.com/settings/tokens)"
echo ""
git push -u origin main

echo ""
echo "✓ Амжилттай."
