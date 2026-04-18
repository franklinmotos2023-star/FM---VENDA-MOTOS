import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AcessoriosConfig } from '../types';

export function useAcessoriosConfig() {
  const [config, setConfig] = useState<AcessoriosConfig>({ marcas: [], motos: [], categorias: [] });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'acessoriosConfig');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AcessoriosConfig;
        setConfig({
          marcas: data.marcas || [],
          motos: data.motos || [],
          categorias: data.categorias || []
        });
      } else {
        // Initialize if not exists
        setDoc(docRef, { marcas: [], motos: [], categorias: [] }).catch(err => console.error(err));
      }
    });

    return () => unsubscribe();
  }, []);

  return config;
}
