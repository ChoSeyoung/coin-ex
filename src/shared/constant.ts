export enum SYMBOL {
  KRW_BTC = 'KRW-BTC',
  KRW_ETH = 'KRW-ETH',
  KRW_SOL = 'KRW-SOL',
  KRW_DOGE = 'KRW-DOGE',
  KRW_PEPE = 'KRW-PEPE',
  KRW_SHIB = 'KRW-SHIB',
  KRW_BONK = 'KRW-BONK',
  KRW_MEW = 'KRW-MEW',
  KRW_USDT = 'KRW-USDT',
  KRW_USDC = 'KRW-USDC',
  KRW_SBD = 'KRW-SBD',
}
export const STOP_TRADE_SYMBOL = [
  SYMBOL.KRW_USDT,
  SYMBOL.KRW_USDC,
  SYMBOL.KRW_SBD,
];

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum QUOTE_CURRENCY {
  KRW = 'KRW',
  BTC = 'BTC',
  USDT = 'USDT',
}

// 거래소 수수료 (0.05%)
export const UPBIT_FEE_RATE = 0.0005;
