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
  isLoading: boolean;
  error: FirestoreError | null;
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * - DOES NOT RUN when the target reference is not available.
 * - Does not throw errors, but returns them in the state.
 */
export function useCollection<T = DocumentData>(
  refOrQuery: TargetRef<T>
): UseCollectionResult<T> {
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(!!refOrQuery);
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!refOrQuery || !firestore) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return () => {};
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      refOrQuery,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as T & { id: string })
        );
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        let path = "unknown_path";
        try {
            const target = refOrQuery as any;
            if (target.path) {
                path = target.path;
            } else if (target._query?.path) {
                path = (target._query.path.segments || []).join('/');
            }
        } catch (e) {
          console.error("Could not determine path for Firestore error reporting:", e);
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })
        
        setError(contextualError);
        setData([]);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [refOrQuery, firestore]);

  return { data, isLoading, error };
}
