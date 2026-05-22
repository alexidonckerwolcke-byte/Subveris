// server/cache.ts
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export class CacheService {
  client;
  constructor() {
    this.client = createClient({ url: redisUrl });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.connect();
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds = 3600) {
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async getOrSet(key: string, fetcher: () => Promise<string>, ttlSeconds = 3600) {
    let value = await this.get(key);
    if (value) return value;
    value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
