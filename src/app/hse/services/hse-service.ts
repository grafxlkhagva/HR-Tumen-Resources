import {
    type Firestore,
    addDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    collection,
    doc,
    serverTimestamp,
} from 'firebase/firestore';
import { type FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function createHseDoc<T extends Record<string, unknown>>(
    firestore: Firestore,
    col: string,
    data: T,
): Promise<string> {
    const refDoc = await addDoc(collection(firestore, col), {
        ...data,
        createdAt: Date.now(),
        _ts: serverTimestamp(),
    });
    return refDoc.id;
}

export async function updateHseDoc<T extends Record<string, unknown>>(
    firestore: Firestore,
    col: string,
    id: string,
    data: Partial<T>,
): Promise<void> {
    await updateDoc(doc(firestore, col, id), data as Record<string, unknown>);
}

/** Тогтмол id-тэй баримтыг merge-ээр бичнэ (тохиргооны ганц баримтад). */
export async function setHseDoc<T extends Record<string, unknown>>(
    firestore: Firestore,
    col: string,
    id: string,
    data: T,
): Promise<void> {
    await setDoc(
        doc(firestore, col, id),
        { ...data, _ts: serverTimestamp() },
        { merge: true },
    );
}

export async function deleteHseDoc(
    firestore: Firestore,
    col: string,
    id: string,
): Promise<void> {
    await deleteDoc(doc(firestore, col, id));
}

/** Файл/зургийг Firebase Storage-д байршуулж download URL буцаана. */
export async function uploadHseFile(
    storage: FirebaseStorage,
    folder: string,
    file: File,
): Promise<string> {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `hse/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}
