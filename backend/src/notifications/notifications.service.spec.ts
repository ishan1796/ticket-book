import { getRedisOptions } from './redis.config';
import { NotificationsService } from './notifications.service';

describe('Redis Configuration', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it('should parse REDIS_URL correctly', () => {
    process.env.REDIS_URL = 'redis://default:secret123@redis.railway.internal:6379';
    const opts = getRedisOptions();
    expect(opts.host).toBe('redis.railway.internal');
    expect(opts.port).toBe(6379);
    expect(opts.password).toBe('secret123');
    expect(opts.username).toBe('default');
    expect(opts.maxRetriesPerRequest).toBeNull();
  });

  it('should parse discrete REDISHOST/REDISPORT/REDISPASSWORD correctly', () => {
    delete process.env.REDIS_URL;
    process.env.REDISHOST = 'roundhouse.proxy.rlwy.net';
    process.env.REDISPORT = '12345';
    process.env.REDISPASSWORD = 'mysecretpassword';
    const opts = getRedisOptions();
    expect(opts.host).toBe('roundhouse.proxy.rlwy.net');
    expect(opts.port).toBe(12345);
    expect(opts.password).toBe('mysecretpassword');
  });

  it('should default to localhost:6379 when no env is provided', () => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDISHOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDISPORT;
    const opts = getRedisOptions();
    expect(opts.host).toBe('localhost');
    expect(opts.port).toBe(6379);
  });
});

describe('NotificationsService', () => {
  it('should initialize with EMAIL_FROM configured', () => {
    process.env.EMAIL_FROM = 'Ticket Book <singhishan1796@gmail.com>';
    const service = new NotificationsService();
    expect(service).toBeDefined();
  });

  it('should fallback gracefully when no queue is available', async () => {
    const service = new NotificationsService();
    await expect(
      service.queueBookingConfirmation('test@example.com', 'TKT-1234', 'QRDATA'),
    ).resolves.not.toThrow();
  });
});
