/**
 * Zod validation schemas for asset-related API routes.
 * Import these at the top of route handlers and parse request input before use.
 *
 * ```ts
 * import { EmbedBodySchema } from '@/lib/validators/assets';
 *
 * const parsed = EmbedBodySchema.safeParse(await request.json());
 * if (!parsed.success) {
 *   return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
 * }
 * const { url, title, description, streamIds } = parsed.data;
 * ```
 */

import { z } from 'zod';

// ─── Shared primitives ────────────────────────────────────────────────────────

const StreamIdsSchema = z
  .array(z.string().uuid('Each stream ID must be a valid UUID'))
  .max(20, 'Cannot attach to more than 20 streams at once')
  .default([]);

const TitleSchema = z
  .string()
  .min(1, 'Title cannot be empty')
  .max(200, 'Title must be 200 characters or fewer')
  .transform(s => s.trim())
  .optional();

const DescriptionSchema = z
  .string()
  .max(2000, 'Description must be 2000 characters or fewer')
  .transform(s => s.trim())
  .optional();

const VisibilitySchema = z
  .enum(['public', 'unlisted'])
  .default('public');

// ─── Upload (multipart — parsed after formData()) ─────────────────────────────

/** Fields extracted from FormData for the upload route */
export const UploadFormSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be 200 characters or fewer')
    .transform(s => s.trim())
    .optional(),
  description: DescriptionSchema,
  visibility: VisibilitySchema,
  /** JSON-stringified array of UUIDs */
  streamIds: z
    .string()
    .optional()
    .transform(raw => {
      if (!raw) return [] as string[];
      try {
        const parsed = JSON.parse(raw);
        return z.array(z.string().uuid()).parse(parsed);
      } catch {
        return [] as string[];
      }
    }),
});

export type UploadFormInput = z.infer<typeof UploadFormSchema>;

// ─── Embed ────────────────────────────────────────────────────────────────────

export const EmbedBodySchema = z.object({
  url: z
    .string({ required_error: 'url is required' })
    .url('url must be a valid URL')
    .max(2048, 'URL is too long'),
  title: TitleSchema,
  description: DescriptionSchema,
  streamIds: StreamIdsSchema,
});

export type EmbedBodyInput = z.infer<typeof EmbedBodySchema>;

// ─── Asset update (PATCH) ─────────────────────────────────────────────────────

export const UpdateAssetBodySchema = z
  .object({
    title: TitleSchema,
    description: DescriptionSchema,
    visibility: VisibilitySchema.optional(),
    streamIds: StreamIdsSchema.optional(),
  })
  .refine(
    data => Object.values(data).some(v => v !== undefined),
    { message: 'At least one field must be provided' },
  );

export type UpdateAssetBodyInput = z.infer<typeof UpdateAssetBodySchema>;

// ─── Query params ─────────────────────────────────────────────────────────────

export const AssetListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform(v => Math.min(parseInt(v ?? '20', 10), 50))
    .pipe(z.number().int().min(1).max(50)),
});

export type AssetListQueryInput = z.infer<typeof AssetListQuerySchema>;
