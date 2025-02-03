export class DateUtil {
  /**
   * Date 객체를 'yyyy-MM-dd HH:mm:ss' 형식으로 변환
   * @param date 변환할 Date 객체 (기본값: 현재 시간)
   * @returns 변환된 문자열 (예: '2025-02-01 00:52:00')
   */
  static formatTimestamp(date: Date = new Date()): string {
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0'); // 월 (1월 = 0이므로 +1)
    const dd = String(date.getDate()).padStart(2, '0'); // 일
    const HH = String(date.getHours()).padStart(2, '0'); // 시
    const mm = String(date.getMinutes()).padStart(2, '0'); // 분
    const ss = String(date.getSeconds()).padStart(2, '0'); // 초

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }
}
