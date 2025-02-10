import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UpbitService } from '../upbit/upbit.service';
import {
  QUOTE_CURRENCY,
  STOP_TRADE_SYMBOL,
  SYMBOL,
  UPBIT_FEE_RATE,
} from '../shared/constant';
import { DateUtil } from '../shared/util/date-util';
import { ChartUtil } from '../shared/util/chart-util';
import { TelegramService } from '../telegram/telegram.service';
import { MathUtil } from '../shared/util/math-util';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  private readonly amount = 1000000;
  private readonly targetProfitPercent = 0.5; // 목표 수익률 설정
  private readonly targetStopPercent = -0.75; // 목표 손실률 설정

  constructor(
    private readonly upbitService: UpbitService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 매 1분 마다 조건에 따라 매수 및 매도를 실행합니다.
   */
  @Cron('*/1 * * * *')
  async handleTradeScheduler() {
    console.log(new Date().toISOString());
    try {
      const markets = (
        await this.upbitService.getTickerByQuoteCurrencies(QUOTE_CURRENCY.KRW)
      )
        .filter(
          (market) => !STOP_TRADE_SYMBOL.includes(market.market as SYMBOL),
        )
        .filter((market) => market.acc_trade_price_24h >= 10000000000);

      for (const market of markets) {
        const openOrders = await this.upbitService.getOpenOrders(market.market);
        if (openOrders) {
          await this.upbitService.cancelOpenOrders(openOrders);
        }

        await this.handleBuyOrder(market.market);
        // await this.handleBuyOrderMACrossover(market.market);
        await this.handleSellOrder(market.market);
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    } finally {
      console.log('---');
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
    const buyThreshold = minBollingerBandPrice - minBollingerBandPrice * 0.003;

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
   * 이동평균 교차(Golden Cross) 기반 매수 주문 실행 함수
   * - 최근 200개의 1분 캔들 데이터를 이용하여 단기(20분)와 장기(50분) SMA를 계산합니다.
   * - 바로 이전 시점에서는 단기 SMA가 장기 SMA보다 낮았으나, 현재 시점에서 단기 SMA가 장기 SMA 이상이면 골든크로스로 판단합니다.
   */
  async handleBuyOrderMACrossover(market: string) {
    try {
      // 1분 캔들 데이터를 200개 조회 (최소 50개 이상의 데이터가 필요합니다)
      const candles = (
        await this.upbitService.getMinuteCandles(
          1,
          market,
          DateUtil.formatTimestamp(new Date()),
          200,
        )
      ).reverse();

      const closePrices = candles.map((candle) => candle.trade_price);

      const periodShort = 20;
      const periodLong = 50;

      // 현재 시점의 SMA 계산 (마지막 period 값 사용)
      const currentShortSMA = ChartUtil.calculateSMA(
        closePrices.slice(-periodShort),
        periodShort,
      );
      const currentLongSMA = ChartUtil.calculateSMA(
        closePrices.slice(-periodLong),
        periodLong,
      );

      // 바로 이전 시점의 SMA 계산 (마지막 캔들 제외)
      const prevShortSMA = ChartUtil.calculateSMA(
        closePrices.slice(-periodShort - 1, -1),
        periodShort,
      );
      const prevLongSMA = ChartUtil.calculateSMA(
        closePrices.slice(-periodLong - 1, -1),
        periodLong,
      );

      // 골든크로스 조건 확인: 이전에 단기 SMA가 장기 SMA보다 낮았고, 현재 단기 SMA가 장기 SMA 이상인 경우
      if (prevShortSMA < prevLongSMA && currentShortSMA >= currentLongSMA) {
        this.logger.log(
          `✅ [MA Crossover] ${market} 골든크로스 감지 - 매수 신호 발생`,
        );

        // 기존의 미체결 주문이 있다면 취소 (필요에 따라)
        const openOrders = await this.upbitService.getOpenOrders(market);
        if (openOrders && openOrders.length > 0) {
          await this.upbitService.cancelOpenOrders(openOrders);
        }

        // 현재 가격 정보를 조회
        const ticker = (
          await this.upbitService.getTickerByMarkets(market)
        ).find((obj) => obj.market === market);
        const currentTickerTradePrice = ticker.trade_price;

        // 투자 금액에 따른 주문량 산출
        const volume = MathUtil.roundUpTo8Decimals(
          100000 / currentTickerTradePrice,
        );

        // 매수 주문 실행
        await this.upbitService.placeBuyOrder(
          market,
          volume,
          currentTickerTradePrice,
        );
        this.logger.log(
          `📢 [MA Crossover] ${market} 매수 주문 발생: 가격 ${currentTickerTradePrice} / 수량 ${volume}`,
        );

        // 텔레그램으로 주문 알림 전송
        await this.telegramService.sendMessage(
          `🛒 [MA Crossover] ${market} 매수 주문 발생\n단가: ${currentTickerTradePrice}\n수량: ${volume}\n총액: ${currentTickerTradePrice * volume}`,
        );
      } else {
        console.log(`[MA Crosover] ${market} | skip`);
      }
    } catch (error) {
      this.logger.error(
        `[MA Crossover] ${market} 매수 주문 실행 중 오류: `,
        error,
      );
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
        } else {
          await this.telegramService.sendMessage(
            `📉 ${market} 손실 주문 발생 📉\n 손실률: ${profitRate.toFixed(2)}%\n 단가: ${currentTickerTradePrice}\n 수량: ${asset.balance}\n 순수익: ${netProfit.toFixed(0)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('스케줄러 작업 중 오류 발생: ', error);
    }
  }
}
