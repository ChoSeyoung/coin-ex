import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function logSecondsUntilNextMinute(): void {
  setInterval(() => {
    const now: Date = new Date();
    const nextMinute: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes() + 1,
    );

    const secondsUntilNextMinute: number = Math.floor(
      (nextMinute.getTime() - now.getTime()) / 1000,
    );

    // 현재 줄을 지우고 새로운 값으로 업데이트
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(new Date().toString());
    // 줄바꿈
    if (secondsUntilNextMinute === 0 || secondsUntilNextMinute % 10 === 0) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }, 1000);
}

logSecondsUntilNextMinute();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().then(() =>
  console.log('Application is running on http://localhost:3000'),
);
