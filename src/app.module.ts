import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { UpbitService } from './upbit.service';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  providers: [UpbitService, SchedulerService],
})
export class AppModule {}
