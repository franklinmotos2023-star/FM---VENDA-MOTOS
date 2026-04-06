import React, { useState, useEffect } from 'react';
import { Moto, UserProfile } from './types';
import MotoList from './components/MotoList';
import MotoForm from './components/MotoForm';
import FinanceCalculator from './components/FinanceCalculator';
import AdminHistory from './components/AdminHistory';
import AdminRates from './components/AdminRates';
import AdminPurchases from './components/AdminPurchases';
import UserProfileModal from './components/UserProfileModal';
import { Bike, LogIn, LogOut, User as UserIcon, History, Percent, Package, ShoppingCart, Trash2, Menu, ChevronDown } from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, onSnapshot, query, orderBy, doc, setDoc, getDoc, deleteDoc, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit' | 'finance'>('list');
  const [adminTab, setAdminTab] = useState<'estoque' | 'historico' | 'taxas' | 'compra'>('estoque');
  const [motos, setMotos] = useState<Moto[]>([]);
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [motoToDelete, setMotoToDelete] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'motos'), orderBy('marcaModelo'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const motosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moto));
      setMotos(motosData);
      
      // Seeding logic: if admin and no motos, add initial ones
      if (isAdmin && motosData.length === 0) {
        const initialMotos = [
          {
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
        initialMotos.forEach(async (moto) => {
          await setDoc(doc(collection(db, 'motos')), moto);
        });
      }
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Strictly only this email is allowed to be admin
        const isDefaultAdmin = firebaseUser.email === 'franklinmotos2023@gmail.com';
        setIsAdmin(isDefaultAdmin);
        
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
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAddMoto = () => {
    setSelectedMoto(null);
    setCurrentView('add');
  };

  const handleEditMoto = (moto: Moto) => {
    setSelectedMoto(moto);
    setCurrentView('edit');
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
      } else {
        await setDoc(doc(collection(db, 'motos')), motoData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'motos');
    }
  };

  const handleCancelAdd = () => {
    setCurrentView('list');
    setSelectedMoto(null);
  };

  const handleFinance = (moto: Moto) => {
    setSelectedMoto(moto);
    setCurrentView('finance');
  };

  const handleConfirmFinance = () => {
    setCurrentView('list');
    setAdminTab('historico');
  };

  const handleCompleteSale = () => {
    setCurrentView('list');
    setSelectedMoto(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-orange-500 selection:text-black">
      {/* Header */}
      <header className="bg-black border-b border-orange-600 shadow-2xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex flex-col cursor-pointer" onClick={() => setCurrentView('list')}>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
              Franklin <span className="text-orange-600">Motos</span>
            </h1>
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              Especialista em Scooter
            </span>
          </div>
          <nav className="flex items-center gap-3 md:gap-6">
            {isAdmin ? (
              <>
                {/* Desktop Tabs */}
                <div className="hidden md:flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                  <button
                    onClick={() => { setCurrentView('list'); setAdminTab('estoque'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      adminTab === 'estoque' && currentView === 'list'
                        ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                        : 'text-zinc-400 hover:text-orange-500'
                    }`}
                  >
                    <Package size={16} /> Estoque
                  </button>
                  <button
                    onClick={() => { setCurrentView('list'); setAdminTab('historico'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      adminTab === 'historico' 
                        ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                        : 'text-zinc-400 hover:text-orange-500'
                    }`}
                  >
                    <History size={16} /> Histórico
                  </button>
                  <button
                    onClick={() => { setCurrentView('list'); setAdminTab('compra'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      adminTab === 'compra' 
                        ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                        : 'text-zinc-400 hover:text-orange-500'
                    }`}
                  >
                    <ShoppingCart size={16} /> Compra
                  </button>
                  <button
                    onClick={() => { setCurrentView('list'); setAdminTab('taxas'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      adminTab === 'taxas' 
                        ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                        : 'text-zinc-400 hover:text-orange-500'
                    }`}
                  >
                    <Percent size={16} /> Taxas
                  </button>
                </div>

                {/* Mobile Tabs Dropdown */}
                <div className="relative md:hidden">
                  <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-white uppercase tracking-wider"
                  >
                    {adminTab === 'estoque' && <><Package size={16} /> Estoque</>}
                    {adminTab === 'historico' && <><History size={16} /> Histórico</>}
                    {adminTab === 'compra' && <><ShoppingCart size={16} /> Compra</>}
                    {adminTab === 'taxas' && <><Percent size={16} /> Taxas</>}
                    <ChevronDown size={14} className={`transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isMobileMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        onClick={() => { setCurrentView('list'); setAdminTab('estoque'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'estoque' ? 'bg-orange-600/10 text-orange-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <Package size={16} /> Estoque
                      </button>
                      <button
                        onClick={() => { setCurrentView('list'); setAdminTab('historico'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'historico' ? 'bg-orange-600/10 text-orange-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <History size={16} /> Histórico
                      </button>
                      <button
                        onClick={() => { setCurrentView('list'); setAdminTab('compra'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'compra' ? 'bg-orange-600/10 text-orange-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <ShoppingCart size={16} /> Compra
                      </button>
                      <button
                        onClick={() => { setCurrentView('list'); setAdminTab('taxas'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                          adminTab === 'taxas' ? 'bg-orange-600/10 text-orange-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <Percent size={16} /> Taxas
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setCurrentView('list')}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all uppercase tracking-wider ${
                  currentView === 'list' 
                    ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.5)]' 
                    : 'text-zinc-400 hover:text-orange-500 hover:bg-zinc-900'
                }`}
              >
                Estoque
              </button>
            )}
            
            <div className="h-8 w-px bg-zinc-800 mx-2" />

            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">{isAdmin ? 'Modo Admin' : 'Modo Cliente'}</span>
                  <span className="text-xs md:text-sm font-black text-white truncate max-w-[100px] md:max-w-[150px]">{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 bg-zinc-900 text-zinc-400 hover:text-orange-500 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Acesso Restrito</span>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="p-2.5 bg-zinc-900 text-zinc-400 hover:text-orange-500 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Login Admin"
                >
                  <LogIn size={20} />
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 print:p-0 print:max-w-none">
        {currentView === 'list' && adminTab === 'estoque' && (
          <MotoList
            motos={motos}
            onAddMoto={handleAddMoto}
            onFinance={handleFinance}
            isAdmin={isAdmin}
            onEditMoto={handleEditMoto}
            onDeleteMoto={handleDeleteMoto}
          />
        )}

        {currentView === 'list' && adminTab === 'historico' && isAdmin && (
          <AdminHistory motos={motos} />
        )}

        {currentView === 'list' && adminTab === 'taxas' && isAdmin && (
          <AdminRates motos={motos} />
        )}

        {currentView === 'list' && adminTab === 'compra' && isAdmin && (
          <AdminPurchases />
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
            onCancel={() => setCurrentView('list')}
            isAdmin={isAdmin}
            userData={userData}
          />
        )}
      </main>

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
    </div>
  );
}
