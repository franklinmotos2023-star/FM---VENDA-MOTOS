import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Moto, UserProfile, Acessorio, CartItem, BlackFridayConfig, BlackFridayCoupon } from './types';
import MotoList from './components/MotoList';
import MotoForm from './components/MotoForm';
import FinanceCalculator from './components/FinanceCalculator';
import AdminHistory from './components/AdminHistory';
import AdminRates from './components/AdminRates';
import AdminPurchases from './components/AdminPurchases';
import UserProfileModal from './components/UserProfileModal';
import AcessorioList from './components/AcessorioList';
import AcessorioForm from './components/AcessorioForm';
import CartModal from './components/CartModal';
import OficinaArea from './components/OficinaArea';
import AdminBlackFriday from './components/AdminBlackFriday';
import { DEFAULT_BLACK_FRIDAY_CONFIG, trackBlackFridayEvent } from './services/blackFridayService';
import { Bike, LogIn, LogOut, History, Percent, ShoppingCart, Trash2, ChevronDown, Wrench, MessageCircle, Flame, Copy, Check, Tag } from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, onSnapshot, query, orderBy, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, increment, handleFirestoreError, OperationType } from './firebase';

const ScooterIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Rear Wheel */}
    <circle cx="6" cy="17" r="3" />
    {/* Front Wheel */}
    <circle cx="18" cy="17" r="3" />
    {/* Fork */}
    <path d="M18 14 l-3 -8" />
    {/* Handlebar */}
    <path d="M14 6 h3" />
    {/* Chassis */}
    <path d="M16.5 11.5 c-1 1 -2 2 -3 2 h-3.5 l-2 -2.5 H5.5 c-1 0 -2.5 1 -2.5 2.5 V15" />
    {/* Seat */}
    <path d="M5.5 9 h4.5 l1 2" />
    {/* Swingarm */}
    <path d="M9 17 H6" />
    {/* Headlight */}
    <path d="M16 6 a1 1 0 0 1 2 1" />
  </svg>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'welcome' | 'list' | 'add' | 'edit' | 'finance' | 'acessorios' | 'add_acessorio' | 'edit_acessorio' | 'oficina'>('welcome');
  const [adminTab, setAdminTab] = useState<'estoque' | 'vendas' | 'taxas' | 'compra'>('estoque');
  const [motos, setMotos] = useState<Moto[]>([]);
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [selectedAcessorio, setSelectedAcessorio] = useState<Acessorio | null>(null);
  const [motoToDelete, setMotoToDelete] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [blackFridayConfig, setBlackFridayConfig] = useState<BlackFridayConfig>(DEFAULT_BLACK_FRIDAY_CONFIG);
  const [showAdminBlackFriday, setShowAdminBlackFriday] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<BlackFridayCoupon | null>(() => {
    try {
      const saved = localStorage.getItem('franklin_active_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'blackFriday'), (docSnap) => {
      if (docSnap.exists()) {
        setBlackFridayConfig({ ...DEFAULT_BLACK_FRIDAY_CONFIG, ...docSnap.data() } as BlackFridayConfig);
      }
    }, (err) => {
      console.warn("Firestore error on 'settings/blackFriday' listener, using defaults:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let newView = currentView;
    if (pathname === '/' || pathname === '/promo' || pathname === '/black-friday') newView = 'welcome';
    else if (pathname === '/motos') newView = 'list';
    else if (pathname.startsWith('/motos/adicionar')) newView = 'add';
    else if (pathname.startsWith('/motos/simular/')) {
       newView = 'finance';
       const id = pathname.split('/').pop();
       if (motos.length > 0) {
         const m = motos.find(m => m.id === id);
         if (m && (!m.arquivada || isAdmin)) {
           if (!selectedMoto || selectedMoto.id !== id || JSON.stringify(selectedMoto) !== JSON.stringify(m)) {
             setSelectedMoto(m);
           }
         }
       }
    }
    else if (pathname.includes('/editar') && pathname.startsWith('/motos')) {
       newView = 'edit';
       const id = pathname.split('/').slice(-2, -1)[0]; // /motos/id/editar
       if (motos.length > 0) {
         const m = motos.find(m => m.id === id);
         if (m) {
           if (!selectedMoto || selectedMoto.id !== id || JSON.stringify(selectedMoto) !== JSON.stringify(m)) {
             setSelectedMoto(m);
           }
         }
       }
    }
    else if (pathname.match(/^\/motos\/[^/]+$/)) {
       newView = 'list';
       const id = pathname.split('/').pop();
       if (motos.length > 0) {
         const m = motos.find(m => m.id === id);
         if (m && (!m.arquivada || isAdmin)) {
           if (!selectedMoto || selectedMoto.id !== id || JSON.stringify(selectedMoto) !== JSON.stringify(m)) {
             setSelectedMoto(m);
           }
         }
       }
    }
    else if (pathname === '/acessorios') newView = 'acessorios';
    else if (pathname.startsWith('/acessorios/adicionar')) newView = 'add_acessorio';
    else if (pathname.includes('/editar') && pathname.startsWith('/acessorios')) {
       newView = 'edit_acessorio';
       const id = pathname.split('/').slice(-2, -1)[0];
       if (acessorios.length > 0) {
         const a = acessorios.find(a => a.id === id);
         if (a && (!selectedAcessorio || selectedAcessorio.id !== id)) setSelectedAcessorio(a);
       }
    }
    else if (pathname.match(/^\/acessorios\/[^/]+$/)) {
       newView = 'acessorios';
       const id = pathname.split('/').pop();
       if (acessorios.length > 0) {
         const a = acessorios.find(a => a.id === id);
         if (a && (!selectedAcessorio || selectedAcessorio.id !== id)) setSelectedAcessorio(a);
       }
    }
    else if (pathname === '/oficina' || pathname.startsWith('/oficina')) {
       newView = 'oficina';
    }

    if (newView !== currentView) {
      setCurrentView(newView);
    }
  }, [pathname, motos, acessorios, selectedMoto, selectedAcessorio, isAdmin, currentView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initialMotos: Moto[] = [
      {
        id: 'pnn8564',
        placa: 'PNN8564',
        marcaModelo: 'YAMAHA/NMAX',
        anoFabricacao: 2018,
        anoModelo: 2018,
        quilometragem: '30.000km',
        precoAVista: 15000,
        statusRevisao: 'REVISADA',
        statusDut: 'DUT INCLUSO',
        fotos: ['https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800']
      },
      {
        id: 'pnb3196',
        placa: 'PNB3196',
        marcaModelo: 'HONDA/PCX 150',
        anoFabricacao: 2015,
        anoModelo: 2015,
        quilometragem: '45.000km',
        precoAVista: 12000,
        statusRevisao: 'REVISADA',
        statusDut: 'DUT INCLUSO',
        fotos: ['https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?auto=format&fit=crop&q=80&w=800']
      },
      {
        id: 'poh2997',
        placa: 'POH2997',
        marcaModelo: 'HONDA/CG 160',
        anoFabricacao: 2018,
        anoModelo: 2018,
        quilometragem: '25.000km',
        precoAVista: 13500,
        statusRevisao: 'REVISADA',
        statusDut: 'DUT INCLUSO',
        fotos: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800']
      }
    ];

    const initialAcessorios: Acessorio[] = [
      {
        id: 'fallback-capacete',
        nome: 'Capacete Pro',
        aplicacao: 'Geral',
        descricao: 'Capacete de alta segurança e ventilação',
        preco: 180,
        emPromocao: false,
        estoque: 10,
        fotos: []
      }
    ];

    const q = query(collection(db, 'motos'), orderBy('marcaModelo'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const motosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moto));
      setMotos(motosData);
      
      // Seeding logic: if admin and no motos, add initial ones
      if (isAdmin && motosData.length === 0) {
        initialMotos.forEach(async (moto) => {
          const { id, ...data } = moto;
          await setDoc(doc(collection(db, 'motos')), data);
        });
      }
    }, (error) => {
      console.warn("Firestore error on 'motos' snapshot listener, using fallback data:", error);
      setMotos(initialMotos);
    });

    const qAcessorios = query(collection(db, 'acessorios'), orderBy('nome'));
    const unsubscribeAcessorios = onSnapshot(qAcessorios, (snapshot) => {
      const acessoriosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Acessorio));
      setAcessorios(acessoriosData);
    }, (error) => {
      console.warn("Firestore error on 'acessorios' snapshot listener, using fallback data:", error);
      setAcessorios(initialAcessorios);
    });

    return () => {
      unsubscribe();
      unsubscribeAcessorios();
    };
  }, [isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Strictly only this email is allowed to be admin
        const isDefaultAdmin = firebaseUser.email === 'franklinmotos2023@gmail.com';
        setIsAdmin(isDefaultAdmin);

        if (isDefaultAdmin) {
          setCurrentView(prev => prev === 'welcome' ? 'list' : prev);
        }
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let currentData: any = {};
          if (userDoc.exists()) {
            currentData = userDoc.data();
            setUserData(currentData);
            if (!currentData.nome || !currentData.cpf || !currentData.cep || !currentData.telefone) {
              setShowProfileModal(true);
            }
          } else {
            setShowProfileModal(true);
          }

          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: isDefaultAdmin ? 'admin' : (currentData.role || 'user')
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Migration script for existing accessories
  useEffect(() => {
    const migrateAccessories = async () => {
      if (!isAdmin || acessorios.length === 0) return;
      
      for (const acessorio of acessorios) {
        if (!acessorio.categoria) {
          let newCategoria = 'Acessórios';
          const nomeLower = acessorio.nome.toLowerCase();
          
          if (nomeLower.includes('capacete')) {
            newCategoria = 'Capacetes';
          } else if (nomeLower.includes('motor') || nomeLower.includes('vela') || nomeLower.includes('filtro')) {
            newCategoria = 'Kit Transmissão';
          } else if (nomeLower.includes('led') || nomeLower.includes('farol') || nomeLower.includes('bateria')) {
            newCategoria = 'Peças Elétricas';
          } else if (nomeLower.includes('carenagem') || nomeLower.includes('paralama') || nomeLower.includes('retrovisor')) {
            newCategoria = 'Carenagem';
          }

          try {
            await updateDoc(doc(db, 'acessorios', acessorio.id), {
              categoria: newCategoria
            });
          } catch (error) {
            console.error("Migration error:", error);
          }
        }
      }
    };

    migrateAccessories();
  }, [acessorios, isAdmin]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login error:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/motos');
      setAdminTab('estoque');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAddMoto = () => {
    navigate('/motos/adicionar');
  };

  const handleEditMoto = (moto: Moto) => {
    navigate(`/motos/${moto.id}/editar`);
  };

  const handleDeleteMoto = (id: string) => {
    setMotoToDelete(id);
  };

  const confirmDeleteMoto = async () => {
    if (!motoToDelete) return;
    try {
      await deleteDoc(doc(db, 'motos', motoToDelete));
      setMotoToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `motos/${motoToDelete}`);
    }
  };

  const handleSaveMoto = async (motoData: Omit<Moto, 'id'>) => {
    try {
      if (currentView === 'edit' && selectedMoto) {
        await setDoc(doc(db, 'motos', selectedMoto.id), motoData);
        // Sync 'arquivada' state to matching purchase record if placa exists
        if (motoData.placa) {
          const querySnapshot = await getDocs(collection(db, 'purchases'));
          const matchingDoc = querySnapshot.docs.find(doc => doc.data().motoInfo?.placa === motoData.placa);
          if (matchingDoc) {
            await updateDoc(doc(db, 'purchases', matchingDoc.id), {
              arquivada: motoData.arquivada || false,
              precoVendaSugerido: motoData.precoAVista || 0
            });
          }
        }
      } else {
        await setDoc(doc(collection(db, 'motos')), {
          ...motoData,
          arquivada: motoData.arquivada || false
        });
      }
      navigate('/motos');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'motos');
    }
  };

  const handleSaveAcessorio = async (acessorioData: Omit<Acessorio, 'id'>) => {
    try {
      if (currentView === 'edit_acessorio' && selectedAcessorio) {
        await setDoc(doc(db, 'acessorios', selectedAcessorio.id), acessorioData);
      } else {
        await setDoc(doc(collection(db, 'acessorios')), acessorioData);
      }
      navigate('/acessorios');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'acessorios');
    }
  };

  const handleDeleteAcessorio = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'acessorios', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `acessorios/${id}`);
    }
  };

  const handleToggleArchiveAcessorio = async (acessorio: Acessorio) => {
    try {
      await updateDoc(doc(db, 'acessorios', acessorio.id), {
        isArchived: !acessorio.isArchived
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `acessorios/${acessorio.id}`);
    }
  };

  const handleAddStockAcessorio = async (acessorio: Acessorio) => {
    try {
      await updateDoc(doc(db, 'acessorios', acessorio.id), {
        estoque: increment(acessorio.estoque) // The quantity to add is passed in the estoque field from the modal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `acessorios/${acessorio.id}`);
    }
  };

  const handleCancelAdd = () => {
    navigate('/motos');
  };

  const handleFinance = (moto: Moto) => {
    navigate(`/motos/simular/${moto.id}`);
  };

  const handleConfirmFinance = () => {
    navigate('/motos');
    setAdminTab('vendas');
  };

  const handleCompleteSale = () => {
    navigate('/motos');
  };

  const handleAddToCart = (acessorio: Acessorio) => {
    setCart(prev => {
      const existing = prev.find(item => item.acessorio.id === acessorio.id);
      if (existing) {
        if (existing.quantidade >= acessorio.estoque) return prev;
        return prev.map(item => 
          item.acessorio.id === acessorio.id 
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { acessorio, quantidade: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (acessorioId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.acessorio.id === acessorioId) {
        const newQuantity = Math.max(1, Math.min(item.quantidade + delta, item.acessorio.estoque));
        return { ...item, quantidade: newQuantity };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (acessorioId: string) => {
    setCart(prev => prev.filter(item => item.acessorio.id !== acessorioId));
  };

  const handleCopyCoupon = (coupon: BlackFridayCoupon) => {
    const code = coupon.code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore fallback copy error
      }
      document.body.removeChild(textarea);
    }
    setActiveCoupon(coupon);
    try {
      localStorage.setItem('franklin_active_coupon', JSON.stringify(coupon));
    } catch {
      // ignore storage errors
    }
    setCopiedCoupon(code);
    trackBlackFridayEvent('copy_coupon', { coupon: code, source: 'welcome' });
    setTimeout(() => {
      setCopiedCoupon(prev => (prev === code ? null : prev));
    }, 2500);
  };

  const handleClearActiveCoupon = () => {
    setActiveCoupon(null);
    try {
      localStorage.removeItem('franklin_active_coupon');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <>
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-4"
          >
            <img 
              src="/logo.png" 
              alt="Franklin Motos" 
              className="h-10 md:h-12 w-auto object-contain mb-8 drop-shadow-[0_0_25px_rgba(234,88,12,0.4)]" 
            />
            <motion.div
              animate={{
                x: [-15, 15, -15],
                y: [0, -2, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative text-orange-600 mb-6"
            >
              <ScooterIcon size={80} className="drop-shadow-[0_0_15px_rgba(234,88,12,0.5)]" />
              <motion.div 
                className="absolute -bottom-2 -left-4 w-16 h-1 bg-white/20 blur-sm rounded-full"
                animate={{ x: [-20, 50], opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div 
                className="absolute -bottom-1 -left-2 w-10 h-1 bg-white/20 blur-sm rounded-full"
                animate={{ x: [-30, 40], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              />
            </motion.div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest text-center px-4">
              Carregando...
              <span className="block text-orange-600 text-sm mt-2 tracking-widest">Estamos acelerando por você</span>
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#080808] font-body text-white selection:bg-[#FF4D00] selection:text-black flex flex-col justify-between">
        <div>
        {/* Header */}
        <header className="bg-[#080808]/95 border-b border-[#262626] sticky top-0 z-50 backdrop-blur-xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-2 flex items-center justify-between gap-4">
          
          {/* Left Area: Logo Franklin Motos Catálogo Online + Black Friday Franklin Motos, os menores preços do Ceará */}
          <div 
            className="flex items-center gap-3 md:gap-4 cursor-pointer shrink-0 group py-1 min-w-0" 
            onClick={() => { navigate('/'); setAdminTab('estoque'); }}
          >
            <img 
              src="/logo.png" 
              alt="Franklin Motos" 
              className="h-9 md:h-11 w-auto object-contain transition-transform group-hover:scale-105 duration-200 shrink-0" 
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-display font-black text-sm md:text-base uppercase tracking-wide text-white whitespace-nowrap">
                Catálogo Online
              </span>
              <span className="text-[10px] md:text-[11px] font-semibold text-[#FF4D00] tracking-wide truncate max-w-[180px] sm:max-w-none">
                Black Friday Franklin Motos, os menores preços do Ceará
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs (Início, Motos & Peças) */}
          <div className="hidden lg:flex bg-[#141414] rounded-xl p-1 border border-[#262626] shrink-0">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap shrink-0 ${
                currentView === 'welcome'
                  ? 'bg-[#FF4D00] text-black font-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                  : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => { navigate('/motos'); setAdminTab('estoque'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap shrink-0 ${
                currentView === 'list' && adminTab === 'estoque'
                  ? 'bg-[#FF4D00] text-black font-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                  : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
              }`}
            >
              <Bike size={15} /> Motos
            </button>
            <button
              onClick={() => navigate('/acessorios')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap shrink-0 ${
                currentView === 'acessorios'
                  ? 'bg-[#FF4D00] text-black font-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                  : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
              }`}
            >
              <Wrench size={15} /> Peças
            </button>
          </div>

          {/* Right Navigation Area */}
          <nav className="flex items-center gap-1.5 md:gap-3 min-w-0 shrink-0">
            {isAdmin && (
              <div className="hidden xl:flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 shrink-0">
                <button
                  onClick={() => { navigate('/motos'); setAdminTab('vendas'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
                    adminTab === 'vendas' && currentView === 'list'
                      ? 'bg-[#FF4D00] text-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                      : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
                  }`}
                >
                  <History size={14} /> Vendas
                </button>
                <button
                  onClick={() => { navigate('/motos'); setAdminTab('compra'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
                    adminTab === 'compra' && currentView === 'list'
                      ? 'bg-[#FF4D00] text-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                      : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
                  }`}
                >
                  <ShoppingCart size={14} /> Compra
                </button>
                <button
                  onClick={() => { navigate('/motos'); setAdminTab('taxas'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
                    adminTab === 'taxas' && currentView === 'list'
                      ? 'bg-[#FF4D00] text-black shadow-[0_0_15px_rgba(255,77,0,0.3)]' 
                      : 'text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800'
                  }`}
                >
                  <Percent size={14} /> Taxas
                </button>
                <button
                  onClick={() => setShowAdminBlackFriday(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap text-[#FF4D00] hover:bg-zinc-800"
                >
                  <Flame size={14} /> Black
                </button>
              </div>
            )}

            {/* Mobile & Tablet Navigation Dropdown */}
            <div className="relative xl:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider"
              >
                {currentView === 'welcome' && <>Início</>}
                {currentView === 'acessorios' && <><Wrench size={14} /> Peças</>}
                {currentView === 'list' && adminTab === 'estoque' && <><Bike size={14} /> Motos</>}
                {currentView === 'list' && adminTab === 'vendas' && <><History size={14} /> Vendas</>}
                {currentView === 'list' && adminTab === 'compra' && <><ShoppingCart size={14} /> Compra</>}
                {currentView === 'list' && adminTab === 'taxas' && <><Percent size={14} /> Taxas</>}
                {currentView !== 'welcome' && currentView !== 'acessorios' && currentView !== 'list' && <>Menu</>}
                <ChevronDown size={14} className={`transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMobileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => { navigate('/'); setAdminTab('estoque'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                      currentView === 'welcome' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    Início
                  </button>
                  <button
                    onClick={() => { navigate('/motos'); setAdminTab('estoque'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                      adminTab === 'estoque' && currentView === 'list' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Bike size={16} /> Motos
                  </button>
                  <button
                    onClick={() => { navigate('/acessorios'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                      currentView === 'acessorios' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Wrench size={16} /> Peças
                  </button>
                  {isAdmin && (
                    <div className="border-t border-zinc-800">
                      <button
                        onClick={() => { navigate('/motos'); setAdminTab('vendas'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'vendas' && currentView === 'list' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <History size={16} /> Vendas
                      </button>
                      <button
                        onClick={() => { navigate('/motos'); setAdminTab('compra'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'compra' && currentView === 'list' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <ShoppingCart size={16} /> Compra
                      </button>
                      <button
                        onClick={() => { navigate('/motos'); setAdminTab('taxas'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'taxas' && currentView === 'list' ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <Percent size={16} /> Taxas
                      </button>
                      <button
                        onClick={() => { setShowAdminBlackFriday(true); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider text-[#FF4D00] hover:bg-zinc-800"
                      >
                        <Flame size={16} /> Configurar Black
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="hidden md:block h-8 w-px bg-zinc-800 mx-1" />

            <div className="flex items-center gap-1.5 md:gap-3">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 md:p-2.5 bg-zinc-900 text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"
                title="Carrinho"
              >
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-[#FF4D00] text-black text-[9px] md:text-[10px] font-black w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-black">
                    {cart.reduce((a, b) => a + b.quantidade, 0)}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isAdmin ? 'Admin' : 'Cliente'}</span>
                    <span className="text-xs font-black text-white truncate max-w-[110px]">{user.displayName || user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 md:p-2.5 bg-zinc-900 text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="p-2 md:p-2.5 bg-zinc-900 text-zinc-400 hover:text-[#FF4D00] hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Login Admin"
                >
                  <LogIn className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 print:p-0 print:max-w-none">
        
        {currentView === 'welcome' && (
          <div className="flex flex-col items-center justify-center min-h-[68vh] relative py-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-[#FF4D00]/10 blur-[120px] pointer-events-none rounded-full" />

            <div className="text-center space-y-10 max-w-4xl w-full px-2 sm:px-4 relative z-10">
              {/* Letreiro Black Friday lá em cima */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#141414] via-[#1f120b] to-[#141414] border border-[#FF4D00]/50 rounded-2xl px-6 py-5 md:py-7 shadow-[0_0_40px_rgba(255,77,0,0.18)]">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 0.95, 1.15, 1], rotate: [0, -6, 6, -4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex text-[#FF4D00]"
                    >
                      <Flame size={28} />
                    </motion.span>
                    <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white leading-none">
                      BLACK FRIDAY DA <span className="text-[#FF4D00]">FRANKLIN MOTOS</span>
                    </h1>
                    <motion.span
                      animate={{ scale: [1, 1.2, 0.95, 1.15, 1], rotate: [0, 6, -6, 4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex text-[#FF4D00]"
                    >
                      <Flame size={28} />
                    </motion.span>
                  </div>
                </div>

                {/* Subtítulo embaixo */}
                <p className="text-lg sm:text-2xl font-display font-bold text-zinc-200 uppercase tracking-wider">
                  Qual promoção você quer aproveitar?
                </p>
              </div>

              {/* Esquerda: Black Friday Motos | Direita: Black Friday Peças e Acessórios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.button
                  onClick={() => navigate('/motos')}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-8 md:p-10 bg-[#191919] border-2 border-[#262626] hover:border-[#FF4D00] rounded-3xl group transition-colors duration-200 shadow-2xl hover:shadow-[0_0_35px_rgba(255,77,0,0.2)] flex flex-col items-center justify-center gap-6 text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-black border border-[#262626] group-hover:border-[#FF4D00]/60 flex items-center justify-center text-zinc-300 group-hover:text-[#FF4D00] transition-colors">
                    <Bike size={46} />
                  </div>
                  <div className="space-y-2">
                    <span className="font-display font-black text-white text-2xl sm:text-3xl tracking-wide uppercase block group-hover:text-[#FF4D00] transition-colors">
                      Black Friday Motos
                    </span>
                    <span className="text-sm text-zinc-400 block">
                      Ofertas imperdíveis em motos e scooters revisadas com garantia
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/acessorios')}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-8 md:p-10 bg-[#191919] border-2 border-[#262626] hover:border-[#FF4D00] rounded-3xl group transition-colors duration-200 shadow-2xl hover:shadow-[0_0_35px_rgba(255,77,0,0.2)] flex flex-col items-center justify-center gap-6 text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-black border border-[#262626] group-hover:border-[#FF4D00]/60 flex items-center justify-center text-zinc-300 group-hover:text-[#FF4D00] transition-colors">
                    <Wrench size={46} />
                  </div>
                  <div className="space-y-2">
                    <span className="font-display font-black text-white text-2xl sm:text-3xl tracking-wide uppercase block group-hover:text-[#FF4D00] transition-colors">
                      Black Friday Peças e Acessórios
                    </span>
                    <span className="text-sm text-[#FF4D00] font-semibold block">
                      Todas as peças com 10% de desconto na Black Friday
                    </span>
                  </div>
                </motion.button>
              </div>

              {/* Área de Cupons de Desconto Black Friday */}
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  <Tag size={14} className="text-[#FF4D00]" />
                  <span>Cupons Black Friday · Clique para copiar</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
                  {blackFridayConfig.coupons.filter(c => c.active).slice(0, 3).map((coupon) => {
                    const isCopied = copiedCoupon === coupon.code;
                    const isActive = activeCoupon?.code === coupon.code;
                    return (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => handleCopyCoupon(coupon)}
                        className={`group relative flex flex-col justify-between gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
                          isCopied || isActive
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                            : 'bg-[#141414] border-dashed border-[#2f2f2f] hover:border-[#FF4D00] hover:bg-[#191919] shadow-lg hover:shadow-[0_0_25px_rgba(255,77,0,0.18)]'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-[#FF4D00]/15 text-[#FF4D00] text-[10px] font-black uppercase tracking-wider">
                            {coupon.tag || 'CUPOM'}
                          </span>
                          <p className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight leading-snug group-hover:text-[#FF4D00] transition-colors">
                            {coupon.discountText}
                          </p>
                        </div>

                        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                          isCopied || isActive
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-black border-[#262626] group-hover:border-[#FF4D00]/40 text-white'
                        }`}>
                          <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-[#FF4D00]">
                            {coupon.code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                            {isCopied ? (
                              <>
                                <Check size={13} className="text-emerald-400" /> Copiado!
                              </>
                            ) : isActive ? (
                              <>
                                <Check size={13} className="text-emerald-400" /> Ativo
                              </>
                            ) : (
                              <>
                                <Copy size={13} className="text-zinc-400 group-hover:text-[#FF4D00]" /> Copiar
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {activeCoupon && (
                  <p className="text-xs text-emerald-400 font-semibold">
                    Cupom <span className="font-mono font-black">{activeCoupon.code}</span> ativo — ele será aplicado automaticamente ao clicar nas ofertas de motos ou finalizar no carrinho.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'acessorios' && (
          <AcessorioList
            acessorios={acessorios}
            isAdmin={isAdmin}
            onAdd={() => setCurrentView('add_acessorio')}
            onEdit={(acessorio) => {
              setSelectedAcessorio(acessorio);
              setCurrentView('edit_acessorio');
            }}
            onDelete={handleDeleteAcessorio}
            onAddToCart={handleAddToCart}
            onToggleArchive={handleToggleArchiveAcessorio}
            onAddStock={handleAddStockAcessorio}
          />
        )}

        {(currentView === 'add_acessorio' || currentView === 'edit_acessorio') && (
          <AcessorioForm
            acessorio={selectedAcessorio}
            onSave={handleSaveAcessorio}
            onCancel={() => {
              setCurrentView('acessorios');
              setSelectedAcessorio(null);
            }}
          />
        )}

        {currentView === 'list' && adminTab === 'estoque' && (
          <MotoList
            motos={motos.filter(m => !m.arquivada)}
            onAddMoto={handleAddMoto}
            onFinance={handleFinance}
            isAdmin={isAdmin}
            onEditMoto={handleEditMoto}
            onDeleteMoto={handleDeleteMoto}
            activeCoupon={activeCoupon}
            onClearCoupon={handleClearActiveCoupon}
          />
        )}

        {currentView === 'list' && adminTab === 'vendas' && isAdmin && (
          <AdminHistory motos={motos} />
        )}

        {currentView === 'list' && adminTab === 'taxas' && isAdmin && (
          <AdminRates motos={motos} />
        )}

        {currentView === 'list' && adminTab === 'compra' && isAdmin && (
          <AdminPurchases motos={motos} />
        )}

        {(currentView === 'add' || currentView === 'edit') && (
          <MotoForm 
            onSave={handleSaveMoto} 
            onCancel={handleCancelAdd} 
            initialData={selectedMoto || undefined}
          />
        )}

        {currentView === 'finance' && selectedMoto && (
          <FinanceCalculator
            moto={selectedMoto}
            onConfirm={handleConfirmFinance}
            onCancel={() => navigate('/motos')}
            isAdmin={isAdmin}
            userData={userData}
          />
        )}

        {currentView === 'oficina' && (
          <OficinaArea
            initialSubTab={pathname.includes('agendamento') || pathname.includes('manutencao') ? 'manutencao' : 'historia'}
            onNavigateHome={() => navigate('/motos')}
          />
        )}
      </main>

      {/* Floating Action Button (WhatsApp / Contato) */}
      <a
        href="https://wa.me/558532332200?text=Olá, gostaria de tirar uma dúvida sobre o catálogo online."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center print:hidden group"
      >
        <MessageCircle size={28} />
        <span className="absolute right-full mr-4 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap bg-zinc-900 border border-zinc-800 px-0 py-2 rounded-xl text-xs font-bold text-white group-hover:px-4">
          Tira Dúvidas / Contato
        </span>
        </a>
          </div>

          {/* Unified Footer */}
          <footer className="bg-black py-12 border-t border-[#262626] text-zinc-400 text-xs mt-16 print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <img src="/logo.png" alt="Franklin Motos" className="h-8 w-auto object-contain" />
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Franklin Motos — A maior referência em compra, venda, troca e manutenção especializada de motocicletas e scooters de Fortaleza.
                  </p>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p><strong>CNPJ:</strong> 08.967.579/0001-78</p>
                    <p><strong>Endereço:</strong> Av. Carneiro de Mendonça, 1606 - Demócrito Rocha, Fortaleza - CE</p>
                    <p><strong>WhatsApp:</strong> (85) 3233-2200</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">Navegação</h4>
                  <ul className="space-y-2">
                    <li><button onClick={() => navigate('/')} className="hover:text-[#FF4D00] transition-colors">Início — Black Friday</button></li>
                    <li><button onClick={() => navigate('/motos')} className="hover:text-[#FF4D00] transition-colors">Black Friday Motos</button></li>
                    <li><button onClick={() => navigate('/acessorios')} className="hover:text-[#FF4D00] transition-colors">Black Friday Peças e Acessórios</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">Horário</h4>
                  <ul className="space-y-1.5 text-zinc-400">
                    <li>Segunda a Sexta: 08:00 às 18:00</li>
                    <li>Sábado: 08:00 às 13:00</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">Segurança</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Loja física estabelecida em Fortaleza com laudo cautelar e garantia em todas as motocicletas comercializadas.
                  </p>
                </div>
              </div>
              <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
                <p>© {new Date().getFullYear()} Franklin Motos. Todos os direitos reservados.</p>
                <p>FRANKLIN BLACK — O PREÇO CAIU. A CHANCE ACELEROU.</p>
              </div>
            </div>
          </footer>
        </div>

      {/* Admin Black Friday Modal */}
      {showAdminBlackFriday && (
        <AdminBlackFriday
          config={blackFridayConfig}
          motos={motos}
          onClose={() => setShowAdminBlackFriday(false)}
          onSaveConfig={(updated) => setBlackFridayConfig(updated)}
        />
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <CartModal
          cart={cart}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={() => setCart([])}
          activeCoupon={activeCoupon}
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && user && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onSave={(data) => {
            setUserData(data);
            setShowProfileModal(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {motoToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-600/20 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Excluir Moto?</h3>
              <p className="text-zinc-400 text-sm mt-2">Esta ação não pode ser desfeita. A moto será removida permanentemente do estoque.</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setMotoToDelete(null)}
                className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteMoto}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
