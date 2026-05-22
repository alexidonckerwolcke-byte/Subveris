#!/usr/bin/env node
const { createClient } = require('redis');
(async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis error', err));
  await client.connect();
  try {
    const patterns = ['metrics:*', 'subscriptions:*'];
    let totalDeleted = 0;
    for (const pattern of patterns) {
      console.log('Scanning for keys matching', pattern);
      for await (const key of client.scanIterator({ MATCH: pattern })) {
        await client.del(key);
        totalDeleted += 1;
      }
    }
    console.log('Deleted keys:', totalDeleted);
  } catch (err) {
    console.error('Error clearing cache', err);
    process.exitCode = 2;
  } finally {
    await client.disconnect();
  }
})();
