/**
 * schemas.ts — Company module shared Zod schemas
 *
 * Single source of truth for the company profile schema.
 * Imported by both page.tsx (read/display) and edit/page.tsx (form validation).
 */

import { z } from 'zod';

export const videoSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
});

export const bankAccountSchema = z.object({
    bankId: z.string().min(1, { message: 'Банк сонгоно уу.' }),
    bankName: z.string().min(1, { message: 'Банкны нэр хоосон байна.' }),
    accountNumber: z
        .string()
        .min(4, { message: 'Дансны дугаар дор хаяж 4 тэмдэгт байх ёстой.' }),
    accountName: z.string().optional(),
    currency: z.string().optional(),
    isPrimary: z.boolean().optional(),
});

export type BankAccountValues = z.infer<typeof bankAccountSchema>;

export const companyProfileSchema = z.object({
    // Core
    name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.string().optional(),
    establishedDate: z.string().optional(),
    ceo: z.string().optional(),
    executiveOrderName: z.string().optional(),

    // Contact
    website: z
        .string()
        .url({ message: 'Вэбсайтын хаяг буруу байна.' })
        .optional()
        .or(z.literal('')),
    phoneNumber: z.string().optional(),
    contactEmail: z
        .string()
        .email({ message: 'Имэйл хаяг буруу байна.' })
        .optional()
        .or(z.literal('')),
    address: z.string().optional(),

    // Branding / Media
    logoUrl: z.string().optional(),
    certificateFrontUrl: z.string().optional(),
    certificateBackUrl: z.string().optional(),
    certificatePdfUrl: z.string().optional(),
    coverUrls: z
        .array(z.string())
        .max(5, { message: 'Дээд тал нь 5 зураг оруулах боломжтой.' })
        .optional(),
    videos: z.array(videoSchema).optional(),

    // Culture
    mission: z.string().optional(),
    vision: z.string().optional(),
    introduction: z.string().optional(),

    // Banking
    bankAccounts: z.array(bankAccountSchema).optional(),

    // Structure
    subsidiaries: z
        .array(
            z.union([
                z.string(),
                z.object({
                    name: z.string(),
                    registrationNumber: z.string().optional(),
                    logoUrl: z.string().optional(),
                }),
            ])
        )
        .optional(),
});

export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;
