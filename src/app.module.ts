import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { UpbitService } from './upbit.service';
import { SchedulerService } from './scheduler.service';
import { AppController } from './app.controller';
import { TelegramService } from './telegram.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.local',
    }),
  ],
  controllers: [AppController],
  providers: [UpbitService, SchedulerService, TelegramService],
})
export class AppModule {}
