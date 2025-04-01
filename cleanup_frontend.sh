#!/bin/bash

# Create backup directory if it doesn't exist
mkdir -p .backup-frontend

# Move frontend-specific config files to backup
mv components.json eslint.config.js index.html next.config.js package.json package-lock.json postcss.config.js tailwind.config.js tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.js vite.config.ts vitest.config.ts dfx.json ./.backup-frontend/ 2>/dev/null

# Move frontend-specific directories to backup
mv app dist e2e node_modules playwright-report public src ./.backup-frontend/ 2>/dev/null

# Move netlify specific files to backup
mv _headers netlify.toml nginx.conf .netlify ./.backup-frontend/ 2>/dev/null

# Move Jest testing files to backup
mv jest.config.ts jest.setup.ts playwright.config.ts ./.backup-frontend/ 2>/dev/null

# Move Next.js specific files to backup
mv next-env.d.ts .next ./.backup-frontend/ 2>/dev/null

# Remove .htaccess if it exists
mv .htaccess ./.backup-frontend/ 2>/dev/null

# Keep important backend directories and files
echo "Keeping backend/, docs/, and deployment files"

# Update configuration files
mv .gitignore.new .gitignore
mv package.json.new package.json
mv dfx.json.new dfx.json

echo "Frontend code moved to .backup-frontend/"
echo "Repository now focuses on backend canister code only" 