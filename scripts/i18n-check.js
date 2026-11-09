#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const localesDir = path.resolve('src/locales');
const languages = ['en', 'hi', 'te'];
const namespaces = [
  'common',
  'landing',
  'cases',
  'documents',
  'purchases',
  'help',
  'reminders',
  'privacy',
];

console.log('===========================================================');
console.log('STARTING I18N PARITY & TRANSLATION COVERAGE AUDIT');
console.log('===========================================================\n');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

let hasDiscrepancy = false;
let totalKeysAudited = 0;

for (const ns of namespaces) {
  const enFile = path.join(localesDir, 'en', `${ns}.json`);
  if (!fs.existsSync(enFile)) {
    console.error(`❌ Missing base English file: ${enFile}`);
    hasDiscrepancy = true;
    continue;
  }

  const enJson = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const enKeys = getKeys(enJson);
  totalKeysAudited += enKeys.length;

  for (const lang of ['hi', 'te']) {
    const langFile = path.join(localesDir, lang, `${ns}.json`);
    if (!fs.existsSync(langFile)) {
      console.error(`❌ Missing ${lang.toUpperCase()} locale file: ${langFile}`);
      hasDiscrepancy = true;
      continue;
    }

    const langJson = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    const langKeys = new Set(getKeys(langJson));

    const missing = enKeys.filter((k) => !langKeys.has(k));
    if (missing.length > 0) {
      console.error(`❌ [${lang.toUpperCase()} / ${ns}] Missing ${missing.length} keys:`);
      missing.forEach((k) => console.error(`     - ${k}`));
      hasDiscrepancy = true;
    } else {
      console.log(`✓ [${lang.toUpperCase()} / ${ns}] All ${enKeys.length} keys verified 100%`);
    }
  }
}

console.log('\n===========================================================');
if (hasDiscrepancy) {
  console.error('FAIL: i18n parity check found missing keys across locales.');
  process.exit(1);
} else {
  console.log(`PASS: 100% parity across EN, HI, and TE! (${totalKeysAudited} total keys audited)`);
  process.exit(0);
}

