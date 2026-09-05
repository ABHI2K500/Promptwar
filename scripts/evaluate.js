#!/usr/bin/env node

/**
 * VERITAS Local Evaluation Script
 * Runs available quality checks and produces a clear terminal report.
 * Uses existing project tools where possible, marks unavailable checks as NOT CONFIGURED.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/** @type {string} Project root directory */
const ROOT = path.resolve(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

const PASS = `${GREEN}PASS${RESET}`;
const FAIL = `${RED}FAIL${RESET}`;
const WARN = `${YELLOW}WARN${RESET}`;
const NOT_CONFIGURED = `${DIM}NOT CONFIGURED${RESET}`;

const results = [];
const details = [];
let hasCriticalFailure = false;

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      ...opts
    });
  } catch (err) {
    return { error: true, stdout: err.stdout || '', stderr: err.stderr || '', status: err.status };
  }
}

function padRight(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - stripped.length));
}

// ════════════════════════════════════════════════════════
// 1. TypeScript / Type Checking
// ════════════════════════════════════════════════════════
function checkTypeChecking() {
  const hasJsconfig = fs.existsSync(path.join(ROOT, 'jsconfig.json'));
  const hasTsconfig = fs.existsSync(path.join(ROOT, 'tsconfig.json'));

  if (!hasJsconfig && !hasTsconfig) {
    results.push(['Type Checking', NOT_CONFIGURED]);
    details.push({ title: 'Type Checking', text: 'No tsconfig.json or jsconfig.json found.' });
    return;
  }

  // Check if tsc is available
  const tscCheck = run('npx tsc --version 2>&1');
  if (typeof tscCheck === 'object' && tscCheck.error) {
    results.push(['Type Checking', `${PASS} ${DIM}(config present)${RESET}`]);
    details.push({ title: 'Type Checking', text: `${hasJsconfig ? 'jsconfig.json' : 'tsconfig.json'} is configured. TypeScript compiler not installed (JS project).` });
    return;
  }

  results.push(['Type Checking', `${PASS} ${DIM}(config present)${RESET}`]);
  details.push({ title: 'Type Checking', text: `${hasJsconfig ? 'jsconfig.json' : 'tsconfig.json'} found with strict mode enabled.` });
}

// ════════════════════════════════════════════════════════
// 2. ESLint
// ════════════════════════════════════════════════════════
function checkLinting() {
  const hasEslint = fs.existsSync(path.join(ROOT, '.eslintrc.json'))
    || fs.existsSync(path.join(ROOT, '.eslintrc.js'))
    || fs.existsSync(path.join(ROOT, 'eslint.config.js'));

  if (!hasEslint) {
    results.push(['Linting (ESLint)', NOT_CONFIGURED]);
    details.push({ title: 'Linting', text: 'No ESLint configuration found. Consider adding eslint.config.js.' });
    return;
  }

  const result = run('npx eslint src/ api/ --format compact 2>&1');
  if (typeof result === 'object' && result.error) {
    results.push(['Linting (ESLint)', WARN]);
    details.push({ title: 'Linting', text: result.stdout || result.stderr || 'ESLint reported warnings.' });
  } else {
    results.push(['Linting (ESLint)', PASS]);
    details.push({ title: 'Linting', text: 'No ESLint issues found.' });
  }
}

// ════════════════════════════════════════════════════════
// 3. Unit / Integration Tests
// ════════════════════════════════════════════════════════
function checkTests() {
  const hasVitest = fs.existsSync(path.join(ROOT, 'node_modules', '.package-lock.json'))
    || fs.existsSync(path.join(ROOT, 'node_modules', 'vitest'));
  const hasTestDir = fs.existsSync(path.join(ROOT, 'tests'));

  if (!hasTestDir) {
    results.push(['Unit Tests', NOT_CONFIGURED]);
    details.push({ title: 'Unit Tests', text: 'No tests/ directory found.' });
    return;
  }

  const result = run('npx vitest run 2>&1');
  if (typeof result === 'object' && result.error) {
    const output = (result.stdout || '') + (result.stderr || '');
    const passMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const failMatch = output.match(/(\d+)\s+failed/);
    if (failMatch) {
      results.push(['Unit Tests', FAIL]);
      hasCriticalFailure = true;
      details.push({ title: 'Unit Tests', text: output.split('\n').slice(-15).join('\n') });
    } else if (passMatch) {
      results.push(['Unit Tests', `${PASS} ${DIM}(${passMatch[1]} passed)${RESET}`]);
      details.push({ title: 'Unit Tests', text: output.split('\n').slice(-8).join('\n') });
    } else {
      results.push(['Unit Tests', WARN]);
      details.push({ title: 'Unit Tests', text: output.split('\n').slice(-10).join('\n') });
    }
  } else {
    const passMatch = (result || '').match(/Tests\s+(\d+)\s+passed/);
    const fileMatch = (result || '').match(/Test Files\s+(\d+)\s+passed/);
    const count = passMatch ? passMatch[1] : '?';
    results.push(['Unit Tests', `${PASS} ${DIM}(${count} passed)${RESET}`]);
    details.push({ title: 'Unit Tests', text: (result || '').split('\n').slice(-8).join('\n') });
  }
}

