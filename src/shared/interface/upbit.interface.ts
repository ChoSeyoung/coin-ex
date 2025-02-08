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

export interface MinuteCandleResponse {
  market: string; // 종목 구분 코드
  candle_date_time_utc: string; // 캔들 기준 시각(UTC), 포맷: yyyy-MM-dd'T'HH:mm:ss
  candle_date_time_kst: string; // 캔들 기준 시각(KST), 포맷: yyyy-MM-dd'T'HH:mm:ss
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가(현재가)
  timestamp: number; // 타임스탬프
  candle_acc_trade_price: number; // 누적 거래 금액;
  candle_acc_trade_volume: number; // 누적 거래량;
  unit: number; // 분 단위(유닛)
}

export interface AccountResponse {
  currency: string; //	화폐를 의미하는 영문 대문자 코드
  balance: number; //	주문가능 금액/수량
  locked: number; //	주문 중 묶여있는 금액/수량
  avg_buy_price: number; //	매수평균가
  avg_buy_price_modified: boolean; //	매수평균가 수정 여부
  unit_currency: string; //	평단가 기준 화폐
}

export interface OrderResponse {
  uuid: string; // 주문의 고유 아이디
  side: 'bid' | 'ask'; // 주문 종류 (bid: 매수, ask: 매도)
  ord_type: 'limit' | 'price' | 'market'; // 주문 타입 (지정가, 시장가 매수, 시장가 매도)
  price: string; // 주문 가격 (시장가 매수 시 null)
  state: 'wait' | 'watch' | 'done' | 'cancel'; // 주문 상태
  market: string; // 마켓 코드 (예: KRW-BTC)
  created_at: string; // 주문 생성 시간 (ISO 8601 형식)
  volume: string; // 주문한 총 수량
  remaining_volume: string; // 남은 주문 수량
  reserved_fee: string; // 예약된 수수료
  remaining_fee: string; // 남은 수수료
  paid_fee: string; // 지불된 수수료
  locked: string; // 주문 시 사용 중인 자산
  executed_volume: string; // 체결된 수량
  trades_count: number; // 체결된 거래 수
}

export interface OpenOrderResponse {
  uuid: string; // 주문의 고유 아이디
  side: 'bid' | 'ask'; // 주문 방향: 'bid'(매수) 또는 'ask'(매도)
  ord_type: 'limit' | 'price' | 'market'; // 주문 유형: 'limit', 'price', 'market'
  price: string; // 주문 가격 (시장가 매수일 경우 0)
  avg_price: string; // 체결된 평균 가격
  state: 'wait' | 'done' | 'cancel'; // 주문 상태: 'wait'(대기), 'done'(완료), 'cancel'(취소)
  market: string; // 마켓 코드 (예: 'KRW-BTC')
  created_at: string; // 주문 생성 시간 (ISO 8601 형식)
  volume: string; // 주문한 총 수량
  remaining_volume: string; // 남은 주문 수량
  reserved_fee: string; // 예약된 수수료
  remaining_fee: string; // 남은 수수료
  paid_fee: string; // 이미 지불한 수수료
  locked: string; // 주문에 잠긴 자산의 양
  executed_volume: string; // 체결된 수량
  trades_count: number; // 체결된 트레이드 수
}
export interface CancelOrderResponse {
  uuid: string; // 주문의 고유 ID
  side: 'bid' | 'ask'; // 주문 방향: 'bid'(매수) 또는 'ask'(매도)
  ord_type: 'limit' | 'price' | 'market'; // 주문 유형: 'limit', 'price', 'market'
  price: string; // 주문 가격
  avg_price: string; // 체결된 평균 가격
  state: 'cancel'; // 주문 상태: 'cancel'(취소됨)
  market: string; // 마켓 코드 (예: 'KRW-BTC')
  created_at: string; // 주문 생성 시간 (ISO 8601 형식)
  volume: string; // 주문한 총 수량
  remaining_volume: string; // 남은 주문 수량
  reserved_fee: string; // 예약된 수수료
  remaining_fee: string; // 남은 수수료
  paid_fee: string; // 이미 지불한 수수료
  locked: string; // 주문에 잠긴 자산의 양
  executed_volume: string; // 체결된 수량
  trades_count: number; // 체결된 트레이드 수
}
