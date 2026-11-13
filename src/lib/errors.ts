import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'not_joined'
  | 'not_active'
  | 'full'
  | 'rate_limited'
  | 'attempt_expired'
  | 'internal_error';

const STATUS_CODES: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 400,
  not_joined: 403,
  not_active: 409,
  full: 409,
  rate_limited: 429,
  attempt_expired: 410,
  internal_error: 500,
};

export function apiError(code: ErrorCode, message: string, statusOverride?: number) {
  const status = statusOverride ?? STATUS_CODES[code] ?? 400;
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
