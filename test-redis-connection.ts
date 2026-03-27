// test-redis-connection.ts
import { createClient } from 'redis';

async function testRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  await client.set('test-key', 'hello-redis');
  const value = await client.get('test-key');
  console.log('Redis test value:', value);
  await client.quit();
}

testRedis().catch(console.error);
