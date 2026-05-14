export declare class FusabaseAppCheckError extends Error {
  status?: number;
  code?: string;
  override cause?: unknown;
  constructor(message: string, opts?: { status?: number; code?: string; cause?: unknown });
}