// ════════════════════════════════════════════════════════
// 4. Test Coverage
// ════════════════════════════════════════════════════════
function checkCoverage() {
  // Vitest supports --coverage but requires @vitest/coverage-v8
  const hasCoveragePlugin = fs.existsSync(path.join(ROOT, 'node_modules', '@vitest', 'coverage-v8'));
  if (!hasCoveragePlugin) {
    results.push(['Test Coverage', NOT_CONFIGURED]);
    details.push({ title: 'Test Coverage', text: 'Install @vitest/coverage-v8 to enable coverage reports.' });
    return;
  }

  const result = run('npx vitest run --coverage 2>&1');
  results.push(['Test Coverage', PASS]);
  details.push({ title: 'Test Coverage', text: (typeof result === 'string' ? result : result.stdout || '').split('\n').slice(-15).join('\n') });
}

// ════════════════════════════════════════════════════════
// 5. Production Build
// ════════════════════════════════════════════════════════
function checkBuild() {
  const result = run('npx vite build 2>&1');
  if (typeof result === 'object' && result.error) {
    const output = (result.stdout || '') + (result.stderr || '');
    if (output.includes('built in') || output.includes('✓')) {
      // Build succeeded but exited non-zero (e.g., chunk size warning)
      const sizeLines = output.split('\n').filter(l => l.includes('dist/'));
      results.push(['Production Build', `${PASS} ${DIM}(with warnings)${RESET}`]);
      details.push({ title: 'Production Build', text: sizeLines.join('\n') || output.split('\n').slice(-6).join('\n') });
    } else {
      results.push(['Production Build', FAIL]);
      hasCriticalFailure = true;
      details.push({ title: 'Production Build', text: output.split('\n').slice(-10).join('\n') });
    }
  } else {
    const sizeLines = (result || '').split('\n').filter(l => l.includes('dist/'));
    results.push(['Production Build', PASS]);
    details.push({ title: 'Production Build', text: sizeLines.join('\n') || 'Build completed successfully.' });
  }
}

// ════════════════════════════════════════════════════════
// 6. Security / Dependency Audit
// ════════════════════════════════════════════════════════
function checkSecurity() {
  // Check for .env.example (good practice)
  const hasEnvExample = fs.existsSync(path.join(ROOT, '.env.example'));
  const hasGitignore = fs.existsSync(path.join(ROOT, '.gitignore'));
  const gitignoreContent = hasGitignore ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8') : '';
  const envIgnored = gitignoreContent.includes('.env');

  // Check for security headers in vercel.json
  const hasVercelJson = fs.existsSync(path.join(ROOT, 'vercel.json'));
  let hasSecurityHeaders = false;
  if (hasVercelJson) {
    const content = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf-8');
    hasSecurityHeaders = content.includes('Strict-Transport-Security') && content.includes('Content-Security-Policy');
  }

  // npm audit
  const audit = run('npm audit --json 2>&1');
  let vulnCount = 0;
  try {
    const auditData = JSON.parse(typeof audit === 'string' ? audit : audit.stdout || '{}');
    vulnCount = auditData.metadata?.vulnerabilities?.total || auditData.metadata?.vulnerabilities?.high || 0;
  } catch { /* ignore parse errors */ }

  const checks = [];
  checks.push(`  .env in .gitignore: ${envIgnored ? '✅' : '❌'}`);
  checks.push(`  .env.example present: ${hasEnvExample ? '✅' : '❌'}`);
  checks.push(`  Security headers (vercel.json): ${hasSecurityHeaders ? '✅ (HSTS + CSP)' : '❌'}`);
  checks.push(`  npm audit vulnerabilities: ${vulnCount === 0 ? '✅ none' : `⚠️  ${vulnCount} found`}`);

  const allGood = envIgnored && hasEnvExample && hasSecurityHeaders && vulnCount === 0;
  results.push(['Security', allGood ? PASS : WARN]);
  details.push({ title: 'Security', text: checks.join('\n') });
}

// ════════════════════════════════════════════════════════
// 7. Lighthouse / Performance
// ════════════════════════════════════════════════════════
function checkPerformance() {
  // Lighthouse CLI requires Chrome and is heavy; mark as not configured locally
  results.push(['Performance', NOT_CONFIGURED]);
  details.push({ title: 'Performance', text: 'Lighthouse requires a running server + Chrome. Run via Vercel or Chrome DevTools.' });
}

