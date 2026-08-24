export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: { rejectUnauthorized: boolean };
  maxRetriesPerRequest: null;
}

export function getRedisOptions(): RedisConnectionOptions {
  const redisUrl = process.env.REDIS_URL || process.env.REDISURL;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // fallback if URL parsing fails
    }
  }

  const host = process.env.REDIS_HOST || process.env.REDISHOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined;
  const username = process.env.REDIS_USER || process.env.REDISUSER || process.env.REDIS_USERNAME || undefined;

  return {
    host,
    port,
    username,
    password,
    maxRetriesPerRequest: null,
  };
}
