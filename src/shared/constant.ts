export enum SYMBOL {
  KRW_BTC = 'KRW-BTC',
  KRW_ETH = 'KRW-ETH',
  KRW_SOL = 'KRW-SOL',
  KRW_DOGE = 'KRW-DOGE',
  KRW_PEPE = 'KRW-PEPE',
  KRW_SHIB = 'KRW-SHIB',
  KRW_BONK = 'KRW-BONK',
  KRW_MEW = 'KRW-MEW',
}
export const MAIN_THEME_MARKETS = [
  SYMBOL.KRW_BTC,
  SYMBOL.KRW_ETH,
  SYMBOL.KRW_SOL,
];
export const MEME_THEME_MARKETS = [
  // 도지코인은 리스크 관리 이후 추가
  // SYMBOL.KRW_DOGE,
  SYMBOL.KRW_PEPE,
  SYMBOL.KRW_SHIB,
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
