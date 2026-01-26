import { Timestamp } from 'firebase/firestore';

/**
 * Компанийн түүхэн үйл явдал
 * Firestore collection: 'companyHistory'
 */
export interface CompanyHistoryEvent {
    id: string;
    title: string;                    // Үйл явдлын нэр
    description: string;              // Тайлбар
    startDate: string;                // Эхлэх огноо (YYYY-MM-DD)
    endDate?: string;                 // Дуусах огноо (optional, YYYY-MM-DD)
    imageUrls: string[];              // Олон зураг URLs
    videoUrls: string[];              // Олон видео URLs (YouTube)
    order: number;                    // Эрэмбэ (timeline дээр харуулах дараалал)
    isActive: boolean;                // Идэвхтэй эсэх
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

/**
 * Form-д ашиглах type (Timestamp-гүй)
 */
export interface CompanyHistoryEventFormData {
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    imageUrls: string[];
    videoUrls: string[];
    isActive: boolean;
}
