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
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [error, setError] = useState<FirestoreError | null>(null);

  // Memoize stable properties of the query/reference to use in the dependency array
  const path = refOrQuery ? (refOrQuery as any).path : null;
  const queryConstraints = refOrQuery ? JSON.stringify((refOrQuery as any)._query?.constraints) : null;

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
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path || 'unknown_path',
        })
        
        setError(contextualError);
        setData([]);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryConstraints, firestore]);

  return { data, isLoading, error };
}
