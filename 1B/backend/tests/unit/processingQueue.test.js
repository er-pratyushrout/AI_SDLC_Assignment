import { describe, expect, it } from '@jest/globals';
import { ProcessingQueue } from '../../src/services/processingQueue.js';

describe('ProcessingQueue', () => {
  it('limits concurrent work and rejects work beyond its pending capacity', async () => {
    const queue = new ProcessingQueue({ concurrency: 1, maxPending: 1 });
    let releaseFirst;
    const firstStarted = new Promise((resolve) => {
      queue.enqueue(
        () =>
          new Promise((resolveFirst) => {
            releaseFirst = resolveFirst;
            resolve();
          }),
      );
    });
    await firstStarted;

    let finishSecond;
    const secondFinished = new Promise((resolve) => {
      finishSecond = resolve;
    });
    expect(queue.enqueue(() => finishSecond())).toBe(true);
    expect(queue.enqueue(() => Promise.resolve())).toBe(false);

    releaseFirst();
    await secondFinished;
  });
});
