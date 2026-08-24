import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return root health/info', async () => {
    const res = await controller.root();
    expect(res.name).toBe('Ticket Booking API');
    expect(res.status).toBe('online');
  });

  it('should return health status ok', async () => {
    const res = await controller.health();
    expect(res.status).toBe('ok');
  });

  it('should return ready status connected', async () => {
    const res = await controller.ready();
    expect(res.status).toBe('ready');
    expect(res.database).toBe('connected');
  });
});
