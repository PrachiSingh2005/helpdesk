import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type CreateUserSchemaType = z.infer<typeof createUserSchema>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateUserSchemaType = z.infer<typeof updateUserSchema>;
