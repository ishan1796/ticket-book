import { Module } from '@nestjs/common';
import { HoldsService } from './holds.service';
import { HoldsController } from './holds.controller';

@Module({
  providers: [HoldsService],
  controllers: [HoldsController],
  exports: [HoldsService],
})
export class HoldsModule {}
