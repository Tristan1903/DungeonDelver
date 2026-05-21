import { z } from 'zod';

// We make everything optional for one second to test the upload
export const MonsterSchema = z.object({
  name: z.string().optional(),
  armor_class: z.union([z.number(), z.string()]).optional(),
  hit_points: z.union([z.number(), z.string()]).optional(),
}).passthrough();