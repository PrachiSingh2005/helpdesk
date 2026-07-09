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
export declare const TicketStatus: {
    readonly OPEN: "OPEN";
    readonly RESOLVED: "RESOLVED";
    readonly CLOSED: "CLOSED";
};
export type TicketStatus = typeof TicketStatus[keyof typeof TicketStatus];
export declare const TicketCategory: {
    readonly GENERAL_QUESTION: "GENERAL_QUESTION";
    readonly TECHNICAL_QUESTION: "TECHNICAL_QUESTION";
    readonly REFUND_REQUEST: "REFUND_REQUEST";
};
export type TicketCategory = typeof TicketCategory[keyof typeof TicketCategory];
