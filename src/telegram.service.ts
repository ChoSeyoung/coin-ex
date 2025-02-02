import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TelegramService {
  private readonly botToken =
    '7262627991:AAG_opD2AjY-PSDr9rmJzWuY5S6anPoh-uI\n';
  private readonly chatId = '6412822135';

  constructor(private readonly httpService: HttpService) {}

  /**
   * 텔레그램 메시지 전송
   * @param message 보낼 메시지 내용
   */
  async sendMessage(message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await firstValueFrom(
        this.httpService.post(url, {
          chat_id: this.chatId,
          text: message,
        }),
      );
    } catch (error) {
      console.error('텔레그램 메시지 전송 실패:', error);
    }
  }
}
