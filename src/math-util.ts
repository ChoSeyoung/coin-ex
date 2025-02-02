export class MathUtil {
  static roundUpTo8Decimals(num: number): number {
    return Math.ceil(num * 1e8) / 1e8; // 소수점 8번째 자리에서 올림
  }
}
