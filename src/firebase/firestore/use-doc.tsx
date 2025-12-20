import { useEffect, useState, useMemo } from "react";
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
  doc,
} from "firebase/firestore";
import { useFirebase } from "..";
import { FirestorePermissionError } from "../errors";


export interface UseDocResult<T = DocumentData> {
  data: (T & { id: string }) | null;
  isLoading: boolean;
  error: FirestoreError | null;
  exists: boolean | null;
}

/**
 * Энгийн useDoc hook.
 * - firestore эсвэл docRef байхгүй үед snapshot нээхгүй
 * - алдааг state-д буцаана, throw хийхгүй
 */
export function useDoc<T = DocumentData>(
  docRef: DocumentReference<T> | null | undefined
): UseDocResult<T> {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setExists(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setData(null);
          setExists(false);
        } else {
          setData({
            id: snapshot.id,
            ...(snapshot.data() as T),
          });
          setExists(true);
        }
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [docRef]);

  return { data, isLoading, error, exists };
}
