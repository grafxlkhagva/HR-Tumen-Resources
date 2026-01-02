import { z } from 'zod';

export const emergencyContactSchema = z.object({
    fullName: z.string().min(1, "Овог, нэр хоосон байж болохгүй."),
    relationship: z.string().min(1, "Таны хэн болохыг сонгоно уу."),
    phone: z.string().min(1, "Утасны дугаар хоосон байж болохгүй."),
});

export const generalInfoSchema = z.object({
    lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
    firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
    registrationNumber: z.string().min(1, "Регистрийн дугаар хоосон байж болохгүй."),
    birthDate: z.date({ required_error: "Төрсөн огноо сонгоно уу." }).nullable(),
    gender: z.string().min(1, "Хүйс сонгоно уу."),
    idCardNumber: z.string().optional(),
    hasDisability: z.boolean().default(false).optional(),
    disabilityPercentage: z.string().optional(),
    disabilityDate: z.date().optional().nullable(),
    hasDriversLicense: z.boolean().default(false).optional(),
    driverLicenseCategories: z.array(z.string()).optional(),
});

export const contactInfoSchema = z.object({
    workPhone: z.string().optional(),
    personalPhone: z.string().optional(),
    workEmail: z.string().email({ message: "Албан ёсны имэйл хаяг буруу байна." }).optional().or(z.literal('')),
    personalEmail: z.string().email({ message: "Хувийн имэйл хаяг буруу байна." }).optional().or(z.literal('')),
    homeAddress: z.string().optional(),
    temporaryAddress: z.string().optional(),
    facebook: z.string().url({ message: 'Facebook хаяг буруу байна.' }).optional().or(z.literal('')),
    instagram: z.string().url({ message: 'Instagram хаяг буруу байна.' }).optional().or(z.literal('')),
    emergencyContacts: z.array(emergencyContactSchema).optional(),
});

export const educationSchema = z.object({
    country: z.string().min(1, "Улс сонгоно уу."),
    school: z.string().optional(),
    schoolCustom: z.string().optional(),
    degree: z.string().optional(),
    diplomaNumber: z.string().optional(),
    academicRank: z.string().optional(),
    entryDate: z.date().nullable(),
    gradDate: z.date().nullable(),
    isCurrent: z.boolean().default(false),
}).refine(data => data.school || data.schoolCustom, {
    message: "Төгссөн сургуулиа сонгох эсвэл бичнэ үү.",
    path: ["school"],
});

export const educationHistorySchema = z.object({
    education: z.array(educationSchema),
    educationNotApplicable: z.boolean().default(false).optional(),
});

export const languageSchema = z.object({
    language: z.string().min(1, "Хэл сонгоно уу."),
    listening: z.string().min(1, "Түвшин сонгоно уу."),
    reading: z.string().min(1, "Түвшин сонгоно уу."),
    speaking: z.string().min(1, "Түвшин сонгоно уу."),
    writing: z.string().min(1, "Түвшин сонгоно уу."),
    testScore: z.string().optional(),
});

export const languageSkillsSchema = z.object({
    languages: z.array(languageSchema),
    languagesNotApplicable: z.boolean().default(false).optional(),
});

export const trainingSchema = z.object({
    name: z.string().min(1, "Сургалтын нэр хоосон байж болохгүй."),
    organization: z.string().min(1, "Байгууллагын нэр хоосон байж болохгүй."),
    startDate: z.date().nullable(),
    endDate: z.date().nullable(),
    certificateNumber: z.string().optional(),
});

export const professionalTrainingSchema = z.object({
    trainings: z.array(trainingSchema),
    trainingsNotApplicable: z.boolean().default(false).optional(),
});

export const familyMemberSchema = z.object({
    relationship: z.string().min(1, "Таны хэн болохыг сонгоно уу."),
    lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
    firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
    phone: z.string().optional(),
});

export const familyInfoSchema = z.object({
    familyMembers: z.array(familyMemberSchema),
    familyMembersNotApplicable: z.boolean().default(false).optional(),
});

export const workExperienceSchema = z.object({
    company: z.string().min(1, "Компанийн нэр хоосон байж болохгүй."),
    position: z.string().min(1, "Ажлын байрны нэр хоосон байж болохгүй."),
    startDate: z.date().nullable(),
    endDate: z.date().nullable(),
    employmentType: z.string().min(1, "Хөдөлмөрийн нөхцөл сонгоно уу."),
    description: z.string().optional(),
});

export const workExperienceHistorySchema = z.object({
    experiences: z.array(workExperienceSchema),
    experienceNotApplicable: z.boolean().default(false).optional(),
});

export const fullQuestionnaireSchema = generalInfoSchema
    .merge(contactInfoSchema)
    .merge(educationHistorySchema)
    .merge(languageSkillsSchema)
    .merge(professionalTrainingSchema)
    .merge(familyInfoSchema)
    .merge(workExperienceHistorySchema);

export type FullQuestionnaireValues = z.infer<typeof fullQuestionnaireSchema>;
