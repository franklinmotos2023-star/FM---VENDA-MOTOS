import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AcessoriosConfig } from '../types';

export function useAcessoriosConfig() {
  const [config, setConfig] = useState<AcessoriosConfig>({ marcas: [], motos: [] });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'acessoriosConfig');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AcessoriosConfig);
      } else {
        // Initialize if not exists
        setDoc(docRef, { marcas: [], motos: [] }).catch(err => console.error(err));
      }
    });

    return () => unsubscribe();
  }, []);

  return config;
}
