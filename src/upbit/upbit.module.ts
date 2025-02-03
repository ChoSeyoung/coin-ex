import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UpbitService } from './upbit.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    HttpModule,
    TelegramModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.local',
    }),
  ],
  providers: [UpbitService],
  exports: [UpbitService],
})
export class UpbitModule {}
