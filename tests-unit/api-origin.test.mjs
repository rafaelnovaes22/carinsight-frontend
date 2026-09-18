import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiOrigin } from '../api-origin.mjs';

test('public previews use the public API; local development remains local', () => {
  assert.equal(resolveApiOrigin('localhost'), 'http://localhost:3000');
  assert.equal(
    resolveApiOrigin('frontend-production.up.railway.app'),
    'https://backend-production-8159.up.railway.app',
  );
});

test('explicit same-origin or HTTPS configuration overrides the default', () => {
  assert.equal(resolveApiOrigin('example.com', '/api/'), '/api');
  assert.equal(
    resolveApiOrigin('example.com', 'https://api.example.com/'),
    'https://api.example.com',
  );
  assert.equal(
    resolveApiOrigin('example.com', 'http://unsafe.example.com'),
    'https://backend-production-8159.up.railway.app',
  );
  assert.equal(resolveApiOrigin('localhost', 'invalid origin'), 'http://localhost:3000');
  assert.equal(
    resolveApiOrigin('example.com', 'https://user:password@example.com'),
    'https://backend-production-8159.up.railway.app',
  );
});
