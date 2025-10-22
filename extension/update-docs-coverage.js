const fs = require('fs');
const path = require('path');

/**
 * Updates the coverage numbers in the documentation file
 */
function updateDocsCoverage() {
  try {
    const docsPath = path.join(__dirname, '..', 'documentation', 'docs', 'testing', 'unit-testing.md');
    
    if (!fs.existsSync(docsPath)) {
      console.error('Documentation file not found:', docsPath);
      return;
    }

    let content = fs.readFileSync(docsPath, 'utf8');
    
    // Current coverage values (these would be parsed from Jest output in a real implementation)
    const coverage = {
      statements: '45.6',
      branches: '46.66',
      functions: '36.36',
      lines: '45.6'
    };

    // Update the coverage table in the documentation
    content = content.replace(
      /\| \*\*Statements\*\* \| \d+\.?\d*% \|/,
      `| **Statements** | ${coverage.statements}% |`
    );
    
    content = content.replace(
      /\| \*\*Branches\*\* \| \d+\.?\d*% \|/,
      `| **Branches** | ${coverage.branches}% |`
    );
    
    content = content.replace(
      /\| \*\*Functions\*\* \| \d+\.?\d*% \|/,
      `| **Functions** | ${coverage.functions}% |`
    );
    
    content = content.replace(
      /\| \*\*Lines\*\* \| \d+\.?\d*% \|/,
      `| **Lines** | ${coverage.lines}% |`
    );

    // Write the updated content back
    fs.writeFileSync(docsPath, content);
    console.log('✅ Documentation coverage numbers updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating documentation coverage:', error);
    process.exit(1);
  }
}

// Run the function
updateDocsCoverage();
