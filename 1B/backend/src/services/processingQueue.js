export class ProcessingQueue {
  #active = 0;
  #pending = [];

  constructor({ concurrency = 2, maxPending = 4 } = {}) {
    this.concurrency = concurrency;
    this.maxPending = maxPending;
  }

  enqueue(task) {
    if (this.#pending.length >= this.maxPending && this.#active >= this.concurrency) {
      return false;
    }

    this.#pending.push(task);
    this.#runNext();
    return true;
  }

  #runNext() {
    while (this.#active < this.concurrency && this.#pending.length > 0) {
      const task = this.#pending.shift();
      this.#active += 1;
      Promise.resolve()
        .then(task)
        .catch((error) => {
          console.error('Uncaught document processing task error', {
            errorName: error?.name ?? 'Error',
          });
        })
        .finally(() => {
          this.#active -= 1;
          this.#runNext();
        });
    }
  }
}

const processingQueue = new ProcessingQueue();

export default processingQueue;
