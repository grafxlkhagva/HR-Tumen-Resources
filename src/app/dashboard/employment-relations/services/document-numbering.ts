import { Firestore, doc, getDoc, runTransaction } from 'firebase/firestore';
import { generateDocCode, calculateNextDocNumber } from '../utils';
import { ERDocumentType } from '../types';

/**
 * Дараагийн баримтын дугаарыг авах (атомик үйлдэл)
 * Firestore transaction ашиглан дугаарыг өгөх ба counter-ийг шинэчлэх
 * 
 * @param firestore - Firestore instance
 * @param documentTypeId - Баримтын төрлийн ID
 * @returns Шинэ баримтын дугаар (жнь: "ГЭР-2026-0001")
 */
export async function getNextDocumentNumber(
    firestore: Firestore,
    documentTypeId: string
): Promise<string> {
    const docTypeRef = doc(firestore, 'er_process_document_types', documentTypeId);
    
    return await runTransaction(firestore, async (transaction) => {
        const docTypeSnap = await transaction.get(docTypeRef);
        
        if (!docTypeSnap.exists()) {
            throw new Error('Баримтын төрөл олдсонгүй');
        }
        
        const docTypeData = docTypeSnap.data() as ERDocumentType;
        
        if (!docTypeData.prefix) {
            throw new Error('Баримтын төрлийн үсгэн код (prefix) тохируулаагүй байна');
        }
        
        const { nextNumber, currentYear } = calculateNextDocNumber(
            docTypeData.currentNumber || 0,
            docTypeData.lastNumberYear || 0
        );
        
        // Counter-ийг шинэчлэх
        transaction.update(docTypeRef, {
            currentNumber: nextNumber,
            lastNumberYear: currentYear,
            updatedAt: new Date()
        });
        
        // Дугаар үүсгэх
        return generateDocCode(docTypeData.prefix, currentYear, nextNumber);
    });
}

/**
 * Баримтын төрлийн мэдээлэл авах
 * 
 * @param firestore - Firestore instance
 * @param documentTypeId - Баримтын төрлийн ID
 * @returns ERDocumentType эсвэл null
 */
export async function getDocumentType(
    firestore: Firestore,
    documentTypeId: string
): Promise<ERDocumentType | null> {
    const docTypeRef = doc(firestore, 'er_process_document_types', documentTypeId);
    const docTypeSnap = await getDoc(docTypeRef);
    
    if (!docTypeSnap.exists()) {
        return null;
    }
    
    return { id: docTypeSnap.id, ...docTypeSnap.data() } as ERDocumentType;
}

/**
 * Дараагийн дугаарыг урьдчилан харах (counter-ийг өөрчлөхгүй)
 * 
 * @param firestore - Firestore instance
 * @param documentTypeId - Баримтын төрлийн ID
 * @returns Дараагийн дугаар (жнь: "ГЭР-2026-0002") эсвэл null
 */
export async function previewNextDocumentNumber(
    firestore: Firestore,
    documentTypeId: string
): Promise<string | null> {
    const docType = await getDocumentType(firestore, documentTypeId);
    
    if (!docType || !docType.prefix) {
        return null;
    }
    
    const { nextNumber, currentYear } = calculateNextDocNumber(
        docType.currentNumber || 0,
        docType.lastNumberYear || 0
    );
    
    return generateDocCode(docType.prefix, currentYear, nextNumber);
}
