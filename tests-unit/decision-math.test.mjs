import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalNumber, monthlyExpenses, budgetReason } from '../discovery/decision-math.js';

test('unknown expenses remain unknown, while an explicit zero is respected', () => {
  assert.equal(optionalNumber(''), null);
  assert.equal(optionalNumber('0'), 0);
  assert.equal(optionalNumber('6,25'), 6.25);
  assert.equal(optionalNumber('-2'), null);
  const result = monthlyExpenses({
    distance: null,
    efficiency: null,
    fuelPrice: null,
    insurance: null,
    tax: null,
    maintenance: null,
  });
  assert.equal(result.subtotal, null);
  assert.equal(result.missing.length, 4);
});

test('monthly subtotal combines only informed costs and lists omissions', () => {
  const result = monthlyExpenses({
    distance: 1200,
    efficiency: 12,
    fuelPrice: 6,
    insurance: 2400,
    tax: 0,
    maintenance: null,
  });
  assert.equal(result.fuel, 600);
  assert.equal(result.subtotal, 800);
  assert.deepEqual(result.missing, ['Manutenção']);
});

test('zero consumption cannot create an infinite or invented fuel cost', () => {
  const result = monthlyExpenses({
    distance: 1200,
    efficiency: 0,
    fuelPrice: 6,
    insurance: null,
    tax: null,
    maintenance: null,
  });
  assert.equal(result.fuel, null);
  assert.equal(result.subtotal, null);
});

test('budget explanation uses the supplied values without promising an offer', () => {
  assert.match(budgetReason(81000, 80000), /acima do seu limite/);
  assert.match(budgetReason(79000, 80000), /abaixo do seu limite/);
  assert.match(budgetReason(79000, null), /Informe seu limite/);
});
