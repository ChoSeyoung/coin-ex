import { Controller, Get } from '@nestjs/common';
import { UpbitService } from './upbit.service';
import { SYMBOL } from './constant';
import { DateUtil } from './date-util';
import { TelegramService } from './telegram.service';
import { MathUtil } from './math-util';

@Controller()
export class AppController {
  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get('/ticker')
  async getTicker() {
    return await this.upbitService.getTicker(SYMBOL.KRW_PEPE);
  }

  @Get('/candle/minute')
  async getMinuteCandles() {
    return await this.upbitService.getMinuteCandles(
      1,
      SYMBOL.KRW_PEPE,
      DateUtil.formatTimestamp(new Date()),
      200,
    );
  }

  @Get('/account')
  async getAccounts() {
    return await this.upbitService.getAccounts();
  }

  @Get('/buy')
  async placeBuyOrder() {
    const price = 0.00001;
    const volume = 5000 / price;
    return await this.upbitService.placeBuyOrder(
      SYMBOL.KRW_PEPE,
      MathUtil.roundUpTo8Decimals(volume),
      price,
    );
  }

  @Get('/message')
  async sendMessage() {
    return await this.telegramService.sendMessage('🐸');
  }
}
