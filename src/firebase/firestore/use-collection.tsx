import { useEffect, useState } from "react";
import {
  onSnapshot,
  Query,
  CollectionReference,
  DocumentData,
  FirestoreError,
} from "firebase/firestore";

type TargetRef<T = DocumentData> =
  | Query<T>
  | CollectionReference<T>
  | Query<DocumentData>
  | CollectionReference<DocumentData>
  | null
  | undefined;

export interface UseCollectionResult<T = DocumentData> {
  data: (T & { id: string })[];
  isLoading: boolean;
  error: FirestoreError | null;
}

/**
 * Реал-тайм collection / query-д subscribe хийх энгийн hook.
 * - target байхгүй үед Firestore руу ХҮСЭЛТ ЯВУУЛАХГҮЙ.
 * - Алдаа гарсан ч throw хийхгүй, state-д хадгална.
 */
export function useCollection<T = DocumentData>(
  target: TargetRef<T>
): UseCollectionResult<T> {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!target) {
      setIsLoading(false); // Should be false if no query
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      target as any,
      (snapshot: any) => {
        const docs = snapshot.docs.map(
          (doc: any) =>
          ({
            id: doc.id,
            ref: doc.ref,
            ...doc.data(),
          } as T & { id: string; ref: any })
        );
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [target]);

  return { data, isLoading, error };
}
