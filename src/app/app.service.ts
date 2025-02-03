import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UpbitService } from '../upbit/upbit.service';
import { MEME_THEME_MARKETS } from '../shared/constant';
import { DateUtil } from '../shared/date-util';
import { ChartUtil } from '../shared/chart-util';
import { TelegramService } from '../telegram/telegram.service';
import { MathUtil } from '../shared/math-util';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  private readonly scheduledMarkets = MEME_THEME_MARKETS;
  private readonly amount = 10000;
  private readonly targetProfitPercent = 1.0; // 목표 수익률 설정
  private readonly targetStopPercent = -1.0; // 목표 손실률 설정

  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매 1분 마다 조건에 따라 매수 및 매도를 실행합니다.
   */
  @Cron('*/1 * * * *')
  async handleTradeScheduler() {
    try {
      for (const market of this.scheduledMarkets) {
        await this.handleBuyOrder(market);
        await this.handleSellOrder(market);
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }

  /**
   * 조건에 따라 매수 처리
   */
  async handleBuyOrder(market: string) {
    const candles = (
      await this.upbitService.getMinuteCandles(
        1,
        market,
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
    const buyThreshold = minBollingerBandPrice - minBollingerBandPrice * 0.002;

    const rsi = ChartUtil.calculateRSI(closePrices, 14);

    const ticker = (await this.upbitService.getTicker(market)).find(
      (obj) => obj.market === market,
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
        `📢 ${market} 매수 주문 발생: 가격: ${currentTickerTradePrice} | 수량: ${volume}`,
      );

      await this.upbitService.placeBuyOrder(
        market,
        volume,
        currentTickerTradePrice,
      );

      await this.telegramService.sendMessage(
        `🛒 ${market} 매수 주문 발생 🛒\n 단가: ${currentTickerTradePrice}\n 수량: ${volume}\n 총액: ${currentTickerTradePrice * volume}`,
      );
    }
  }

  /**
   * 조건에 따라 매도 처리
   * @param market
   */
  async handleSellOrder(market: string) {
    try {
      const ticker = (await this.upbitService.getTicker(market)).find(
        (obj) => obj.market === market,
      );
      const currentTickerTradePrice = ticker.trade_price;

      const asset = await this.upbitService.getAccountAsset(market);

      if (asset && asset.avg_buy_price * asset.balance > this.amount) {
        // 평균 매수가
        const avgBuyPrice = parseFloat(asset.avg_buy_price);
        // 수익률
        const profitRate =
          ((currentTickerTradePrice - avgBuyPrice) / avgBuyPrice) * 100;

        this.logger.log(`${market} 현재 수익률: ${profitRate.toFixed(2)}%`);

        this.logger.debug(
          `[매도] 현재가: ${currentTickerTradePrice} | 수익률: ${profitRate}`,
        );
        // 목표 수익률/손실률 도달 시 매도
        if (
          profitRate >= this.targetProfitPercent ||
          profitRate <= this.targetStopPercent
        ) {
          this.logger.log(
            `✅ ${market} 매도 주문 발생 (수익률: ${profitRate.toFixed(2)}%)`,
          );

          await this.upbitService.placeSellOrder(
            market,
            parseFloat(asset.balance),
            currentTickerTradePrice,
          );

          if (profitRate >= this.targetProfitPercent) {
            await this.telegramService.sendMessage(
              `📈 ${market} 수익 주문 발생 📈\n 수익률: ${profitRate.toFixed(2)}%\n 단가: ${currentTickerTradePrice}\n 수량: ${asset.balance}\n 총액: ${currentTickerTradePrice * asset.balance}`,
            );
          } else {
            await this.telegramService.sendMessage(
              `📉 ${market} 손실 주문 발생 📉\n 손실률: ${profitRate.toFixed(2)}%\n 단가: ${currentTickerTradePrice}\n 수량: ${asset.balance}\n 총액: ${currentTickerTradePrice * asset.balance}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }
}
