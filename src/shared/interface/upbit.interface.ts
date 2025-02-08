export interface UpbitMarketResponse {
  // 마켓 코드 | ex: KRW-BTC
  market: string;
  // 한글 이름 | ex: 비트코인
  korean_name: string;
  // 영어 이름 | ex: Bitcoin
  english_name: string;
  // 업비트 시장경보
  market_event: {
    // 유의종목 지정 여부
    warning: string;
    // 주의종목 지정 여부
    caution: string;
  };
}

export interface TickerResponse {
  market: string; // 종목 구분 코드
  trade_date: string; // 최근 거래 일자(UTC), 포맷: yyyyMMdd
  trade_time: string; // 최근 거래 시각(UTC), 포맷: HHmmss
  trade_date_kst: string; // 최근 거래 일자(KST), 포맷: yyyyMMdd
  trade_time_kst: string; // 최근 거래 시각(KST), 포맷: HHmmss
  trade_timestamp: number; // 최근 거래 일시(UTC), Unix Timestamp
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가(현재가)
  prev_closing_price: number; // 전일 종가(UTC 0시 기준)
  change: 'EVEN' | 'RISE' | 'FALL'; // 전일 대비, 보합: EVEN, 상승: RISE, 하락: FALL
  change_price: number; // 변화액의 절대값
  change_rate: number; // 변화율의 절대값
  signed_change_price: number; // 부호가 있는 변화액
  signed_change_rate: number; // 부호가 있는 변화율
  trade_volume: number; // 가장 최근 거래량
  acc_trade_price: number; // 누적 거래대금(UTC 0시 기준)
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  acc_trade_volume: number; // 누적 거래량(UTC 0시 기준)
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  highest_52_week_price: number; // 52주 신고가
  highest_52_week_date: string; // 52주 신고가 달성일, 포맷: yyyy-MM-dd
  lowest_52_week_price: number; // 52주 신저가
  lowest_52_week_date: string; // 52주 신저가 달성일, 포맷: yyyy-MM-dd
  timestamp: number; // 타임스탬프
}
