import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, db, handleFirestoreError, OperationType } from '../firebase';
import { PurchaseRecord, PurchaseInstallment } from '../types';
import { Plus, Search, Filter, Calendar, User, Phone, DollarSign, FileText, Trash2, Eye, Camera, X, CheckCircle2, Clock, Bike, MapPin, CreditCard, Info, Scan } from 'lucide-react';
import PurchaseReceiptGenerator from './PurchaseReceiptGenerator';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isNewPurchase, setIsNewPurchase] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<'save' | 'publish' | null>(null);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<PurchaseRecord, 'id'>>({
    motoInfo: {
      marcaModelo: '',
      placa: '',
      anoFabricacao: new Date().getFullYear(),
      anoModelo: new Date().getFullYear(),
      quilometragem: '',
      cor: '',
      chassi: '',
      renavam: ''
    },
    vendedorNome: '',
    vendedorCpfCnpj: '',
    vendedorTelefone: '',
    vendedorEndereco: '',
    valorTotal: 0,
    entrada: 0,
    valorFinanciado: 0,
    parcelas: [],
    dataCompra: new Date().toISOString().split('T')[0],
    fotos: [],
    observacoes: '',
    status: 'em_estoque'
  });

  const [numParcelas, setNumParcelas] = useState(0);
  const [valorParcela, setValorParcela] = useState(0);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const q = query(collection(db, 'purchases'), orderBy('dataCompra', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const purchasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRecord));
      setPurchases(purchasesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        const newState = {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as any),
            [child]: numValue
          }
        };
        
        // Auto-calculate valorFinanciado if valorTotal or entrada changes
        if (parent === 'valorTotal' || parent === 'entrada' || name === 'valorTotal' || name === 'entrada') {
          newState.valorFinanciado = Math.max(0, newState.valorTotal - newState.entrada);
        }
        
        return newState;
      });
    } else {
      setFormData(prev => {
        const newState = {
          ...prev,
          [name]: numValue
        };
        
        if (name === 'valorTotal' || name === 'entrada') {
          newState.valorFinanciado = Math.max(0, newState.valorTotal - newState.entrada);
        }
        
        return newState;
      });
    }
  };

  const generateParcelas = () => {
    if (numParcelas <= 0) {
      setFormData(prev => ({ ...prev, parcelas: [] }));
      return;
    }

    const newParcelas: PurchaseInstallment[] = [];
    const baseDate = new Date(dataPrimeiraParcela);
    
    for (let i = 1; i <= numParcelas; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + (i - 1));
      
      newParcelas.push({
        numero: i,
        valor: valorParcela,
        dataVencimento: dueDate.toISOString().split('T')[0],
        status: 'pendente'
      });
    }
    
    setFormData(prev => ({ ...prev, parcelas: newParcelas }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1200px
          const maxDim = 1200;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to 0.7 quality
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          
          setFormData(prev => ({
            ...prev,
            fotos: [...prev.fotos, compressedData]
          }));
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const handleEdit = (purchase: PurchaseRecord) => {
    setFormData({
      motoInfo: purchase.motoInfo,
      vendedorNome: purchase.vendedorNome,
      vendedorCpfCnpj: purchase.vendedorCpfCnpj,
      vendedorTelefone: purchase.vendedorTelefone,
      vendedorEndereco: purchase.vendedorEndereco || '',
      valorTotal: purchase.valorTotal,
      entrada: purchase.entrada,
      valorFinanciado: purchase.valorFinanciado,
      parcelas: purchase.parcelas,
      dataCompra: purchase.dataCompra,
      fotos: purchase.fotos || [],
      observacoes: purchase.observacoes || '',
      status: purchase.status,
      isPublished: purchase.isPublished
    });
    setEditingPurchaseId(purchase.id!);
    setShowForm(true);
  };

  const handleSaveAction = async (publish: boolean) => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Validate data before sending
      if (!formData.motoInfo.marcaModelo || !formData.motoInfo.placa || !formData.vendedorNome) {
        throw new Error("Por favor, preencha todos os campos obrigatórios.");
      }

      const purchaseData = { ...formData, isPublished: publish || formData.isPublished };

      if (editingPurchaseId) {
        try {
          await updateDoc(doc(db, 'purchases', editingPurchaseId), purchaseData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'purchases');
        }
      } else {
        try {
          await addDoc(collection(db, 'purchases'), purchaseData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'purchases');
        }
      }
      
      const newPurchase = { ...purchaseData, id: editingPurchaseId || 'new' } as PurchaseRecord;
      
      if (publish && !formData.isPublished) {
        // Also add the moto to the main stock (motos collection)
        const motoToStock = {
          placa: formData.motoInfo.placa,
          marcaModelo: formData.motoInfo.marcaModelo,
          anoFabricacao: formData.motoInfo.anoFabricacao,
          anoModelo: formData.motoInfo.anoModelo,
          quilometragem: formData.motoInfo.quilometragem,
          cor: formData.motoInfo.cor,
          precoAVista: formData.valorTotal * 1.2, // Default 20% markup for stock
          statusRevisao: 'NÃO REVISADA',
          statusDut: 'DUT INCLUSO',
          fotos: formData.fotos,
          chassi: formData.motoInfo.chassi,
          renavam: formData.motoInfo.renavam,
          dataEntrada: new Date().toISOString()
        };
        
        try {
          await addDoc(collection(db, 'motos'), motoToStock);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'motos');
        }
      }
      
      setIsSaved(true);
      
      // Wait a bit to show the success state, then open the receipt
      setTimeout(() => {
        setIsSaving(false);
        setIsSaved(false);
        setShowForm(false);
        setEditingPurchaseId(null);
        
        // Reset form
        setFormData({
          motoInfo: { marcaModelo: '', placa: '', anoFabricacao: 2024, anoModelo: 2024, quilometragem: '', cor: '', chassi: '', renavam: '' },
          vendedorNome: '', vendedorCpfCnpj: '', vendedorTelefone: '', vendedorEndereco: '',
          valorTotal: 0, entrada: 0, valorFinanciado: 0, parcelas: [],
          dataCompra: new Date().toISOString().split('T')[0], fotos: [], observacoes: '', status: 'em_estoque'
        });

        // Automatically show the receipt for the new purchase
        if (!editingPurchaseId) {
          setSelectedPurchase(newPurchase);
          setIsNewPurchase(true);
          setShowReceipt(true);
        }
      }, 1500);
    } catch (error: any) {
      console.error("Error saving purchase:", error);
      setSaveError(error.message || "Erro ao salvar a compra. Verifique sua conexão e tente novamente.");
      setIsSaving(false);
    }
  };

  const handleDocumentScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];
    
    // Read all files to base64
    const base64Promises = fileArray.map(file => {
      return new Promise<{mimeType: string, data: string, url: string}>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve({
            mimeType: file.type || "image/jpeg",
            data: result.split(',')[1],
            url: result
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const base64Files = await Promise.all(base64Promises);
    
    // Use the first image for the preview
    setScannerImage(base64Files[0].url);
    setShowScannerModal(true);
    setIsScanning(true);
    setScannedData(null);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
      
      const parts: any[] = base64Files.map(f => ({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data
        }
      }));

      parts.push({
        text: `Analise estes documentos (CRLV, RG, CNH, etc.). Extraia as seguintes informações se existirem e retorne APENAS um JSON válido. Se não encontrar algo, retorne null.
        {
          "marcaModelo": "string ou null",
          "placa": "string ou null",
          "anoFabricacao": numero ou null,
          "anoModelo": numero ou null,
          "chassi": "string ou null",
          "renavam": "string ou null",
          "cor": "string ou null",
          "vendedorNome": "string ou null",
          "vendedorCpfCnpj": "string ou null"
        }`
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
        }
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        setScannedData(data);
      }
    } catch (error) {
      console.error("Erro na leitura do documento:", error);
      alert("Erro ao processar o documento. Verifique se a chave da API do Gemini está configurada.");
      setShowScannerModal(false);
    } finally {
      setIsScanning(false);
    }
    e.target.value = '';
  };

  const applyScannedData = () => {
    if (!scannedData) return;
    
    setFormData(prev => ({
      ...prev,
      motoInfo: {
        ...prev.motoInfo,
        marcaModelo: scannedData.marcaModelo || prev.motoInfo.marcaModelo,
        placa: scannedData.placa || prev.motoInfo.placa,
        anoFabricacao: scannedData.anoFabricacao || prev.motoInfo.anoFabricacao,
        anoModelo: scannedData.anoModelo || prev.motoInfo.anoModelo,
        chassi: scannedData.chassi || prev.motoInfo.chassi,
        renavam: scannedData.renavam || prev.motoInfo.renavam,
        cor: scannedData.cor || prev.motoInfo.cor,
      },
      vendedorNome: scannedData.vendedorNome || prev.vendedorNome,
      vendedorCpfCnpj: scannedData.vendedorCpfCnpj || prev.vendedorCpfCnpj,
    }));
    
    setShowScannerModal(false);
    setScannerImage(null);
    setScannedData(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionToConfirm('save');
  };

  const handleDelete = async () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'purchases', purchaseToDelete));
      setPurchaseToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'purchases');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredPurchases = purchases.filter(p => 
    p.motoInfo.marcaModelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.motoInfo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vendedorNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showReceipt && selectedPurchase) {
    return (
      <PurchaseReceiptGenerator 
        purchase={selectedPurchase} 
        onBack={() => {
          setShowReceipt(false);
          setIsNewPurchase(false);
        }} 
        isNew={isNewPurchase} 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Gestão de <span className="text-orange-600">Compras</span></h2>
          <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">Aquisição de motos para o estoque</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)]"
        >
          <Plus size={18} /> Nova Compra
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por modelo, placa ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Purchase List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-20 text-center border border-zinc-800">
          <Bike size={48} className="mx-auto text-zinc-800 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma compra registrada</h3>
          <p className="text-zinc-500">Comece adicionando uma nova aquisição para o seu estoque.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchases.map((purchase) => (
            <div key={purchase.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl group hover:border-orange-600/50 transition-all">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={purchase.fotos[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'} 
                  alt={purchase.motoInfo.marcaModelo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 bg-orange-600 text-black px-3 py-1 rounded-md font-black text-xs shadow-lg">
                  {purchase.motoInfo.placa}
                </div>
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest border border-white/10">
                  {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{purchase.motoInfo.marcaModelo}</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <User size={10} className="text-orange-600" /> Vendedor: {purchase.vendedorNome}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                    <span className="block text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Valor Total</span>
                    <span className="font-black text-white text-sm">{formatCurrency(purchase.valorTotal)}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                    <span className="block text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Entrada</span>
                    <span className="font-black text-orange-500 text-sm">{formatCurrency(purchase.entrada)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleEdit(purchase)}
                    className="p-3 bg-zinc-800 hover:bg-orange-600/20 text-zinc-500 hover:text-orange-500 rounded-xl transition-all border border-zinc-800"
                    title="Editar Compra"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => { setSelectedPurchase(purchase); setShowReceipt(true); }}
                    className="flex-grow py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={14} /> Recibo
                  </button>
                  <button
                    className="p-3 bg-zinc-800 hover:bg-red-600/20 text-zinc-500 hover:text-red-500 rounded-xl transition-all border border-zinc-800"
                    onClick={() => setPurchaseToDelete(purchase.id!)}
                    title="Excluir Compra"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Purchase Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8"
            >
              <div className="bg-black p-6 border-b border-orange-600 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-600 p-2 rounded-lg">
                    <Plus size={20} className="text-black" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Registrar <span className="text-orange-600">Nova Compra</span></h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Scanner Button */}
                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Scan size={18} className="text-orange-500" /> Leitura Inteligente de Documento
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">Envie fotos (CRLV, RG, etc.) para preencher os dados automaticamente. Você pode selecionar mais de um arquivo.</p>
                  </div>
                  <label className="cursor-pointer bg-orange-600 hover:bg-orange-500 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center gap-2 whitespace-nowrap">
                    <Camera size={16} />
                    Escanear Documento
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleDocumentScan} />
                  </label>
                </div>

                {/* Section: Moto Info */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Bike size={14} /> Informações da Moto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Marca / Modelo</label>
                      <input required type="text" name="motoInfo.marcaModelo" value={formData.motoInfo.marcaModelo} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Ex: Honda CG 160" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Placa</label>
                      <input required type="text" name="motoInfo.placa" value={formData.motoInfo.placa} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="ABC-1234" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cor</label>
                      <input required type="text" name="motoInfo.cor" value={formData.motoInfo.cor} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Ex: Vermelho" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ano Fab.</label>
                      <input required type="number" name="motoInfo.anoFabricacao" value={formData.motoInfo.anoFabricacao} onChange={handleNumberChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ano Mod.</label>
                      <input required type="number" name="motoInfo.anoModelo" value={formData.motoInfo.anoModelo} onChange={handleNumberChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quilometragem</label>
                      <input required type="text" name="motoInfo.quilometragem" value={formData.motoInfo.quilometragem} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Ex: 15.000km" />
                    </div>
                  </div>
                </div>

                {/* Section: Seller Info */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <User size={14} /> Dados do Vendedor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome do Vendedor</label>
                      <input required type="text" name="vendedorNome" value={formData.vendedorNome} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">CPF / CNPJ</label>
                      <input required type="text" name="vendedorCpfCnpj" value={formData.vendedorCpfCnpj} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telefone</label>
                      <input required type="text" name="vendedorTelefone" value={formData.vendedorTelefone} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Endereço</label>
                      <input type="text" name="vendedorEndereco" value={formData.vendedorEndereco} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                  </div>
                </div>

                {/* Section: Financial Info */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <CreditCard size={14} /> Financeiro da Compra
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor Total da Compra</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600" size={16} />
                        <input required type="number" name="valorTotal" value={formData.valorTotal} onChange={handleNumberChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor de Entrada</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                        <input required type="number" name="entrada" value={formData.entrada} onChange={handleNumberChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Saldo a Pagar</label>
                      <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-black text-orange-500">
                        {formatCurrency(formData.valorFinanciado)}
                      </div>
                    </div>
                  </div>

                  {/* Installment Generator */}
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-orange-600" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Gerador de Parcelas</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Qtd. Parcelas</label>
                        <input type="number" value={numParcelas} onChange={(e) => setNumParcelas(parseInt(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Valor Parcela</label>
                        <input type="number" value={valorParcela} onChange={(e) => setValorParcela(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">1º Vencimento</label>
                        <input type="date" value={dataPrimeiraParcela} onChange={(e) => setDataPrimeiraParcela(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-600" />
                      </div>
                      <button type="button" onClick={generateParcelas} className="py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        Gerar Parcelas
                      </button>
                    </div>

                    {formData.parcelas.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                        {formData.parcelas.map((p, idx) => (
                          <div key={idx} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                            <span className="text-[10px] font-black text-zinc-500">{p.numero}ª</span>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-white">{formatCurrency(p.valor)}</p>
                              <p className="text-[8px] font-bold text-zinc-600">{new Date(p.dataVencimento).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Photos */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Camera size={14} /> Fotos da Moto / Documentos
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {formData.fotos.map((foto, index) => (
                      <div key={index} className="aspect-square relative rounded-xl overflow-hidden border border-zinc-800 group">
                        <img src={foto} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePhoto(index)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl hover:border-orange-600 hover:bg-orange-600/5 cursor-pointer transition-all">
                      <Plus size={24} className="text-zinc-500 mb-2" />
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Adicionar Foto</span>
                      <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Section: Observations */}
                <div className="space-y-4 pt-6 border-t border-zinc-800">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Info size={14} /> Observações
                  </h4>
                  <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none resize-none" placeholder="Detalhes adicionais sobre a compra, estado da moto, etc..." />
                </div>

                {saveError && (
                  <div className="bg-red-600/20 border border-red-600/50 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <X className="text-red-500" size={20} />
                    <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{saveError}</p>
                  </div>
                )}

                <div className="pt-8 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    disabled={isSaving}
                    className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActionToConfirm('save')}
                    disabled={isSaving}
                    className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all disabled:opacity-50 border border-zinc-700"
                  >
                    Salvar
                  </button>
                  {!formData.isPublished && (
                    <button 
                      type="button" 
                      onClick={() => setActionToConfirm('publish')}
                      disabled={isSaving}
                      className={`flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_30px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2 ${
                        isSaved ? 'bg-green-600 text-white' : 'bg-orange-600 text-black hover:bg-orange-500'
                      }`}
                    >
                      {isSaving ? (
                        <span className="animate-pulse">Processando...</span>
                      ) : isSaved ? (
                        <>
                          <CheckCircle2 size={18} />
                          Sucesso!
                        </>
                      ) : (
                        'Publicar no Estoque'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {actionToConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${actionToConfirm === 'publish' ? 'bg-orange-600/20 text-orange-600' : 'bg-blue-600/20 text-blue-600'}`}>
                {actionToConfirm === 'publish' ? <CheckCircle2 size={40} /> : <FileText size={40} />}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {actionToConfirm === 'publish' ? 'Publicar no Estoque?' : 'Salvar Alterações?'}
                </h3>
                <p className="text-zinc-400 text-sm mt-2">
                  {actionToConfirm === 'publish' 
                    ? 'A moto será adicionada ao estoque disponível para venda.' 
                    : 'As informações da compra serão salvas apenas no sistema de compras.'}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setActionToConfirm(null)}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleSaveAction(actionToConfirm === 'publish');
                    setActionToConfirm(null);
                  }}
                  disabled={isSaving}
                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 ${
                    actionToConfirm === 'publish' 
                      ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.3)] text-black' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Scan className="text-orange-500" /> Leitura Inteligente
                </h3>
                {!isScanning && (
                  <button onClick={() => setShowScannerModal(false)} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                )}
              </div>

              {isScanning ? (
                <div className="space-y-6 text-center">
                  <div className="relative w-full h-48 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800">
                    {scannerImage && (
                      <img src={scannerImage} alt="Documento" className="w-full h-full object-cover opacity-50" />
                    )}
                    <motion.div 
                      className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,1)]"
                      animate={{ y: [0, 192, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-orange-500 font-black uppercase tracking-widest text-sm animate-pulse">Processando Documento...</p>
                    <p className="text-zinc-400 text-xs">A inteligência artificial está extraindo os dados.</p>
                  </div>
                </div>
              ) : scannedData ? (
                <div className="space-y-6">
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 max-h-60 overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Dados Encontrados</h4>
                    <div className="space-y-3">
                      {Object.entries(scannedData).map(([key, value]) => {
                        if (!value) return null;
                        const labels: Record<string, string> = {
                          marcaModelo: 'Marca/Modelo', placa: 'Placa', anoFabricacao: 'Ano Fab.', anoModelo: 'Ano Mod.',
                          chassi: 'Chassi', renavam: 'Renavam', cor: 'Cor', vendedorNome: 'Nome Vendedor', vendedorCpfCnpj: 'CPF/CNPJ'
                        };
                        return (
                          <div key={key} className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                            <span className="text-xs text-zinc-400">{labels[key] || key}</span>
                            <span className="text-sm font-bold text-white">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowScannerModal(false)}
                      className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={applyScannedData}
                      className="flex-1 py-4 bg-orange-600 text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                    >
                      Preencher Formulário
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {purchaseToDelete && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-600/20 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Excluir Compra?</h3>
                <p className="text-zinc-400 text-sm mt-2">Esta ação não pode ser desfeita. O registro será removido permanentemente do histórico.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setPurchaseToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
