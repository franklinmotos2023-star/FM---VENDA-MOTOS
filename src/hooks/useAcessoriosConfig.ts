import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AcessoriosConfig } from '../types';

const defaultMarcas = [
  "Riffel", "Vaz", "Magnetron", "Cofap", "Metal Leve (Mahle)", "Pirelli", "Metzeler", 
  "Levorin", "Vipal", "Rinaldi", "Pro Tork", "Givi", "Circuit", "Polivisor", "KMP", 
  "Vedamotors", "Texx", "Valflex", "Scud", "Fly", "Allen", "Procton", "Cobreq", 
  "Diafrag", "SmartCobra", "Wurth", "Taurus", "GSW", "MHX", "ZOUIL", "MOURA", 
  "GTi", "NAKATA", "GP TECH", "SMARTFOX", "MAGGION", "MICHELIN"
].sort();

const defaultMotos = [
  "Honda CG 160 Titan", "Honda CG 160 Fan", "Honda CG 160 Start", "Honda Biz 125", 
  "Honda Biz 110i", "Honda Pop 110i ES", "Honda NXR 160 Bros", "Honda XRE 190", 
  "Honda XRE 300 Sahara", "Honda CB 300F Twister", "Honda PCX 160", "Honda Elite 125", 
  "Honda Sahara 300 Adventure", "Honda CB 1000 Hornet", "Honda XL 750 Transalp", 
  "Honda ADV 160", "Honda NC 750X", "Honda Tornado XR 300L", "Honda CB 650R E-Clutch",
  "Yamaha FZ25 (Fazer 250)", "Yamaha FZ15", "Yamaha Factor 150", "Yamaha Lander 250", 
  "Yamaha Crosser 150", "Yamaha NMAX 160", "Yamaha R15", "Yamaha MT-03", "Yamaha MT-07",
  "Yamaha Neo 125", "Yamaha Fluo ABS", "Yamaha XMAX 250", "Shineray XY 125", 
  "Shineray SHI 175", "Shineray SHI 400sc", "Shineray Phoenix S", "Shineray Jet 125SS", 
  "Shineray Jef 150s", "Shineray Storm 200", "Shineray Urban Lite", "Shineray Free 150",
  "Mottu Sport 110i", "Bajaj Dominar 400", "Bajaj Dominar 160", "Royal Enfield Hunter 350",
  "Royal Enfield Himalayan 450", "Avelloz AZ1", "Avelloz AZ170 Bravo", "Triumph Speed 400", "BMW G 310 GS"
].sort();

export function useAcessoriosConfig() {
  const [config, setConfig] = useState<AcessoriosConfig>({ marcas: defaultMarcas, motos: defaultMotos, categorias: [] });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'acessoriosConfig');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AcessoriosConfig;
        setConfig({
          marcas: data.marcas?.length ? data.marcas : defaultMarcas,
          motos: data.motos?.length ? data.motos : defaultMotos,
          categorias: data.categorias || [],
          whatsappNumber: data.whatsappNumber || ''
        });
      } else {
        // Initialize if not exists
        setDoc(docRef, { marcas: defaultMarcas, motos: defaultMotos, categorias: [], whatsappNumber: '' }).catch(err => console.error(err));
      }
    });

    return () => unsubscribe();
  }, []);

  return config;
}
