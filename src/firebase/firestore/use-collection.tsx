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
  | null
  | undefined;

export interface UseCollectionResult<T = DocumentData> {
  data: (T & { id: string })[];
  loading: boolean;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  // Use path and type to create a stable dependency for the effect
  const dependency = target ? `${target.type}:${(target as any).path}` : null;

  useEffect(() => {
    // 🔒 target бэлэн биш үед: ямар ч асуулга явуулахгүй
    if (!target) {
      setLoading(false);
      setData([]);
      setError(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      target,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as T & { id: string })
        );
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error("[useCollection] Firestore error:", err);
        setError(err);
        setLoading(false);
        // ❗ ЭНД ЯМАР Ч ЮМЫГ THROW ХИЙХГҮЙ.
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency]); // Depend on the stable string representation

  return { data, loading, error };
}
