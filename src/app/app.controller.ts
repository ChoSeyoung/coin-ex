import { Controller, Get } from '@nestjs/common';
import { UpbitService } from '../upbit/upbit.service';
import { SYMBOL } from '../shared/constant';
import { DateUtil } from '../shared/util/date-util';
import { TelegramService } from '../telegram/telegram.service';
import { MathUtil } from '../shared/util/math-util';

@Controller()
export class AppController {
  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get('/ticker')
  async getTicker() {
    return await this.upbitService.getTickerByMarkets(SYMBOL.KRW_PEPE);
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
    const volume = 10000 / price;
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

  @Get('/order/open')
  async getOpenOrders() {
    return await this.upbitService.getOpenOrders('KRW-PEPE');
  }

  @Get('/order/cancel')
  async cancelOpenOrders() {
    const openOrders = await this.upbitService.getOpenOrders('KRW-PEPE');
    return await this.upbitService.cancelOpenOrders(openOrders);
  }
}
