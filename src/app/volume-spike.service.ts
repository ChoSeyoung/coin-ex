import { UpbitService } from '../upbit/upbit.service';
import { TelegramService } from '../telegram/telegram.service';
import { Cron } from '@nestjs/schedule';
import { QUOTE_CURRENCY, STOP_TRADE_SYMBOL, SYMBOL } from '../shared/constant';
import { DateUtil } from '../shared/util/date-util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VolumeSpikeService {
  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매 1분 마다 조건에 따라 매수 및 매도를 실행합니다.
   */
  // @Cron('*/1 * * * *')
  async volumeSpikeScheduler() {
    const markets = (
      await this.upbitService.getTickerByQuoteCurrencies(QUOTE_CURRENCY.KRW)
    )
      .filter((market) => !STOP_TRADE_SYMBOL.includes(market.market as SYMBOL))
      .filter((market) => market.acc_trade_price_24h >= 10000000000);

    for (const market of markets) {
      await this.handleBuyOrder(market.market);
    }
  }

  async handleBuyOrder(market: string) {
    // 1분 간격으로 캔들 데이터를 200개 가져오기 (최신 순서로 반환됨)
    const candles = await this.upbitService.getMinuteCandles(
      1,
      market,
      DateUtil.formatTimestamp(new Date()),
      200,
    );

    // 캔들이 2개 이상 있는지 확인
    if (candles.length < 2) {
      console.error('캔들 데이터가 충분하지 않습니다.');
      return;
    }

    // 최신 캔들과 직전 캔들 가져오기 (reverse 없이)
    const latestCandle = candles[0];
    const previousCandle = candles[1];

    // 거래량 비교
    const latestVolume = latestCandle.candle_acc_trade_volume;
    const previousVolume = previousCandle.candle_acc_trade_volume;

    console.log(
      `최신 캔들 거래량: ${latestVolume}, 직전 캔들 거래량: ${previousVolume}`,
    );

    // 거래량이 직전 캔들 대비 20배 이상 증가했는지 확인
    if (latestVolume >= previousVolume * 300) {
      console.log('거래량이 20배 이상 증가했습니다. 매수 주문을 실행합니다.');

      // 매수 주문 실행 (최신 캔들의 종가로 매수)
      await this.placeBuyOrder(market, latestCandle.trade_price);
    } else {
      console.log('거래량 증가 조건을 만족하지 않습니다.');
    }
  }

  // 매수 주문 처리 함수 (예시)
  async placeBuyOrder(market: string, price: number) {
    try {
      // 실제 매수 주문 API 호출 로직 추가 가능
      // await this.upbitService.placeOrder(market, price, 'buy');
      await this.telegramService.sendMessage(
        `[DEV] 매수 주문 완료: ${market} - 가격: ${price}`,
      );
    } catch (error) {
      console.error('매수 주문 중 오류 발생:', error);
    }
  }
}
