import { Controller, Post,  Param } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('verify/:qrToken')
  async verifyQrCode(@Param('qrToken') qrToken: string) {
    return this.ticketsService.verifyQrCode(qrToken);
  }
}
