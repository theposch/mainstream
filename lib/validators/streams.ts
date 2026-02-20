import { z } from 'zod';

export const CreateStreamSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or fewer')
    .transform(s => s.trim()),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .transform(s => s.trim())
    .optional(),
  is_private: z.boolean().default(false),
});

export type CreateStreamInput = z.infer<typeof CreateStreamSchema>;

export const UpdateStreamSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be 100 characters or fewer')
      .transform(s => s.trim())
      .optional(),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or fewer')
      .transform(s => s.trim())
      .optional(),
    is_private: z.boolean().optional(),
  })
  .refine(
    data => Object.values(data).some(v => v !== undefined),
    { message: 'At least one field must be provided' },
  );

export type UpdateStreamInput = z.infer<typeof UpdateStreamSchema>;

export const AddBookmarkSchema = z.object({
  url: z.string().url('url must be a valid URL').max(2048),
  title: z
    .string()
    .max(200, 'Title must be 200 characters or fewer')
    .transform(s => s.trim())
    .optional(),
});

export type AddBookmarkInput = z.infer<typeof AddBookmarkSchema>;
