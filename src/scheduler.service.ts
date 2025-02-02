import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UpbitService } from './upbit.service';
import { SYMBOL } from './constant';
import { DateUtil } from './date-util';
import { ChartUtil } from './chart-util';
import { TelegramService } from './telegram.service';
import { MathUtil } from './math-util';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  private readonly market = SYMBOL.KRW_PEPE;
  private readonly amount = 500000;
  private readonly targetProfitPercent = 0.5; // 목표 수익률 설정
  private readonly targetStopPercent = -0.5; // 목표 손실률 설정

  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매 5초마다 티커 데이터를 조회하고 조건에 따라 매수 및 매도를 실행합니다.
   */
  @Cron('*/1 * * * *')
  async handleBuyScheduler() {
    try {
      const candles = (
        await this.upbitService.getMinuteCandles(
          1,
          this.market,
          DateUtil.formatTimestamp(new Date()),
          200,
        )
      ).reverse();

      const closePrices = candles.map((candle) => candle.trade_price);

      const bollingerBand60 = ChartUtil.calculateBollingerBands(
        closePrices,
        60,
        2.0,
      );
      const bollingerBand20 = ChartUtil.calculateBollingerBands(
        closePrices,
        20,
        2.0,
      );

      const minBollingerBandPrice = Math.min(
        bollingerBand60.lower,
        bollingerBand20.lower,
      );
      const buyThreshold =
        minBollingerBandPrice - minBollingerBandPrice * 0.002;

      const rsi = ChartUtil.calculateRSI(closePrices, 14);

      const ticker = (await this.upbitService.getTicker(this.market)).find(
        (obj) => obj.market === this.market,
      );
      const currentTickerTradePrice = ticker.trade_price;

      this.logger.debug(
        `[매수] 현재가: ${currentTickerTradePrice} | 매수가: ${buyThreshold.toFixed(5)} | RSI: ${rsi.toFixed(0)}`,
      );
      /** 매수 조건 체크 */
      if (currentTickerTradePrice <= buyThreshold && rsi <= 30) {
        const volume = MathUtil.roundUpTo8Decimals(
          this.amount / currentTickerTradePrice,
        );

        this.logger.log(
          `📢 ${this.market} 매수 주문 발생: 가격: ${currentTickerTradePrice} | 수량: ${volume}`,
        );

        await this.upbitService.placeBuyOrder(
          this.market,
          volume,
          currentTickerTradePrice,
        );

        await this.telegramService.sendMessage(
          `📢 ${this.market} 매수 주문 발생\n가격: ${currentTickerTradePrice}`,
        );
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }

  @Cron('*/10 * * * * *')
  async handleSellScheduler() {
    try {
      const ticker = (await this.upbitService.getTicker(this.market)).find(
        (obj) => obj.market === this.market,
      );
      const currentTickerTradePrice = ticker.trade_price;

      const asset = await this.upbitService.getAccountAsset(this.market);

      if (asset && asset.avg_buy_price * asset.balance > this.amount) {
        // 평균 매수가
        const avgBuyPrice = parseFloat(asset.avg_buy_price);
        // 수익률
        const profitRate =
          ((currentTickerTradePrice - avgBuyPrice) / avgBuyPrice) * 100;

        this.logger.log(
          `${this.market} 현재 수익률: ${profitRate.toFixed(2)}%`,
        );

        this.logger.debug(
          `[매도] 현재가: ${currentTickerTradePrice} | 수익률: ${profitRate}`,
        );
        // 목표 수익률/손실률 도달 시 매도
        if (
          profitRate >= this.targetProfitPercent ||
          profitRate <= this.targetStopPercent
        ) {
          this.logger.log(
            `✅ ${this.market} 매도 주문 발생 (수익률: ${profitRate.toFixed(2)}%)`,
          );

          await this.upbitService.placeSellOrder(
            this.market,
            parseFloat(asset.balance),
            currentTickerTradePrice,
          );

          await this.telegramService.sendMessage(
            `${this.market} 매도 주문 발생\n수익률: ${profitRate.toFixed(2)}%\n매도가: ${currentTickerTradePrice} KRW`,
          );
        }
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }
}
