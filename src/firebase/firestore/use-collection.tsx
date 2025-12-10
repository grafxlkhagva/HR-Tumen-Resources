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
  // Initialize isLoading based on whether a valid refOrQuery is provided.
  const [isLoading, setIsLoading] = useState(!!refOrQuery);
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // If the reference is not provided, reset state and do nothing.
    if (!refOrQuery || !firestore) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return () => {}; // Return an empty cleanup function
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
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        let path = "unknown_path";
        try {
          if (refOrQuery instanceof CollectionReference) {
            path = refOrQuery.path;
          } else if (refOrQuery instanceof Query) {
            // This is a simplified and safer way to get a representation of the query target.
            // It might not be the full path for complex queries but is safer than internal properties.
            // @ts-ignore - _query is an internal but useful property
            const internalQuery = refOrQuery._query;
            if (internalQuery && internalQuery.path) {
              // Check if path is an object with a segments property
              if (typeof internalQuery.path === 'object' && internalQuery.path.segments) {
                 path = internalQuery.path.segments.join('/');
              } else {
                 // Fallback for different internal structures.
                 // This part is speculative and depends on Firebase internal implementation.
                 path = String(internalQuery.path);
              }
            }
          }
        } catch (e) {
          // In case accessing internal properties fails, we don't crash.
          console.error("Could not determine path for Firestore error reporting:", e);
        }

        console.error(`[useCollection] Firestore permission error on path: ${path}`, err);

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
