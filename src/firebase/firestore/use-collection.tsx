import { useEffect, useState } from "react";
import {
  onSnapshot,
  Query,
  CollectionReference,
  DocumentData,
  FirestoreError,
} from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { useFirebase } from "..";

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
  const [loading, setLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { firestore } = useFirebase();


  useEffect(() => {
    // 🔒 target бэлэн биш үед: ямар ч асуулга явуулахгүй
    if (!target || !firestore) {
      setLoading(false);
      setData([]);
      setError(null);
      return () => {};
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
        let path = "unknown";
        if ("path" in target) {
          path = (target as CollectionReference).path;
        } else if ("_query" in target) {
          path = (target as any)._query.path?.join('/') || "unknown";
        }
        
        console.error(`[useCollection] Firestore permission error on path: ${path}`, err);

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })
        
        setError(contextualError);
        setLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [target, firestore]);

  return { data, loading, error };
}
