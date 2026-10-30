import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatZAR, slugify } from '../../src/lib/format.ts';
import { toInternationalZA, waLink } from '../../src/lib/whatsapp.ts';
import { toCsv } from '../../src/lib/exports.ts';

test('formats rand amounts', () => {
  assert.equal(formatZAR(12500), 'R 12 500');
  assert.equal(formatZAR('1999.5'), 'R 1 999.50');
  assert.equal(formatZAR(null), '—');
});

test('converts South African numbers for WhatsApp links', () => {
  assert.equal(toInternationalZA('064 856 7019'), '27648567019');
  assert.equal(toInternationalZA('+27 64 856 7019'), '27648567019');
  assert.equal(toInternationalZA('abc'), null);
  assert.equal(waLink('27648567019', 'Hi & bye'), 'https://wa.me/27648567019?text=Hi%20%26%20bye');
});

test('slugs are URL-safe', () => {
  assert.equal(slugify('Fender Stratocaster — "Player" (2019)!'), 'fender-stratocaster-player-2019');
  assert.equal(slugify('Ibanez GIO GRX40'), 'ibanez-gio-grx40');
});

test('CSV export escapes quotes and blocks spreadsheet formula injection', () => {
  const csv = toCsv([{ name: '=HYPERLINK("http://evil")', note: 'a, "b"', n: 5 }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`));
  assert.ok(csv.includes('"a, ""b"""'));
});
