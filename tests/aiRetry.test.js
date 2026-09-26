import test from 'node:test';
import assert from 'node:assert/strict';
import { retryTransientAiRequest } from '../src/utils/aiRetry.js';

test('retries temporary AI overloads with bounded backoff', async () => {
  let attempts = 0;
  const waits = [];
  const result = await retryTransientAiRequest(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('AI_FETCH_ERROR [500] model experiencing high demand');
    return 'complete';
  }, async (milliseconds) => waits.push(milliseconds));

  assert.equal(result, 'complete');
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [1000, 2000]);
});

test('does not retry permanent AI errors', async () => {
  let attempts = 0;
  const failure = new Error('Invalid API key');

  await assert.rejects(retryTransientAiRequest(async () => {
    attempts += 1;
    throw failure;
  }, async () => {}), failure);

  assert.equal(attempts, 1);
});