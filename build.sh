#!/bin/bash
set -e

# Install dependencies
pnpm install

# Build Next.js
pnpm exec next build

# Copy static files to standalone directory
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# Copy public directory (logos, etc.) to standalone directory
cp -r public .next/standalone/ 2>/dev/null || true

# Create start.js in standalone directory
cat > .next/standalone/start.js << 'ENDJS'
// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        process.env[key] = value;
      }
    }
  });
}
process.env.NODE_ENV = 'production';
require('./server.js');
ENDJS

echo "Build completed successfully"
echo "Note: Set environment variables on your deployment platform or create .env.local in the standalone directory."
