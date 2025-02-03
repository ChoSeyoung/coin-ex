export class ChartUtil {
  /**
   * 볼린저 밴드 계산
   * @param closes 종가 배열
   * @param period 이동 평균 기간 (기본값: 20)
   * @param stdMultiplier 표준 편차 배수 (기본값: 2)
   * @returns 볼린저 밴드 값 배열 [{ middle, upper, lower }]
   */
  static calculateBollingerBands(
    closes: number[],
    period: number = 20,
    stdMultiplier: number = 2.0,
  ): { middle: number; upper: number; lower: number } {
    if (closes.length < period) {
      throw new Error('입력 데이터가 기간보다 작습니다.');
    }

    // 가장 최신 데이터 기준으로 볼린저 밴드 계산
    // 마지막 'period' 개 데이터 가져오기
    const slice = closes.slice(-period);
    // 이동 평균
    const middle = slice.reduce((sum, price) => sum + price, 0) / period;
    const variance =
      slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) /
      period;
    // 표준 편차
    const stdDev = Math.sqrt(variance);
    // 상한선
    const upper = middle + stdMultiplier * stdDev;
    // 하한선
    const lower = middle - stdMultiplier * stdDev;

    return { middle, upper, lower };
  }

  /**
   * EMA(Exponential Moving Average) 계산 (업비트 공식)
   * @param data 상승/하락 갭 데이터
   * @param weight 가중치 (일반적으로 14)
   * @returns EMA 값
   */
  private static calculateEMA(data: number[], weight: number): number {
    if (data.length === 0) return 0;

    // 업비트 공식
    const formula = 1 / (1 + (weight - 1));

    // 첫 번째 값을 초기 EMA로 설정
    let result = data[0];

    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        // EMA 공식 적용
        result = data[i] * formula + result * (1 - formula);
      }
    }

    return result;
  }

  /**
   * RSI (Relative Strength Index) 계산
   * @param candles 종가 리스트
   * @param weight RSI 계산을 위한 가중치 (기본값: 14)
   * @returns RSI 값
   */
  static calculateRSI(candles: number[], weight: number = 14): number {
    if (candles.length < weight + 1) {
      throw new Error('입력 데이터가 가중치보다 작습니다.');
    }

    const up: number[] = [];
    const down: number[] = [];

    for (let i = 0; i < candles.length - 1; i++) {
      const gap = candles[i + 1] - candles[i];

      if (gap > 0) {
        up.push(gap);
        down.push(0);
      } else if (gap < 0) {
        up.push(0);
        down.push(-gap);
      } else {
        up.push(0);
        down.push(0);
      }
    }

    // AU (Average Gain) & AD (Average Loss) 계산 (EMA 사용)
    const au = ChartUtil.calculateEMA(up, weight);
    const ad = ChartUtil.calculateEMA(down, weight);

    // RSI 계산
    return 100 - 100 / (1 + au / ad);
  }
}
