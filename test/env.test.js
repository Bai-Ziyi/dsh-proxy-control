import test from 'node:test';
import assert from 'node:assert/strict';
import { rewrite } from '../lib/env.js';

const on = { enabled: true, url: 'http://proxy.example:8080', noProxy: '' };

test('adds both proxy lines to an empty file', () => {
  assert.equal(
    rewrite('', on),
    'HTTP_PROXY=http://proxy.example:8080\nHTTPS_PROXY=http://proxy.example:8080\n',
  );
});

test('preserves unrelated lines and order', () => {
  assert.equal(
    rewrite('EXAMPLE_KEY=test\nFOO=bar\n', on),
    'EXAMPLE_KEY=test\nFOO=bar\nHTTP_PROXY=http://proxy.example:8080\nHTTPS_PROXY=http://proxy.example:8080\n',
  );
});

test('replaces every proxy spelling, including lowercase and ALL_PROXY', () => {
  const before = [
    'http_proxy=http://old:1',
    'HTTPS_PROXY=http://old:2',
    'ALL_PROXY=socks5://old:3',
    'no_proxy=old.example',
    'KEEP=1',
  ].join('\n') + '\n';
  assert.equal(
    rewrite(before, { enabled: true, url: 'http://new.example:8080', noProxy: 'corp.example' }),
    'KEEP=1\nHTTP_PROXY=http://new.example:8080\nHTTPS_PROXY=http://new.example:8080\nNO_PROXY=corp.example\n',
  );
});

test('disabling removes proxy lines and keeps unrelated content', () => {
  const before = 'KEEP=1\nHTTP_PROXY=http://old:1\nNO_PROXY=old.example\n';
  assert.equal(rewrite(before, { enabled: false, url: '', noProxy: '' }), 'KEEP=1\n');
});

test('disabling an otherwise proxy-only file leaves it empty', () => {
  const before = 'HTTP_PROXY=http://old:1\nHTTPS_PROXY=http://old:2\n\n';
  assert.equal(rewrite(before, { enabled: false, url: '', noProxy: '' }), '');
});

test('handles CRLF input and trailing blank lines', () => {
  const before = 'KEEP=1\r\nHTTP_PROXY=http://old:1\r\n\r\n';
  assert.equal(rewrite(before, { enabled: false, url: '', noProxy: '' }), 'KEEP=1\n');
});

test('quotes are not invented for values', () => {
  assert.equal(
    rewrite('', { enabled: true, url: 'http://user:secret@proxy.example:8080', noProxy: '' }),
    'HTTP_PROXY=http://user:secret@proxy.example:8080\nHTTPS_PROXY=http://user:secret@proxy.example:8080\n',
  );
});
