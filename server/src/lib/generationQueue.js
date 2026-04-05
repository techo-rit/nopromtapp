/**
 * FIFO generation queue for system-initiated (carousel) try-on generations.
 * - Max 2 concurrent generations
 * - Max 20 auto-generations per user per day
 */

const MAX_CONCURRENT = 2;
const MAX_DAILY_PER_USER = 20;

let activeCount = 0;
const queue = []; // { fn, resolve, reject }
const dailyCounts = new Map(); // userId -> { count, resetAt }

function getDailyKey(userId) {
  return userId;
}

function getDailyCount(userId) {
  const key = getDailyKey(userId);
  const entry = dailyCounts.get(key);
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) {
    dailyCounts.delete(key);
    return 0;
  }
  return entry.count;
}

function incrementDailyCount(userId) {
  const key = getDailyKey(userId);
  const entry = dailyCounts.get(key);
  const now = Date.now();
  if (!entry || now > entry.resetAt) {
    // Reset at midnight UTC
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    dailyCounts.set(key, { count: 1, resetAt: tomorrow.getTime() });
  } else {
    entry.count++;
  }
}

function canGenerate(userId) {
  return getDailyCount(userId) < MAX_DAILY_PER_USER;
}

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const { fn, resolve, reject } = queue.shift();
    activeCount++;
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount--;
        processQueue();
      });
  }
}

/**
 * Enqueue a generation task.
 * @param {string} userId - User requesting the generation
 * @param {() => Promise<any>} generationFn - Async function that performs the generation
 * @returns {Promise<any>} Result of generationFn
 * @throws If daily cap is exceeded or generation fails
 */
export function enqueueGeneration(userId, generationFn) {
  if (!canGenerate(userId)) {
    return Promise.reject(new Error('Daily auto-generation limit reached (20/day)'));
  }

  incrementDailyCount(userId);

  return new Promise((resolve, reject) => {
    queue.push({ fn: generationFn, resolve, reject });
    processQueue();
  });
}

export function getQueueStats() {
  return {
    activeCount,
    queueLength: queue.length,
    maxConcurrent: MAX_CONCURRENT,
  };
}
