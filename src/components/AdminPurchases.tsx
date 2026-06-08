import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, db, handleFirestoreError, OperationType, getDocs } from '../firebase';
import { PurchaseRecord, PurchaseInstallment, CustoPurchase, Moto } from '../types';
import { Plus, Search, Filter, Calendar, User, Phone, DollarSign, FileText, Trash2, Eye, Camera, X, CheckCircle2, Clock, Bike, MapPin, CreditCard, Info, Scan, Archive } from 'lucide-react';
import PurchaseReceiptGenerator from './PurchaseReceiptGenerator';
import { motion, AnimatePresence } from 'motion/react';

const compressImageFile = (file: File, maxDim = 800, quality = 0.5): Promise<{mimeType: string, data: string, url: string}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultString = reader.result as string;
      
      if (!file.type.startsWith('image/')) {
        resolve({
          mimeType: file.type || "application/pdf",
          data: resultString.split(',')[1] || "",
          url: resultString
        });
        return;
      }

      const img = new Image();
      img.src = resultString;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

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
        
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        resolve({
          mimeType: 'image/jpeg',
          data: compressedData.split(',')[1],
          url: compressedData
        });
      };
      img.onerror = () => {
        resolve({
          mimeType: file.type || "image/jpeg",
          data: resultString.split(',')[1] || "",
          url: resultString
        });
      };
    };
    reader.readAsDataURL(file);
  });
};

const compressBase64Image = (base64Str: string, maxDim = 800, quality = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width <= maxDim && height <= maxDim) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedData);
        return;
      }

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
      
      const compressedData = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedData);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface AdminPurchasesProps {
  motos: Moto[];
}

