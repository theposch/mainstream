/**
 * Standardized API error responses.
 *
 * All error responses follow the shape: { error: string, details?: string }
 *
 * Usage:
 * ```ts
 * import { ApiErrors } from '@/lib/utils/api-error';
 *
 * return ApiErrors.unauthorized();
 * return ApiErrors.badRequest('Title is required');
 * return ApiErrors.internal(error);
 * ```
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface ApiErrorBody {
  error: string;
  details?: string;
}

export function apiError(
  message: string,
  status: number,
  details?: string,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Convenience factory — covers the most common HTTP error cases.
 */
export const ApiErrors = {
  unauthorized: () =>
    apiError('Authentication required', 401),

  forbidden: () =>
    apiError('Access denied', 403),

  notFound: (resource = 'Resource') =>
    apiError(`${resource} not found`, 404),

  badRequest: (message: string) =>
    apiError(message, 400),

  conflict: (message: string) =>
    apiError(message, 409),

  tooManyRequests: () =>
    apiError('Too many requests, please slow down', 429),

  /**
   * Logs the error server-side and returns a generic 500 to the client
   * so implementation details are not leaked.
   */
  internal: (context: string, error?: unknown) => {
    logger.error(context, 'Internal server error', error);
    return apiError('Internal server error', 500);
  },
} as const;
