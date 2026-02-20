import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z
    .string({ required_error: 'content is required' })
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or fewer')
    .transform(s => s.trim()),
  parent_id: z.string().uuid('parent_id must be a valid UUID').nullable().optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  content: z
    .string({ required_error: 'content is required' })
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or fewer')
    .transform(s => s.trim()),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
