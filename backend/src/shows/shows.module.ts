import { Module } from '@nestjs/common';
import { ShowsService } from './shows.service';
import { ShowsController } from './shows.controller';

@Module({
  providers: [ShowsService],
  controllers: [ShowsController],
  exports: [ShowsService],
})
export class ShowsModule {}