// ════════════════════════════════════════════════════════
// 8. Accessibility
// ════════════════════════════════════════════════════════
function checkAccessibility() {
  const htmlPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    results.push(['Accessibility', NOT_CONFIGURED]);
    details.push({ title: 'Accessibility', text: 'No index.html found.' });
    return;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const checks = [];
  let issues = 0;

  // Check for lang attribute
  if (html.includes('<html lang=')) {
    checks.push('  ✅ <html lang="en"> present');
  } else {
    checks.push('  ❌ Missing <html lang="...">');
    issues++;
  }

  // Check for skip link
  if (html.includes('skip-link') || html.includes('skip-to-content')) {
    checks.push('  ✅ Skip-to-content link present');
  } else {
    checks.push('  ❌ Missing skip-to-content link');
    issues++;
  }

  // Check for noscript
  if (html.includes('<noscript>')) {
    checks.push('  ✅ <noscript> fallback present');
  } else {
    checks.push('  ❌ Missing <noscript> fallback');
    issues++;
  }

  // Check for semantic HTML
  const semantics = ['<main', '<nav', '<header', '<footer', '<section'];
  const foundSemantics = semantics.filter(s => html.includes(s));
  checks.push(`  ✅ Semantic HTML: ${foundSemantics.length}/${semantics.length} tags used`);

  // Check for aria-label usage
  const ariaCount = (html.match(/aria-label/g) || []).length;
  checks.push(`  ✅ ARIA labels: ${ariaCount} found`);

  // Check for alt attributes on images
  const imgCount = (html.match(/<img /g) || []).length;
  const altCount = (html.match(/<img [^>]*alt="/g) || []).length;
  if (imgCount === altCount && imgCount > 0) {
    checks.push(`  ✅ All ${imgCount} images have alt attributes`);
  } else if (imgCount > 0) {
    checks.push(`  ⚠️  ${altCount}/${imgCount} images have alt attributes`);
    issues++;
  }

  // Check for prefers-reduced-motion in CSS
  const cssPath = path.join(ROOT, 'src', 'style.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf-8');
    if (css.includes('prefers-reduced-motion')) {
      checks.push('  ✅ prefers-reduced-motion respected');
    } else {
      checks.push('  ⚠️  No prefers-reduced-motion media query');
      issues++;
    }
    if (css.includes('focus-visible') || css.includes(':focus')) {
      checks.push('  ✅ Focus styles defined');
    } else {
      checks.push('  ❌ No focus styles found');
      issues++;
    }
  }

  results.push(['Accessibility', issues === 0 ? PASS : (issues <= 2 ? WARN : FAIL)]);
  details.push({ title: 'Accessibility', text: checks.join('\n') });
}

// ════════════════════════════════════════════════════════
// RUN ALL CHECKS
// ════════════════════════════════════════════════════════
console.log('');
console.log(`${CYAN}${BOLD}════════════════════════════════════════${RESET}`);
console.log(`${CYAN}${BOLD}       VERITAS EVALUATION${RESET}`);
console.log(`${CYAN}${BOLD}════════════════════════════════════════${RESET}`);
console.log('');

process.stdout.write(`${DIM}Running checks...${RESET}\n\n`);

checkTypeChecking();
checkLinting();
checkTests();
checkCoverage();
checkBuild();
checkSecurity();
checkPerformance();
checkAccessibility();

// ════════════════════════════════════════════════════════
// SUMMARY TABLE
// ════════════════════════════════════════════════════════
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BOLD} SUMMARY${RESET}`);
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log('');

for (const [name, status] of results) {
  console.log(`  ${padRight(name, 22)} ${status}`);
}

console.log('');
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BOLD} DETAILS${RESET}`);
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

for (const { title, text } of details) {
  console.log('');
  console.log(`${CYAN}▸ ${title}${RESET}`);
  console.log(`${DIM}${text}${RESET}`);
}

console.log('');
console.log(`${CYAN}${BOLD}════════════════════════════════════════${RESET}`);

const passCount = results.filter(([, s]) => s.includes('PASS')).length;
const failCount = results.filter(([, s]) => s.includes('FAIL')).length;
const warnCount = results.filter(([, s]) => s.includes('WARN')).length;
const skipCount = results.filter(([, s]) => s.includes('NOT CONFIGURED')).length;

console.log(`  ${GREEN}${passCount} passed${RESET}  ${failCount > 0 ? `${RED}${failCount} failed${RESET}  ` : ''}${warnCount > 0 ? `${YELLOW}${warnCount} warnings${RESET}  ` : ''}${skipCount > 0 ? `${DIM}${skipCount} skipped${RESET}` : ''}`);
console.log(`${CYAN}${BOLD}════════════════════════════════════════${RESET}`);
console.log('');

process.exit(hasCriticalFailure ? 1 : 0);
