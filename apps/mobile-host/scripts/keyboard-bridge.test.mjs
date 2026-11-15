import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectNeoAstraKeyboard } from '../keyboard-bridge.mjs';

test('reports the initial native inset, changes and dismissal; disconnect removes the listener', () => {
  const target = new EventTarget();
  let height = '328px';
  target.document = { documentElement: {} };
  target.getComputedStyle = () => ({ getPropertyValue: () => height });
  const values = [];
  const disconnect = connectNeoAstraKeyboard((value) => values.push(value), target);
  for (const value of ['365px', '0px', '', '-5px', 'Infinity']) {
    height = value;
    target.dispatchEvent(new Event('neoastrakeyboard'));
  }
  disconnect();
  height = '400px';
  target.dispatchEvent(new Event('neoastrakeyboard'));
  assert.deepEqual(values, [328, 365, 0, 0, 0, 0, 0]);
});
