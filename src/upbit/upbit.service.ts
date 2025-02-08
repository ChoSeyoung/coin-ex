import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { HTTP_METHOD, QUOTE_CURRENCY } from '../shared/constant';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from '../telegram/telegram.service';
import {
  AccountResponse,
  CancelOrderResponse,
  MinuteCandleResponse,
  OpenOrderResponse,
  OrderResponse,
  TickerResponse,
  UpbitMarketResponse,
} from '../shared/interface/upbit.interface';
import Bottleneck from 'bottleneck';
import * as querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UpbitService {
  private readonly logger = new Logger(UpbitService.name);

  private readonly BASE_URL = 'https://api.upbit.com';

  // Bottleneck 인스턴스 추가 (초당 5회 요청 제한)
  private readonly limiter = new Bottleneck({
    minTime: 100, // 최소 요청 간격 (200ms = 초당 5회)
  });

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 업비트에서 거래 가능한 종목 목록을 조회합니다.
   * @param quoteCurrency 재화 (KRW | BTC | USDT)
   */
  async getAllMarket(quoteCurrency: QUOTE_CURRENCY): Promise<string[]> {
    const url = `/v1/market/all?is_details=true`;
    const markets = await this.sendRequest<UpbitMarketResponse[]>(
      HTTP_METHOD.GET,
      url,
    );

    return markets
      .filter((market) => market.market.startsWith(quoteCurrency))
      .map((market) => market.market);
  }

  /**
   * 지정한 종목단위의 티커 데이터를 조회합니다.
   * @param market 마켓 코드 (ex. KRW-BTC)
   */
  async getTickerByMarkets(market: string): Promise<TickerResponse[]> {
    const url = `/v1/ticker?markets=${market}`;
    return this.sendRequest<TickerResponse[]>(HTTP_METHOD.GET, url);
  }

  /**
   * 지정한 마켓단위의 티커 데이터를 조회합니다.
   * @param quoteCurrency 재화 (KRW | BTC | USDT)
   */
  async getTickerByQuoteCurrencies(
    quoteCurrency: QUOTE_CURRENCY,
  ): Promise<TickerResponse[]> {
    const url = `/v1/ticker/all?quote_currencies=${quoteCurrency}`;
    return this.sendRequest<TickerResponse[]>(HTTP_METHOD.GET, url);
  }

  /**
   * 지정한 마켓의 분 단위 캔들 데이터를 조회합니다.
   * @param unit 캔들 단위
   * @param market 마켓 코드 (ex. KRW-BTC)
   * @param to 비워서 요청시 가장 최근 캔들
   * @param count 캔들 개수(최대 200개까지 요청 가능)
   */
  async getMinuteCandles(
    unit: number = 1,
    market: string,
    to?: string,
    count: number = 200,
  ): Promise<MinuteCandleResponse[]> {
    const url = `/v1/candles/minutes/${unit}?market=${market}&to=${to}&count=${count}`;
    return this.sendRequest<MinuteCandleResponse[]>(HTTP_METHOD.GET, url);
  }

  /**
   * 내 계좌 정보를 조회합니다.
   * @returns 계좌 정보 (선텍한 자산)
   */
  async getAccountAsset(market: string): Promise<AccountResponse> {
    const endpoint = '/v1/accounts';
    const accounts = await this.sendAuthenticatedRequest<AccountResponse[]>(
      HTTP_METHOD.GET,
      endpoint,
    );

    return accounts.find(
      (account) => `${account.unit_currency}-${account.currency}` === market,
    );
  }
  /**
   * 내 계좌 정보를 조회합니다.
   * @returns 계좌 정보 배열 (보유한 자산 목록)
   */
  async getAccounts(): Promise<AccountResponse[]> {
    const endpoint = '/v1/accounts';
    return this.sendAuthenticatedRequest<AccountResponse[]>(
      HTTP_METHOD.GET,
      endpoint,
    );
  }

  /**
   * 매수 주문을 실행합니다.
   * @param market 거래 마켓 (예: 'KRW-BTC')
   * @param volume 주문 수량
   * @param price 주문 가격
   */
  async placeBuyOrder(
    market: string,
    volume: number,
    price: number,
  ): Promise<OrderResponse> {
    const endpoint = '/v1/orders';
    const params = {
      market,
      side: 'bid', // 매수
      volume: volume.toString(),
      price: price.toString(),
      ord_type: 'limit',
    };

    return this.sendAuthenticatedRequest<OrderResponse>(
      HTTP_METHOD.POST,
      endpoint,
      params,
    );
  }

  /**
   * 매도 주문을 실행합니다.
   * @param market 거래 마켓 (예: 'KRW-BTC')
   * @param volume 주문 수량
   * @param price 주문 가격
   */
  async placeSellOrder(
    market: string,
    volume: number,
    price: number,
  ): Promise<OrderResponse> {
    const endpoint = '/v1/orders';
    const params = {
      market,
      side: 'ask', // 매도
      volume: volume.toString(),
      price: price.toString(),
      ord_type: 'limit',
    };

    return this.sendAuthenticatedRequest<OrderResponse>(
      HTTP_METHOD.POST,
      endpoint,
      params,
    );
  }

  /**
   * 미체결 주문 조회
   */
  async getOpenOrders(market: string): Promise<OpenOrderResponse[]> {
    const endpoint = '/v1/orders/open';
    const params = { market, state: 'wait' };

    return this.sendAuthenticatedRequest<OpenOrderResponse[]>(
      HTTP_METHOD.GET,
      endpoint,
      params,
    );
  }

  async cancelOpenOrders(
    openOrders: OpenOrderResponse[],
  ): Promise<CancelOrderResponse[]> {
    const endpoint = '/v1/order';

    const result: CancelOrderResponse[] = [];
    for (const openOrder of openOrders) {
      const params = { uuid: openOrder.uuid };

      const response = await this.sendAuthenticatedRequest<CancelOrderResponse>(
        HTTP_METHOD.DELETE,
        endpoint,
        params,
      );

      result.push(response);
    }

    return result;
  }

  /**
   * 인증이 필요 없는 API 요청을 수행합니다.
   * @param method HTTP 요청 메서드 (GET, POST 등)
   * @param endpoint
   */
  private async sendRequest<T>(
    method: HTTP_METHOD,
    endpoint: string, // 전체 URL 대신 endpoint만 받음
  ): Promise<T> {
    // 기본 URL + endpoint 조합
    const url = `${this.BASE_URL}${endpoint}`;

    const config: AxiosRequestConfig = {
      method,
      url,
    };

    try {
      // Bottleneck을 통해 요청 제한 적용
      const response = await this.limiter.schedule(() =>
        firstValueFrom(this.httpService.request(config)),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`API 요청 에러 (${method} ${url}):`, error);
      await this.handleApiError(error);
    }
  }

  /**
   * 인증이 필요한 주문 API 호출을 수행합니다.
   * Upbit의 인증 방식에 따라 JWT 토큰 생성 및 헤더 설정을 진행합니다.
   * @param method HTTP 요청 메서드
   * @param endpoint 요청 엔드포인트
   * @param params 요청 파라미터 (옵션)
   */
  private async sendAuthenticatedRequest<T>(
    method: HTTP_METHOD,
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    // 파라미터들을 정렬하여 쿼리 문자열 생성
    const query = querystring.stringify(params);

    // query_hash 생성 (SHA512)
    const queryHash = crypto.createHash('sha512').update(query).digest('hex');

    // JWT payload 구성
    const payload = {
      access_key: this.configService.get<string>('API_ACCESS_KEY'),
      nonce: uuidv4(),
      query_hash: queryHash,
      query_hash_alg: 'SHA512',
    };

    // jsonwebtoken 라이브러리를 이용하여 JWT 토큰 생성
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      payload,
      this.configService.get<string>('API_SECRET_KEY'),
    );

    let url = `${this.BASE_URL}${endpoint}`;
    if (query) {
      url += `?${query}`;
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      // Bottleneck 으로 인증 요청에도 속도 제한 적용
      const response = await this.limiter.schedule(() => {
        return firstValueFrom(this.httpService.request(config));
      });

      return response.data;
    } catch (error) {
      this.logger.error(`API 요청 에러 (${method} ${url}):`, error);
      await this.handleApiError(error);
    }
  }

  /**
   * 업비트 API 에러 처리
   * @param error API 요청 에러 객체
   */
  private async handleApiError(error: any): Promise<void> {
    if (error.response) {
      // ✅ 업비트 API에서 반환하는 에러 처리
      const { name, message } = error.response.data.error;
      await this.telegramService.sendMessage(
        `❌ 업비트 API 오류 발생: ${name} - ${message}`,
      );
    } else if (error.request) {
      // ✅ 서버 응답이 없을 경우 (네트워크 문제 등)
      await this.telegramService.sendMessage(
        `❌ 요청은 전송되었지만 응답이 없습니다.`,
      );
    } else {
      // ✅ 기타 요청 설정 오류
      await this.telegramService.sendMessage(
        `❌ 요청 설정 중 오류 발생: ${error.message}`,
      );
    }
  }
}
