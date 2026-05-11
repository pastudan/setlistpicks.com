import Redis from 'ioredis';

// In production, point REDIS_URL at your Upstash / Fly Redis instance.
// In dev, defaults to redis://127.0.0.1:6379. Set REDIS_URL=memory:// for an
// in-process fallback when you don't want to run Redis locally.
const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function makeMemoryClient() {
  // Tiny in-memory fallback that implements just the commands we use.
  // Not a full Redis. Useful for `npm run dev` without Docker.
  const store = new Map();
  const ttls = new Map();
  const isAlive = (k) => {
    const exp = ttls.get(k);
    if (exp && exp < Date.now()) {
      store.delete(k);
      ttls.delete(k);
      return false;
    }
    return store.has(k);
  };
  return {
    isMemory: true,
    async get(k) {
      return isAlive(k) ? store.get(k) : null;
    },
    async set(k, v) {
      store.set(k, v);
      ttls.delete(k);
      return 'OK';
    },
    async del(k) {
      const had = store.delete(k);
      ttls.delete(k);
      return had ? 1 : 0;
    },
    async expire(k, seconds) {
      if (!store.has(k)) return 0;
      ttls.set(k, Date.now() + seconds * 1000);
      return 1;
    },
    async hset(k, ...args) {
      if (!isAlive(k)) store.set(k, new Map());
      const h = store.get(k);
      let n = 0;
      // hset key field value [field value ...] OR hset key {field: value}
      if (args.length === 1 && typeof args[0] === 'object') {
        for (const [f, v] of Object.entries(args[0])) {
          if (!h.has(f)) n++;
          h.set(f, String(v));
        }
      } else {
        for (let i = 0; i < args.length; i += 2) {
          if (!h.has(args[i])) n++;
          h.set(args[i], String(args[i + 1]));
        }
      }
      return n;
    },
    async hget(k, f) {
      if (!isAlive(k)) return null;
      return store.get(k).get(f) ?? null;
    },
    async hgetall(k) {
      if (!isAlive(k)) return {};
      return Object.fromEntries(store.get(k));
    },
    async hdel(k, ...fields) {
      if (!isAlive(k)) return 0;
      const h = store.get(k);
      let n = 0;
      for (const f of fields) if (h.delete(f)) n++;
      return n;
    },
    async ping() {
      return 'PONG';
    },
    on() {},
    quit() {},
  };
}

let client;
if (url === 'memory://') {
  client = makeMemoryClient();
  console.log('[redis] using in-memory fallback');
} else {
  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  client.on('error', (e) => console.error('[redis] error:', e.message));
  client.on('connect', () => console.log('[redis] connected to', url.replace(/\/\/.*@/, '//***@')));
}

export const redis = client;

// Keys live ~3 months. Every read/write refreshes the TTL so active groups
// stay hot and inactive groups age out naturally (combined with Redis
// `allkeys-lru` eviction policy in fly.toml).
export const GROUP_TTL_SECONDS = 60 * 60 * 24 * 90;

export async function touchTTL(...keys) {
  await Promise.all(keys.map((k) => client.expire(k, GROUP_TTL_SECONDS)));
}
