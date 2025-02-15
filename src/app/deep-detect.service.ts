import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UpbitService } from '../upbit/upbit.service';
import {
  QUOTE_CURRENCY,
  SELF_TRADE_SYMBOL,
  STOP_TRADE_SYMBOL,
  SYMBOL,
  UPBIT_FEE_RATE,
} from '../shared/constant';
import { DateUtil } from '../shared/util/date-util';
import { ChartUtil } from '../shared/util/chart-util';
import { TelegramService } from '../telegram/telegram.service';
import { MathUtil } from '../shared/util/math-util';

@Injectable()
export class DeepDetectService {
  private readonly logger = new Logger(DeepDetectService.name);

  private readonly amount = 100000;
  private readonly targetProfitPercent = 0.4; // 목표 수익률 설정
  private readonly targetStopPercent = -0.5; // 목표 손실률 설정

  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매 1분 마다 조건에 따라 매수를 실행합니다.
   */
  @Cron('*/15 * * * *')
  async handleBuyScheduler() {
    try {
      const markets = (
        await this.upbitService.getTickerByQuoteCurrencies(QUOTE_CURRENCY.KRW)
      )
        .filter(
          (market) => !STOP_TRADE_SYMBOL.includes(market.market as SYMBOL),
        )
        .filter(
          (market) => !SELF_TRADE_SYMBOL.includes(market.market as SYMBOL),
        )
        .filter((market) => market.acc_trade_price_24h >= 10000000000);

      for (const market of markets) {
        const openOrders = await this.upbitService.getOpenOrders(market.market);
        if (openOrders) {
          await this.upbitService.cancelOpenOrders(openOrders);
        }

        await this.handleBuyOrder(market.market);
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }

  /**
   * 매 1분 마다 조건에 따라 매도를 실행합니다.
   */
  @Cron('*/15 * * * * *')
  async handleSellScheduler() {
    try {
      const accounts = await this.upbitService.getAccounts();

      for (const account of accounts) {
        const market = `${account.unit_currency}-${account.currency}`;
        if (
          account.currency === 'KRW' ||
          STOP_TRADE_SYMBOL.includes(market as SYMBOL)
        ) {
          continue;
        }

        const openOrders = await this.upbitService.getOpenOrders(market);
        if (openOrders) {
          await this.upbitService.cancelOpenOrders(openOrders);
        }

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
        15,
        market,
        DateUtil.formatTimestamp(new Date()),
        200,
      )
    ).reverse();

    const closePrices = candles.map((candle) => candle.trade_price);

    const bollingerBand100 = ChartUtil.calculateBollingerBands(
      closePrices,
      100,
      2.0,
    );

    const buyThreshold = bollingerBand100.lower;

    // RSI 확인 후 조건에 따라 early return 처리
    const rsi = ChartUtil.calculateRSI(closePrices, 14);
    if (rsi > 25) {
      console.log(`[매수] ${market} | skip`);
      return false;
    }

    const ticker = (await this.upbitService.getTickerByMarkets(market)).find(
      (obj) => obj.market === market,
    );
    const currentTickerTradePrice = ticker.trade_price;

    this.logger.debug(
      `[매수] ${market} | 현재가: ${currentTickerTradePrice} / 매수가: ${buyThreshold.toFixed(5)} | RSI: ${rsi.toFixed(0)}`,
    );
    // 매수 조건 체크
    if (currentTickerTradePrice <= buyThreshold && rsi <= 25) {
      let volume: number;
      const asset = await this.upbitService.getAccountAsset(market);
      if (asset) {
        volume = (asset.balance * 2) / currentTickerTradePrice;
      } else {
        volume = MathUtil.roundUpTo8Decimals(
          this.amount / currentTickerTradePrice,
        );
      }

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

      return true;
    }
  }

  /**
   * 조건에 따라 매도 처리
   * @param market
   */
  async handleSellOrder(market: string) {
    try {
      const ticker = (await this.upbitService.getTickerByMarkets(market)).find(
        (obj) => obj.market === market,
      );
      const currentTickerTradePrice = ticker.trade_price;

      const asset = await this.upbitService.getAccountAsset(market);
      if (!asset) {
        console.log(`[매도] ${market} | skip`);
        return false;
      }
      // 평균 매수가
      const avgBuyPrice = asset.avg_buy_price;
      // 수익률
      const profitRate =
        ((currentTickerTradePrice - avgBuyPrice) / avgBuyPrice) * 100;

      this.logger.log(`${market} 현재 수익률: ${profitRate.toFixed(2)}%`);

      this.logger.debug(
        `[매도] 현재가: ${currentTickerTradePrice} | 수익률: ${profitRate}`,
      );
      // 목표 수익률 도달 시 매도
      if (profitRate >= this.targetProfitPercent) {
        this.logger.log(
          `✅ ${market} 매도 주문 발생 (수익률: ${profitRate.toFixed(2)}%)`,
        );

        await this.upbitService.placeSellOrder(
          market,
          asset.balance,
          currentTickerTradePrice,
        );

        // profitRate는 % 단위로 들어온다고 가정합니다.
        // 매수가격 계산: 매도가에 수익률이 포함되기 전의 가격
        const buyPrice = currentTickerTradePrice / (1 + profitRate / 100);

        // 총(매도-매수) 차익 계산
        const grossProfit =
          (currentTickerTradePrice - buyPrice) * asset.balance;

        // 매수 시 수수료: 매수가격에 대해 feeRate 적용
        const buyFee = buyPrice * asset.balance * UPBIT_FEE_RATE;
        // 매도 시 수수료: 매도가격에 대해 feeRate 적용
        const sellFee =
          currentTickerTradePrice * asset.balance * UPBIT_FEE_RATE;

        // 최종 순수익 계산: 총 이익에서 두 번의 거래 수수료를 차감
        const netProfit = grossProfit - (buyFee + sellFee);

        if (profitRate >= this.targetProfitPercent) {
          await this.telegramService.sendMessage(
            `📈 ${market} 수익 주문 발생 📈\n 수익률: ${profitRate.toFixed(2)}%\n 단가: ${currentTickerTradePrice}\n 수량: ${asset.balance}\n 순수익: ${netProfit.toFixed(0)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }
}
