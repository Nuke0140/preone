/**
 * ResponseDto — standardised success envelope.
 *
 * Per BTD §19.2 — standard error response shape mirror.
 *
 * Every successful API response follows:
 *   {
 *     "success": true,
 *     "data": <T>,
 *     "traceId": "...",
 *     "timestamp": "..."
 *   }
 *
 * Errors use the same envelope with `success: false` + `errorCode` + `details`.
 */
export class ResponseDto<T> {
  public readonly success: true;
  public readonly data: T;
  public readonly traceId?: string;
  public readonly timestamp: string;

  private constructor(data: T, traceId?: string) {
    this.success = true;
    this.data = data;
    this.traceId = traceId;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, traceId?: string): ResponseDto<T> {
    return new ResponseDto(data, traceId);
  }

  static paginated<T>(items: T[], total: number, page: number, pageSize: number, traceId?: string): ResponseDto<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    return new ResponseDto(
      {
        items,
        total,
        page,
        pageSize,
        hasNext: page * pageSize < total,
      },
      traceId,
    );
  }
}
