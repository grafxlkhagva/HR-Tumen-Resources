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
  loading: boolean;
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
  const { firestore } = useFirebase();
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);

  const path = docRef ? docRef.path : null;

  useEffect(() => {
    if (!firestore || !path) {
      setData(null);
      setExists(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    
    // docRef is recreated on each render, so we need to use path to track changes.
    // However, the onSnapshot needs the actual docRef object.
    const docRefCurrent = doc(firestore, path) as DocumentReference<T>;

    const unsubscribe = onSnapshot(
      docRefCurrent,
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
          setLoading(false);
          setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path]);

  return { data, loading, error, exists };
}