export default function AdminPurchases({ motos }: AdminPurchasesProps) {
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

  // Inline Price Editing State
  const [editingPricePurchaseId, setEditingPricePurchaseId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');
  const [editingPriceError, setEditingPriceError] = useState<string | null>(null);
  const [updatingPrice, setUpdatingPrice] = useState<boolean>(false);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedFilesToAttach, setScannedFilesToAttach] = useState<string[]>([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'compra'|'custos'>('compra');

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
      renavam: '',
      combustivel: '',
      codigoCla: '',
      motor: ''
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
    documentos: [],
    custos: [],
    observacoes: '',
    status: 'em_estoque'
  });

  const [numParcelas, setNumParcelas] = useState(0);
  const [valorParcela, setValorParcela] = useState(0);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let unsubscribePurchases: () => void;

    const setupListeners = async () => {
      const q = query(collection(db, 'purchases'), orderBy('dataCompra', 'desc'));
      unsubscribePurchases = onSnapshot(q, async (snapshot) => {
        const purchasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRecord));
        setPurchases(purchasesData);
        setLoading(false);
      }, (error) => {
        console.warn("Firestore error listing purchases (quota exceeded?):", error);
        setPurchases([]);
        setLoading(false);
      });
      
      // Sync motos to purchases only once on mount
      try {
        const motosSnapshot = await getDocs(collection(db, 'motos'));
        const motosData = motosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const currentPurchases = await getDocs(collection(db, 'purchases'));
        const currentPurchasesData = currentPurchases.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRecord));
        
        for (const moto of motosData) {
          const exists = currentPurchasesData.some((p: PurchaseRecord) => p.motoInfo.placa === moto.placa);
          if (!exists) {
            const purchaseData: Omit<PurchaseRecord, 'id'> = {
              motoInfo: {
                marcaModelo: moto.marcaModelo || '',
                placa: moto.placa || '',
                anoFabricacao: parseInt(moto.anoFabricacao) || new Date().getFullYear(),
                anoModelo: parseInt(moto.anoModelo) || new Date().getFullYear(),
                quilometragem: moto.quilometragem || '',
                cor: moto.cor || '',
                chassi: moto.chassi || '',
                renavam: moto.renavam || ''
              },
              vendedorNome: 'Cadastro Sistema Anterior',
              vendedorCpfCnpj: '',
              vendedorTelefone: '',
              valorTotal: (moto.precoAVista || 0) * 0.8,
              entrada: ((moto.precoAVista || 0) * 0.8) + 1500,
              valorFinanciado: (moto.precoAVista || 0) * 0.8,
              parcelas: [],
              dataCompra: moto.dataEntrada ? new Date(moto.dataEntrada).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              fotos: moto.fotos || [],
              documentos: moto.documentos || [],
              status: 'em_estoque',
              isPublished: true,
              arquivada: moto.arquivada || false,
              observacoes: 'Importado de moto existente no estoque.'
            };
            await addDoc(collection(db, 'purchases'), purchaseData);
          }
        }
      } catch (err) {
        console.error("Error generating purchase for legacy dev:", err);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribePurchases) unsubscribePurchases();
    };
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
        
        const extraCosts = newState.custos?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;
        newState.entrada = extraCosts + 1500;
        newState.valorFinanciado = newState.valorTotal;
        
        return newState;
      });
    } else {
      setFormData(prev => {
        const newState = {
          ...prev,
          [name]: numValue
        };
        
        const extraCosts = newState.custos?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;
        newState.entrada = extraCosts + 1500;
        newState.valorFinanciado = newState.valorTotal;
        
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

  const openDocument = (docString: string) => {
    if (!docString) return;
    if (docString.startsWith('data:application/pdf')) {
      try {
        const parts = docString.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].split(':')[1];
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        } else {
          const newWindow = window.open();
          newWindow?.document.write(`<iframe src="${docString}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      } catch (e) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.location.href = docString;
        }
      }
    } else {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${docString}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isDocument: boolean = false) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files) as File[]) {
      if (isDocument && file.type === "application/pdf") {
        if (file.size > 300 * 1024) {
          alert(`O arquivo PDF (${(file.size / 1024).toFixed(0)} KB) excede o limite permitido de 300 KB. Por favor, utilize um arquivo de tamanho menor.`);
          continue;
        }
        const compressed = await compressImageFile(file);
        setFormData(prev => ({
          ...prev,
          documentos: [...(prev.documentos || []), compressed.url]
        }));
        continue;
      }

      // Compress image to 800px max and 0.5 quality
      const compressed = await compressImageFile(file, 800, 0.5);
      setFormData(prev => ({
        ...prev,
        [isDocument ? 'documentos' : 'fotos']: [...(prev[isDocument ? 'documentos' : 'fotos'] || []), compressed.url]
      }));
    }
  };

  const removePhoto = (index: number, isDocument: boolean = false) => {
    setFormData(prev => ({
      ...prev,
      [isDocument ? 'documentos' : 'fotos']: (prev[isDocument ? 'documentos' : 'fotos'] || []).filter((_, i) => i !== index)
    }));
  };

  const handleToggleArchive = async (purchase: PurchaseRecord) => {
    try {
      const newArchivedState = !purchase.arquivada;
      
      // Update purchase record
      await updateDoc(doc(db, 'purchases', purchase.id!), {
        arquivada: newArchivedState
      });

      // Update matching stock motorcycle as well
      const placa = purchase.motoInfo.placa;
      if (placa) {
        const querySnapshot = await getDocs(collection(db, 'motos'));
        const matchingDoc = querySnapshot.docs.find(doc => doc.data().placa === placa);
        if (matchingDoc) {
          await updateDoc(doc(db, 'motos', matchingDoc.id), {
            arquivada: newArchivedState
          });
        }
      }
    } catch (err) {
      console.error("Error toggling archive status:", err);
      alert("Erro ao alterar o status de arquivamento da moto.");
    }
  };

  const handleEdit = (purchase: PurchaseRecord) => {
    setActiveTab('compra');
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
      documentos: purchase.documentos || [],
      custos: purchase.custos || [],
      observacoes: purchase.observacoes || '',
      status: purchase.status,
      isPublished: purchase.isPublished
    });
    setEditingPurchaseId(purchase.id!);
    setShowForm(true);
  };

  const addCusto = () => {
    setFormData(prev => {
      const newCustos = [
        ...(prev.custos || []),
        { id: Math.random().toString(36).substring(7), descricao: '', valor: 0, data: new Date().toISOString().split('T')[0] }
      ];
      const extraCosts = newCustos.reduce((acc, c) => acc + (c.valor || 0), 0);
      return {
        ...prev,
        custos: newCustos,
        entrada: extraCosts + 1500
      };
    });
  };

  const updateCusto = (id: string, field: keyof CustoPurchase, value: any) => {
    setFormData(prev => {
      const newCustos = prev.custos?.map(c => c.id === id ? { ...c, [field]: value } : c) || [];
      const extraCosts = newCustos.reduce((acc, c) => acc + (c.valor || 0), 0);
      return {
        ...prev,
        custos: newCustos,
        entrada: extraCosts + 1500
      };
    });
  };

  const removeCusto = (id: string) => {
    setFormData(prev => {
      const newCustos = prev.custos?.filter(c => c.id !== id) || [];
      const extraCosts = newCustos.reduce((acc, c) => acc + (c.valor || 0), 0);
      return {
        ...prev,
        custos: newCustos,
        entrada: extraCosts + 1500
      };
    });
  };

  const handleCustoPDFUpload = async (e: React.ChangeEvent<HTMLInputElement>, custoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Por favor, selecione um arquivo PDF.");
      return;
    }

    if (file.size > 300 * 1024) {
      alert(`O arquivo PDF (${(file.size / 1024).toFixed(0)} KB) é muito grande. O limite máximo permitido para PDFs é de 300 KB. Por favor, utilize um arquivo menor.`);
      return;
    }

    const compressed = await compressImageFile(file);
    updateCusto(custoId, 'pdfUrl', compressed.url);
  };

  const handleSaveAction = async (publish: boolean) => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Validate data before sending
      if (!formData.motoInfo.marcaModelo || !formData.motoInfo.placa || !formData.vendedorNome) {
        throw new Error("Por favor, preencha todos os campos obrigatórios.");
      }

      const cleanUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => cleanUndefined(item));
        } else if (obj !== null && typeof obj === 'object') {
          const cleaned: any = {};
          Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
              cleaned[key] = cleanUndefined(obj[key]);
            }
          });
          return cleaned;
        }
        return obj;
      };

      // Compress all fotos, documentos and custos to rescue the document from Firestore limit in case of existing/new bloated ones
      const compressedFotos = await Promise.all(
        (formData.fotos || []).map(foto => compressBase64Image(foto, 800, 0.5))
      );
      const compressedDocumentos = await Promise.all(
        (formData.documentos || []).map(docString => compressBase64Image(docString, 800, 0.5))
      );
      const compressedCustos = await Promise.all(
        (formData.custos || []).map(async (custo) => {
          if (custo.pdfUrl) {
            const compressedPdfUrl = await compressBase64Image(custo.pdfUrl, 800, 0.5);
            return { ...custo, pdfUrl: compressedPdfUrl };
          }
          return custo;
        })
      );

      const purchaseData = cleanUndefined({
        ...formData,
        fotos: compressedFotos,
        documentos: compressedDocumentos,
        custos: compressedCustos,
        isPublished: publish || !!formData.isPublished,
        arquivada: formData.arquivada !== undefined ? formData.arquivada : false
      });

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
        const motoToStock = cleanUndefined({
          placa: formData.motoInfo.placa,
          marcaModelo: formData.motoInfo.marcaModelo,
          anoFabricacao: formData.motoInfo.anoFabricacao,
          anoModelo: formData.motoInfo.anoModelo,
          quilometragem: formData.motoInfo.quilometragem,
          cor: formData.motoInfo.cor,
          precoAVista: formData.valorTotal * 1.2, // Default 20% markup for stock
          statusRevisao: 'NÃO REVISADA',
          statusDut: 'DUT INCLUSO',
          fotos: compressedFotos,
          chassi: formData.motoInfo.chassi,
          renavam: formData.motoInfo.renavam,
          combustivel: formData.motoInfo.combustivel,
          codigoCla: formData.motoInfo.codigoCla,
          motor: formData.motoInfo.motor,
          dataEntrada: new Date().toISOString(),
          arquivada: false
        });
        
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
          motoInfo: { 
            marcaModelo: '', 
            placa: '', 
            anoFabricacao: 2024, 
            anoModelo: 2024, 
            quilometragem: '', 
            cor: '', 
            chassi: '', 
            renavam: '', 
            combustivel: '', 
            codigoCla: '', 
            motor: '' 
          },
          vendedorNome: '', vendedorCpfCnpj: '', vendedorTelefone: '', vendedorEndereco: '',
          valorTotal: 0, entrada: 0, valorFinanciado: 0, parcelas: [],
          dataCompra: new Date().toISOString().split('T')[0], fotos: [], documentos: [], observacoes: '', status: 'em_estoque'
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
    
    // Check for large PDFs
    const oversizedPdf = fileArray.find(file => file.type === "application/pdf" && file.size > 300 * 1024);
    if (oversizedPdf) {
      alert(`O arquivo PDF (${(oversizedPdf.size / 1024).toFixed(0)} KB) excede o limite permitido de 300 KB. Por favor, utilize um arquivo menor.`);
      return;
    }

    // Read and compress all files
    const base64Promises = fileArray.map(file => compressImageFile(file, 800, 0.5));
    const base64Files = await Promise.all(base64Promises);
    
    // Save scanned file URLs to state so we empty them on apply/dismiss, and append to documents
    const scannedUrls = base64Files.map(f => f.url);
    setScannedFilesToAttach(scannedUrls);

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
          "vendedorCpfCnpj": "string ou null",
          "combustivel": "string ou null",
          "codigoCla": "string ou null",
          "motor": "string ou null"
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
        combustivel: scannedData.combustivel || prev.motoInfo.combustivel,
        codigoCla: scannedData.codigoCla || prev.motoInfo.codigoCla,
        motor: scannedData.motor || prev.motoInfo.motor,
      },
      vendedorNome: scannedData.vendedorNome || prev.vendedorNome,
      vendedorCpfCnpj: scannedData.vendedorCpfCnpj || prev.vendedorCpfCnpj,
      documentos: [...(prev.documentos || []), ...scannedFilesToAttach]
    }));
    
    setShowScannerModal(false);
    setScannerImage(null);
    setScannedData(null);
    setScannedFilesToAttach([]);
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

  const handleStartEditPrice = (purchaseId: string, currentPrice: number) => {
    setEditingPricePurchaseId(purchaseId);
    setNewPriceValue((currentPrice - 500).toString());
    setEditingPriceError(null);
  };

  const handlePriceInputValueChange = (valueStr: string, currentPrice: number) => {
    setNewPriceValue(valueStr);
    const val = parseFloat(valueStr);
    if (isNaN(val) || val <= 0) {
      setEditingPriceError('Digite um valor maior que zero.');
    } else if (val >= currentPrice) {
      setEditingPriceError(`O valor deve ser menor que o atual (${formatCurrency(currentPrice)}).`);
    } else {
      setEditingPriceError(null);
    }
  };

  const handleSavePrice = async (purchase: PurchaseRecord, currentStockMoto: any) => {
    const val = parseFloat(newPriceValue);
    if (isNaN(val) || val <= 0) {
      alert('Digite um valor válido.');
      return;
    }
    if (val >= currentStockMoto.precoAVista) {
      alert(`O novo valor deve ser obrigatoriamente menor que o valor atual (${formatCurrency(currentStockMoto.precoAVista)}).`);
      return;
    }
    
    setUpdatingPrice(true);
    try {
      const motoRef = doc(db, 'motos', currentStockMoto.id);
      await updateDoc(motoRef, {
        precoAntigo: currentStockMoto.precoAVista,
        precoAVista: val
      });

      await updateDoc(doc(db, 'purchases', purchase.id!), {
        precoVendaSugerido: val
      });

      setEditingPricePurchaseId(null);
      alert('Preço à vista atualizado no estoque!');
    } catch (error) {
      console.error("Erro ao atualizar preco:", error);
      alert('Erro ao salvar o preço no estoque.');
    } finally {
      setUpdatingPrice(false);
    }
  };

  const getCustoAcumulado = (purchase: Partial<PurchaseRecord> | PurchaseRecord) => {
    const extraCosts = purchase.custos?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;
    return extraCosts;
  };

  const getPrecoSugerido = (purchase: Partial<PurchaseRecord> | PurchaseRecord) => {
    return getCustoAcumulado(purchase) + 1500;
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
          onClick={() => {
            setActiveTab('compra');
            setEditingPurchaseId(null);
            setFormData({
              motoInfo: {
                marcaModelo: '',
                placa: '',
                anoFabricacao: new Date().getFullYear(),
                anoModelo: new Date().getFullYear(),
                quilometragem: '',
                cor: '',
                chassi: '',
                renavam: '',
                combustivel: '',
                codigoCla: '',
                motor: ''
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
              documentos: [],
              custos: [],
              observacoes: '',
              status: 'em_estoque'
            });
            setShowForm(true);
          }}
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
          {filteredPurchases.map((purchase) => {
            const matchingStockMoto = motos.find(m => m.placa === purchase.motoInfo.placa);
            return (
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight truncate flex-grow">{purchase.motoInfo.marcaModelo}</h3>
                      {purchase.arquivada && (
                        <span className="shrink-0 bg-orange-600/20 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-md font-black text-[9px] tracking-widest uppercase">
                          ARQUIVADA
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <User size={10} className="text-orange-600" /> Vendedor: {purchase.vendedorNome}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                      <span className="block text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Custo da Moto</span>
                      <span className="font-black text-white text-sm">{formatCurrency(getCustoAcumulado(purchase))}</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                      <span className="block text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Preço Sugerido</span>
                      <span className="font-black text-orange-500 text-sm">{formatCurrency(getPrecoSugerido(purchase))}</span>
                    </div>
                  </div>

                  {purchase.isPublished && matchingStockMoto && (
                    <div className="bg-orange-600/5 p-4 rounded-xl border border-orange-600/20 space-y-3 mt-1 text-left">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Preço de Venda (Estoque):</span>
                        <span className="text-orange-500 font-black text-xs">{formatCurrency(matchingStockMoto.precoAVista)}</span>
                      </div>

                      {editingPricePurchaseId === purchase.id ? (
                        <div className="space-y-2 mt-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-normal">
                            Novo Preço à Vista (Obrigatório menor que {formatCurrency(matchingStockMoto.precoAVista)}):
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs font-mono">R$</span>
                            <input 
                              type="number"
                              value={newPriceValue}
                              onChange={(e) => handlePriceInputValueChange(e.target.value, matchingStockMoto.precoAVista)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-white outline-none focus:border-orange-500"
                            />
                          </div>
                          {editingPriceError && (
                            <p className="text-[9px] font-medium text-red-500 leading-snug">{editingPriceError}</p>
                          )}
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPricePurchaseId(null)}
                              disabled={updatingPrice}
                              className="px-2 py-1 text-[9px] uppercase font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePrice(purchase, matchingStockMoto)}
                              disabled={updatingPrice || !!editingPriceError}
                              className="px-2 py-1 text-[9px] uppercase font-black text-black bg-orange-600 hover:bg-orange-500 rounded disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(234,88,12,0.2)]"
                            >
                              {updatingPrice ? 'Salvando...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditPrice(purchase.id!, matchingStockMoto.precoAVista)}
                          className="w-full py-1.5 text-[9px] uppercase font-black text-orange-400 bg-orange-600/10 hover:bg-orange-600/20 rounded border border-orange-500/20 text-center transition-all tracking-wider"
                        >
                          Alterar Valor à Vista (Venda)
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-zinc-800/40">
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
                    {purchase.isPublished && (
                      <button
                        onClick={() => handleToggleArchive(purchase)}
                        className={`p-3 rounded-xl transition-all border ${
                          purchase.arquivada
                            ? 'bg-orange-600/20 text-orange-500 border-orange-600/30 hover:bg-orange-600/30 font-bold'
                            : 'bg-zinc-800 hover:bg-orange-600/20 text-zinc-500 hover:text-orange-500 border-zinc-800'
                        }`}
                        title={purchase.arquivada ? "Desarquivar Moto (Voltar para o Estoque)" : "Arquivar Moto (Sair do Estoque Público)"}
                      >
                        <Archive size={16} />
                      </button>
                    )}
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
            );
          })}
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
                    {editingPurchaseId ? <Eye size={20} className="text-black" /> : <Plus size={20} className="text-black" />}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{editingPurchaseId ? 'Detalhes da' : 'Registrar'} <span className="text-orange-600">Compra</span></h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              {/* TABS */}
              <div className="flex border-b border-zinc-800 bg-zinc-950">
                <button
                  onClick={() => setActiveTab('compra')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === 'compra' ? 'text-orange-500 border-b-2 border-orange-500 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  Detalhes da Compra
                </button>
                <button
                  onClick={() => setActiveTab('custos')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === 'custos' ? 'text-orange-500 border-b-2 border-orange-500 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  Centro de Custos
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'compra' && (
                  <div className="space-y-8 animate-in fade-in">
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
                        <input type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={handleDocumentScan} />
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 h-4">
                        <span>Chassi</span>
                        <span className="px-1.5 py-0.5 bg-orange-600/15 border border-orange-600/30 text-[8px] font-black text-orange-500 rounded tracking-widest uppercase scale-90 origin-left">Interno</span>
                      </label>
                      <input type="text" name="motoInfo.chassi" value={formData.motoInfo.chassi || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Número do Chassi" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 h-4">
                        <span>Renavam</span>
                        <span className="px-1.5 py-0.5 bg-orange-600/15 border border-orange-600/30 text-[8px] font-black text-orange-500 rounded tracking-widest uppercase scale-90 origin-left">Interno</span>
                      </label>
                      <input type="text" name="motoInfo.renavam" value={formData.motoInfo.renavam || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Número do Renavam" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 h-4">
                        <span>Combustível</span>
                        <span className="px-1.5 py-0.5 bg-orange-600/15 border border-orange-600/30 text-[8px] font-black text-orange-500 rounded tracking-widest uppercase scale-90 origin-left">Interno</span>
                      </label>
                      <input type="text" name="motoInfo.combustivel" value={formData.motoInfo.combustivel || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Ex: Gasolina / Flex" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 h-4">
                        <span>Código CLA</span>
                        <span className="px-1.5 py-0.5 bg-orange-600/15 border border-orange-600/30 text-[8px] font-black text-orange-500 rounded tracking-widest uppercase scale-90 origin-left">Interno</span>
                      </label>
                      <input type="text" name="motoInfo.codigoCla" value={formData.motoInfo.codigoCla || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Código CLA" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 h-4">
                        <span>Motor</span>
                        <span className="px-1.5 py-0.5 bg-orange-600/15 border border-orange-600/30 text-[8px] font-black text-orange-500 rounded tracking-widest uppercase scale-90 origin-left">Interno</span>
                      </label>
                      <input type="text" name="motoInfo.motor" value={formData.motoInfo.motor || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" placeholder="Número do Motor" />
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
                      <input required type="text" name="vendedorNome" value={formData.vendedorNome || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">CPF / CNPJ</label>
                      <input required type="text" name="vendedorCpfCnpj" value={formData.vendedorCpfCnpj || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telefone</label>
                      <input required type="text" name="vendedorTelefone" value={formData.vendedorTelefone || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Endereço</label>
                      <input type="text" name="vendedorEndereco" value={formData.vendedorEndereco || ''} onChange={handleInputChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none" />
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
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custo Total da Moto</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600" size={16} />
                        <input required type="number" name="valorTotal" value={formData.valorTotal} onChange={handleNumberChange} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                        <span>Preço Sugerido</span>
                        <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Lucro +R$1.500</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                        <input readOnly type="number" name="entrada" value={formData.entrada} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-green-500 cursor-not-allowed outline-none" />
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
                    <Camera size={14} /> Fotos da Moto (Publicadas no Estoque)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {formData.fotos.map((foto, index) => (
                      <div key={index} className="aspect-square relative rounded-xl overflow-hidden border border-zinc-800 group">
                        <img src={foto} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePhoto(index, false)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl hover:border-orange-600 hover:bg-orange-600/5 cursor-pointer transition-all">
                      <Plus size={24} className="text-zinc-500 mb-2" />
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center px-2">Adicionar Foto da Moto</span>
                      <input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Section: Documents */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileText size={14} /> Documentos Anexos (Apenas Interno)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {formData.documentos?.map((docImg, index) => {
                      const isPdf = typeof docImg === 'string' && docImg.startsWith('data:application/pdf');
                      return (
                        <div key={index} className="aspect-square relative rounded-xl overflow-hidden border border-zinc-800 group bg-zinc-950 flex flex-col justify-center items-center cursor-pointer hover:border-orange-600/50 transition-all shadow-md">
                          {isPdf ? (
                            <div 
                              onClick={() => openDocument(docImg)}
                              className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 text-zinc-300 relative"
                            >
                              <FileText size={42} className="text-red-500 mb-1.5 animate-pulse" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-center text-zinc-400 max-w-full truncate px-1">Documento PDF</span>
                              <span className="text-[8px] text-zinc-500 mt-1">Clique para abrir</span>
                              
                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openDocument(docImg); }}
                                  className="p-1.5 bg-orange-600 hover:bg-orange-500 text-black rounded-lg transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <img src={docImg} alt="Document Preview" className="w-full h-full object-cover" />
                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openDocument(docImg)}
                                  className="p-1.5 bg-orange-600 hover:bg-orange-500 text-black rounded-lg transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </>
                          )}
                          
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePhoto(index, true); }}
                            className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl hover:border-orange-600 hover:bg-orange-600/5 cursor-pointer transition-all">
                      <Plus size={24} className="text-zinc-500 mb-2" />
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center px-2">Adicionar Documento</span>
                      <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => handlePhotoUpload(e, true)} className="hidden" />
                    </label>
                  </div>
                </div>

                    {/* Section: Observations */}
                    <div className="space-y-4 pt-6 border-t border-zinc-800">
                      <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Info size={14} /> Observações
                      </h4>
                      <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleInputChange} rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none resize-none" placeholder="Detalhes adicionais sobre a compra, estado da moto, etc..." />
                    </div>
                  </div>
                )}

                {activeTab === 'custos' && (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <DollarSign size={18} className="text-orange-500" /> Histórico de Custos / OS
                      </h4>
                      <button type="button" onClick={addCusto} className="flex items-center gap-2 bg-zinc-800 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                        <Plus size={14} />
                        Lançar Custo
                      </button>
                    </div>

                    {formData.custos?.length === 0 ? (
                      <div className="bg-zinc-950 rounded-xl p-8 border border-zinc-800 text-center">
                        <p className="text-zinc-500 text-sm">Nenhum custo lançado para esta moto.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.custos?.map((custo) => (
                          <div key={custo.id} className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição</label>
                                <input type="text" value={custo.descricao} onChange={(e) => updateCusto(custo.id, 'descricao', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-600 outline-none" placeholder="Ex: Multa, Revisão, Troca de óleo" />
                              </div>
                              <div className="w-32 space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor</label>
                                <input type="number" 
                                  value={custo.valor === 0 ? '' : custo.valor}
                                  onChange={(e) => updateCusto(custo.id, 'valor', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-600 outline-none" placeholder="R$ 0,00" />
                              </div>
                              <div className="w-32 space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</label>
                                <input type="date" value={custo.data} onChange={(e) => updateCusto(custo.id, 'data', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-600 outline-none" />
                              </div>
                              <button type="button" onClick={() => removeCusto(custo.id)} className="mt-6 p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <div className="flex gap-4 items-start">
                              <div className="flex-[2] space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observação Adicional</label>
                                <input type="text" value={custo.observacao || ''} onChange={(e) => updateCusto(custo.id, 'observacao', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-600 outline-none" placeholder="" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Anexo / Ordem Serviço (PDF)</label>
                                {custo.pdfUrl ? (
                                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2">
                                    <span className="text-xs text-orange-500 truncate flex items-center gap-2 font-black uppercase"><FileText size={12}/> Anexado</span>
                                    <button type="button" onClick={() => updateCusto(custo.id, 'pdfUrl', '')} className="text-red-500 px-2 hover:bg-red-500/10 rounded">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 w-full py-2 rounded-lg text-xs font-bold transition-all border border-zinc-700">
                                    <FileText size={14} /> Anexar PDF
                                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleCustoPDFUpload(e, custo.id)} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex justify-between items-center bg-zinc-900 border border-orange-600/50 p-4 rounded-xl shadow-lg mt-6">
                           <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">Custo Total Acumulado:</span>
                           <span className="text-2xl font-black text-orange-500">
                             {formatCurrency(getCustoAcumulado(formData))}
                           </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                      scannerImage.startsWith('data:application/pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
                          <FileText size={48} className="text-red-500 mb-2 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Documento PDF</span>
                        </div>
                      ) : (
                        <img src={scannerImage} alt="Documento" className="w-full h-full object-cover opacity-50" />
                      )
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
                          chassi: 'Chassi', renavam: 'Renavam', cor: 'Cor', vendedorNome: 'Nome Vendedor', vendedorCpfCnpj: 'CPF/CNPJ',
                          combustivel: 'Combustível', codigoCla: 'Código CLA', motor: 'Motor'
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
