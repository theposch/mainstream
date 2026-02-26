/**
 * Standardized API error responses.
 *
 * All error responses follow the shape: { error: string, details?: string }
 *
 * Usage:
 * ```ts
 * import { ApiErrors, validateUUID, noContent } from '@/lib/utils/api-error';
 *
 * return ApiErrors.unauthorized();
 * return ApiErrors.badRequest('Title is required');
 * return ApiErrors.internal(error);
 *
 * const invalid = validateUUID(id, 'Asset');
 * if (invalid) return invalid;
 *
 * return noContent(); // 204 for successful DELETE
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

/**
 * Returns a 204 No Content response for successful DELETE operations.
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * UUID v4 regex — used to validate route parameters before hitting the DB.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a well-formed UUID.
 * Returns an error response if invalid, or null if valid.
 *
 * Usage:
 * ```ts
 * const invalid = validateUUID(id, 'Asset');
 * if (invalid) return invalid;
 * ```
 */
export function validateUUID(
  value: string,
  resourceName = 'Resource',
): NextResponse<ApiErrorBody> | null {
  if (!UUID_REGEX.test(value)) {
    return ApiErrors.badRequest(`Invalid ${resourceName} ID format`);
  }
  return null;
}
