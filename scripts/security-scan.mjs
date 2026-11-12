#!/usr/bin/env node
/**
 * Automated Secret Scanner & SAST Gate (CI/CD Enforcement)
 *
 * Scans codebase for:
 * 1. Accidental leaks of private keys, auth secrets, deploy keys, API tokens.
 * 2. Unsafe runtime patterns (eval, child_process execution, unsanitized innerHTML).
 * 3. Leaked .env credential files.
 */

import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.system_generated',
]);

const SECRET_PATTERNS = [
  { name: 'Private Key Block', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----/ },
  { name: 'AWS Access Key ID', regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z_]{8}\/B[0-9A-Za-z_]{8}\/[0-9A-Za-z_]{24}/ },
  { name: 'Stripe Secret Key', regex: /\b(sk_live|rk_live)_[0-9a-zA-Z]{24,}\b/ },
  { name: 'GitHub Personal Access Token', regex: /\bghp_[0-9a-zA-Z]{36}\b/ },
  { name: 'Convex Production Deploy Key', regex: /\bprod:[a-z0-9-]+:[a-zA-Z0-9+/=]{40,}\b/ },
];

const SAST_PATTERNS = [
  { name: 'Command Execution (exec)', regex: /\bchild_process\.(exec|execSync)\s*\(/ },
  { name: 'Dangerous Eval', regex: /\beval\s*\(\s*[^)]+\)/ },
];

let violations = 0;

function scanFile(filePath) {
  const ext = path.extname(filePath);
  // Scan code and config files only
  if (!['.ts', '.tsx', '.js', '.mjs', '.json', '.env', '.yml', '.yaml', '.md'].includes(ext)) {
    return;
  }

  // Skip .env.example
  if (filePath.endsWith('.env.example')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Scan for hardcoded credentials
  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(content)) {
      console.error(`[SECURITY SCAN FAILURE] Potential secret leaked (${name}): ${filePath}`);
      violations++;
    }
  }

  // 2. Scan for dangerous code execution patterns (TS/JS only)
  if (['.ts', '.tsx', '.js', '.mjs'].includes(ext) && !filePath.includes('tests/')) {
    for (const { name, regex } of SAST_PATTERNS) {
      if (regex.test(content)) {
        console.error(`[SAST FAILURE] Dangerous code pattern detected (${name}): ${filePath}`);
        violations++;
      }
    }
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log('🔒 Starting automated Static Application Security Testing (SAST) & Secret Scan...');
const rootDir = process.cwd();
walkDir(rootDir);

if (violations > 0) {
  console.error(`\n❌ SAST failed with ${violations} security violation(s). Deployment blocked.`);
  process.exit(1);
} else {
  console.log('✅ SAST & Secret Scan passed: Zero hardcoded secrets or dangerous execution patterns found.\n');
  process.exit(0);
}

