const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URI || 'redis://localhost:6379'
});

client.on('error', (err) => {
  // Gracefully handle redis connection errors without crashing the app
  console.log('Redis Client Error. Caching will be bypassed.', err.message);
});

let isConnected = false;

async function connectRedis() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log('Redis connected successfully');
    } catch (e) {
      console.log('Failed to connect to Redis. Running in degrade mode (no cache).');
    }
  }
}

async function getCachedData(key) {
  if (!isConnected) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}

async function setCachedData(key, value, expirySeconds = 300) {
  if (!isConnected) return;
  try {
    await client.setEx(key, expirySeconds, JSON.stringify(value));
  } catch (err) {
    // Ignore cache set errors
  }
}

async function invalidateCachePattern(pattern) {
  if (!isConnected) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    // Ignore
  }
}

module.exports = { client, connectRedis, getCachedData, setCachedData, invalidateCachePattern };
