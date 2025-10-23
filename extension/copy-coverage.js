#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to copy Jest coverage report to Docusaurus static folder
 * This ensures the coverage report is accessible via the documentation site
 */

const sourceDir = path.join(__dirname, 'coverage');
const targetDir = path.join(__dirname, '..', 'documentation', 'static', 'test-coverage');

function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all items in source directory
  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  try {
    // Check if coverage directory exists
    if (!fs.existsSync(sourceDir)) {
      console.error('❌ Coverage directory not found. Please run tests first with: npm test');
      process.exit(1);
    }

    // Remove existing target directory if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Copy coverage report to documentation static folder
    copyDirectory(sourceDir, targetDir);
    
    console.log('✅ Coverage report copied to documentation/static/test-coverage/');
    console.log('📊 Coverage report will be available at: /test-coverage/index.html');
    
  } catch (error) {
    console.error('❌ Error copying coverage report:', error.message);
    process.exit(1);
  }
}

main();
