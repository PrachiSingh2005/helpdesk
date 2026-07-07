import { z } from 'zod';
export const createUserSchema = z.object({
    name: z
        .string({ message: 'Name, email, and password are required.' })
        .refine((val) => val.trim().length >= 3, {
        message: 'Name must be at least 3 characters.',
    }),
    email: z
        .string({ message: 'Name, email, and password are required.' })
        .email('Please enter a valid email address.'),
    password: z
        .string({ message: 'Name, email, and password are required.' })
        .min(8, 'Password must be at least 8 characters.'),
});
