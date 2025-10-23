const fs = require('fs');
const path = require('path');

/**
 * Generates a coverage summary Markdown snippet from Jest's coverage-summary.json
 * and writes it to the docs folder for import into MDX.
 */
function generateCoverageSummary() {
  const coverageJsonPath = path.join(__dirname, 'coverage', 'coverage-summary.json');
  try {
    if (!fs.existsSync(coverageJsonPath)) {
      console.warn('coverage-summary.json not found at:', coverageJsonPath);
      return `> Coverage data not found. Run tests with coverage to populate this report.`;
    }

    const data = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
    const total = data.total || {};

    const pct = (n) => (typeof n === 'number' ? n.toFixed(2) : '0.00');

    const summary = {
      statements: pct(total.statements?.pct),
      branches: pct(total.branches?.pct),
      functions: pct(total.functions?.pct),
      lines: pct(total.lines?.pct),
    };

    const markdown = `## Test Coverage Report

This coverage report is automatically generated on every pull request against main with passing tests in our GitHub Actions CI/CD Pipeline.

### Overall Coverage Summary

| Metric | Coverage |
|--------|----------|
| **Statements** | ${summary.statements}% |
| **Branches** | ${summary.branches}% |
| **Functions** | ${summary.functions}% |
| **Lines** | ${summary.lines}% |

### Coverage Details

The detailed coverage report shows which parts of the code are tested and which need more test coverage. This helps ensure code quality and reliability.

> Note: This report updates automatically when CI runs tests with coverage.`;

    return markdown;
  } catch (error) {
    console.error('Error generating coverage summary:', error);
    return null;
  }
}

// Run the function and output the result
const markdown = generateCoverageSummary();
const outputDir = path.join(__dirname, '..', 'documentation', 'docs', 'testing', '_generated');
const outputPath = path.join(outputDir, 'coverage-summary.md');

try {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (markdown) {
    fs.writeFileSync(outputPath, markdown);
    console.log('Coverage summary written to:', outputPath);
  } else {
    // Preserve existing file if generation failed; write a placeholder if none exists
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, '> Coverage summary generation failed.');
    }
    console.error('Failed to generate coverage summary');
    process.exit(1);
  }
} catch (err) {
  console.error('Error writing coverage summary:', err);
  process.exit(1);
}
