import { z } from 'zod';

export const CreateDropSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be 200 characters or fewer')
    .transform(s => s.trim()),
  description: z
    .string()
    .max(1000)
    .transform(s => s.trim())
    .optional(),
  date_range_start: z.string().datetime({ message: 'date_range_start must be an ISO 8601 datetime' }),
  date_range_end: z.string().datetime({ message: 'date_range_end must be an ISO 8601 datetime' }),
  filter_stream_ids: z.array(z.string().uuid()).nullable().optional(),
  filter_user_ids: z.array(z.string().uuid()).nullable().optional(),
  is_weekly: z.boolean().default(false),
}).refine(
  data => new Date(data.date_range_start) < new Date(data.date_range_end),
  { message: 'date_range_start must be before date_range_end', path: ['date_range_start'] },
);

export type CreateDropInput = z.infer<typeof CreateDropSchema>;

export const UpdateDropSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(200)
      .transform(s => s.trim())
      .optional(),
    description: z
      .string()
      .max(1000)
      .transform(s => s.trim())
      .optional(),
  })
  .refine(
    data => Object.values(data).some(v => v !== undefined),
    { message: 'At least one field must be provided' },
  );

export type UpdateDropInput = z.infer<typeof UpdateDropSchema>;
