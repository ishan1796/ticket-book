import { Module } from '@nestjs/common';
import { AdminDebugController } from './admin-debug.controller';

@Module({
  controllers: [AdminDebugController],
})
export class AdminDebugModule {}
