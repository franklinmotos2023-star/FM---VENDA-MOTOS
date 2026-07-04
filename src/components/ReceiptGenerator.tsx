import React, { useState, useRef } from 'react';
import { Moto, BuyerData, SaleRecord } from '../types';
import { FileText, Printer, ArrowLeft, CheckCircle, Camera, Download, Bike, ShieldCheck, MapPin, Phone, CreditCard, Info, User } from 'lucide-react';
import { numeroPorExtenso } from '../utils/numberToWords';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, db, handleFirestoreError, OperationType, getDocs, collection } from '../firebase';

function convertOklToRgb(colorStr: string): string {
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab')) {
    return colorStr;
  }
  
  return colorStr.replace(/(oklch|oklab)\(([^)]+)\)/g, (match, type, content) => {
    try {
      const parts = content.replace(/[,/]/g, ' ').trim().split(/\s+/);
      if (parts.length < 3) return match;
      
      let c1 = parseFloat(parts[0]);
      if (parts[0].endsWith('%')) c1 = parseFloat(parts[0]) / 100;
      
      let c2 = parseFloat(parts[1]);
      if (parts[1].endsWith('%')) c2 = parseFloat(parts[1]) / 100;
      
      let c3 = parseFloat(parts[2]);
      if (parts[2].endsWith('%')) c3 = parseFloat(parts[2]) / 100;
      
      let alpha = 1;
      if (parts[3]) {
        alpha = parseFloat(parts[3]);
        if (parts[3].endsWith('%')) alpha = parseFloat(parts[3]) / 100;
      }
      
      let L = c1;
      let a = 0;
      let b = 0;
      
      if (type === 'oklch') {
        const chroma = c2;
        let hueDeg = c3;
        if (parts[2].endsWith('rad')) {
          hueDeg = parseFloat(parts[2]) * (180 / Math.PI);
        } else if (parts[2].endsWith('turn')) {
          hueDeg = parseFloat(parts[2]) * 360;
        } else if (parts[2].endsWith('grad')) {
          hueDeg = parseFloat(parts[2]) * 0.9;
        }
        const hueRad = hueDeg * (Math.PI / 180);
        a = chroma * Math.cos(hueRad);
        b = chroma * Math.sin(hueRad);
      } else {
        a = c2;
        b = c3;
      }
      
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.2914855414 * b;
      
      const l = l_ * l_ * l_;
      const m = m_ * m_ * m_;
      const s = s_ * s_ * s_;
      
      let r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      let b_lin = -0.0041960863 * l - 0.7034186142 * m + 1.7076147004 * s;
      
      const toSRGB = (c: number) => {
        const sign = c < 0 ? -1 : 1;
        const absC = Math.abs(c);
        const res = absC <= 0.0031308 ? 12.92 * absC : 1.055 * Math.pow(absC, 1 / 2.4) - 0.055;
        return Math.max(0, Math.min(255, Math.round(sign * res * 255)));
      };
      
      const rVal = toSRGB(r_lin);
      const gVal = toSRGB(g_lin);
      const bVal = toSRGB(b_lin);
      
      if (alpha === 1) {
        return `rgb(${rVal}, ${gVal}, ${bVal})`;
      } else {
        return `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
      }
    } catch (e) {
      console.warn("Error converting oklch/oklab color:", e);
      return match;
    }
  });
}

const inlineAllStyles = (source: HTMLElement, target: HTMLElement) => {
  const sourceRootStyle = window.getComputedStyle(source);
  for (let i = 0; i < sourceRootStyle.length; i++) {
    const propName = sourceRootStyle[i];
    if (propName.startsWith('--')) continue; // Skip custom CSS variables/properties
    
    let val = sourceRootStyle.getPropertyValue(propName);
    if (val.includes('oklch') || val.includes('oklab')) {
      val = convertOklToRgb(val);
    }
    
    target.style.setProperty(propName, val, sourceRootStyle.getPropertyPriority(propName));
  }

  const sourceElements = Array.from(source.querySelectorAll('*'));
  const targetElements = Array.from(target.querySelectorAll('*'));

  for (let i = 0; i < sourceElements.length; i++) {
    const srcEl = sourceElements[i] as HTMLElement;
    const tgtEl = targetElements[i] as HTMLElement;
    if (srcEl && tgtEl) {
      const computed = window.getComputedStyle(srcEl);
      for (let j = 0; j < computed.length; j++) {
        const propName = computed[j];
        if (propName.startsWith('--')) continue; // Skip custom CSS variables/properties
        
        let val = computed.getPropertyValue(propName);
        if (val.includes('oklch') || val.includes('oklab')) {
          val = convertOklToRgb(val);
        }
        
        tgtEl.style.setProperty(
          propName,
          val,
          computed.getPropertyPriority(propName)
        );
      }
    }
  }
};

interface ReceiptGeneratorProps {
  moto: Moto;
  saleRecord: SaleRecord;
  onBack: () => void;
}

export default function ReceiptGenerator({ moto, saleRecord, onBack }: ReceiptGeneratorProps) {
  const [buyerData, setBuyerData] = useState<BuyerData>({
    nome: saleRecord.compradorNome || '',
    cpf: saleRecord.compradorCpf || '',
    rg: saleRecord.compradorRg || '',
    endereco: saleRecord.compradorEndereco || '',
    telefone: saleRecord.telefone || '',
    dataVenda: new Date(saleRecord.dataVenda).toISOString().split('T')[0],
    cep: saleRecord.cep || ''
  });

  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBuyerData(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const originalTitle = document.title;
    const documentTitle = `Recibo-${saleRecord.motoPlaca}-${buyerData.nome.replace(/\s+/g, '-').toLowerCase()}`;
    document.title = documentTitle;

    // Create a temporary hidden iframe for clean printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      
      const clonedReceipt = receiptRef.current.cloneNode(true) as HTMLElement;
      inlineAllStyles(receiptRef.current, clonedReceipt);

      // Reset print sizes for clean A4 fit
      clonedReceipt.style.width = '100%';
      clonedReceipt.style.height = 'auto';
      clonedReceipt.style.minHeight = '0';
      clonedReceipt.style.boxShadow = 'none';
      clonedReceipt.style.margin = '0';
      clonedReceipt.style.padding = '10mm';
      clonedReceipt.style.boxSizing = 'border-box';
      clonedReceipt.style.backgroundColor = '#ffffff';

      doc.write(`
        <html>
          <head>
            <title>${documentTitle}</title>
            <meta charset="utf-8" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
            <style>
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-family: 'Inter', sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: A4;
                margin: 0;
              }
            </style>
          </head>
          <body>
            ${clonedReceipt.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Erro ao imprimir no iframe:", e);
          window.print();
        } finally {
          document.body.removeChild(iframe);
          document.title = originalTitle;
        }
      }, 500);
    } else {
      window.print();
      document.title = originalTitle;
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    setPdfError(null);
    
    // Create a temporary hidden iframe to completely isolate html2canvas from parent document's styles.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    try {
      const element = receiptRef.current;
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Não foi possível acessar o documento do iframe para geração.");
      }

      const clonedReceipt = element.cloneNode(true) as HTMLElement;
      inlineAllStyles(element, clonedReceipt);

      // Force proper ID, layout and white background
      clonedReceipt.id = 'receipt-content';
      clonedReceipt.style.width = '794px';
      clonedReceipt.style.height = '1123px';
      clonedReceipt.style.padding = '40px';
      clonedReceipt.style.boxSizing = 'border-box';
      clonedReceipt.style.backgroundColor = '#ffffff';
      clonedReceipt.style.color = '#000000';
      clonedReceipt.style.display = 'flex';
      clonedReceipt.style.flexDirection = 'column';
      clonedReceipt.style.justifyContent = 'space-between';

      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <meta charset="utf-8" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
            <style>
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-family: 'Inter', sans-serif;
              }
            </style>
          </head>
          <body>
            <div id="capture-container"></div>
          </body>
        </html>
      `);
      iframeDoc.close();

      const container = iframeDoc.getElementById('capture-container');
      if (container) {
        container.appendChild(clonedReceipt);
      }

      // Small delay to ensure styles and layouts are resolved inside the iframe
      await new Promise(resolve => setTimeout(resolve, 100));

      const elementToCapture = iframeDoc.getElementById('receipt-content') || clonedReceipt;

      // Temporarily disable all main document stylesheets to completely prevent html2canvas parsing crashes on Tailwind v4 oklch/oklab styles
      const disabledSheets: boolean[] = [];
      const sheets = Array.from(document.styleSheets);
      sheets.forEach((sheet, idx) => {
        disabledSheets[idx] = sheet.disabled;
        sheet.disabled = true;
      });

      let canvas;
      try {
        canvas = await html2canvas(elementToCapture, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          window: iframe.contentWindow || window,
          document: iframeDoc
        } as any);
      } finally {
        // Re-enable all stylesheets immediately after capture
        sheets.forEach((sheet, idx) => {
          sheet.disabled = disabledSheets[idx];
        });
      }
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`recibo-venda-${saleRecord.motoPlaca}-${buyerData.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setPdfError("Erro ao gerar PDF. Tente usar a opção 'Imprimir Recibo' e selecione 'Salvar como PDF'.");
    } finally {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setIsDownloading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (saleRecord.id) {
        const saleRef = doc(db, 'sales', saleRecord.id);
        const updatedData = {
          compradorNome: buyerData.nome,
          compradorCpf: buyerData.cpf,
          compradorRg: buyerData.rg || '',
          compradorEndereco: buyerData.endereco || '',
          telefone: buyerData.telefone,
          dataVenda: buyerData.dataVenda,
          cep: buyerData.cep || ''
        };

        try {
          await updateDoc(saleRef, updatedData);
        } catch (fbErr) {
          handleFirestoreError(fbErr, OperationType.UPDATE, `sales/${saleRecord.id}`);
        }

        // Keep local reference in sync
        saleRecord.compradorNome = buyerData.nome;
        saleRecord.compradorCpf = buyerData.cpf;
        saleRecord.compradorRg = buyerData.rg || '';
        saleRecord.compradorEndereco = buyerData.endereco || '';
        saleRecord.telefone = buyerData.telefone;
        saleRecord.dataVenda = buyerData.dataVenda;
        saleRecord.cep = buyerData.cep || '';

        // Auto-archive motorcycle if sale is completed and now contains filled customer details
        const hasRealNome = buyerData.nome && buyerData.nome.trim() !== '' && buyerData.nome !== 'Venda Direta (Admin)';
        const hasRealCpf = buyerData.cpf && buyerData.cpf.trim() !== '' && buyerData.cpf !== '000.000.000-00';
        const hasRealTel = buyerData.telefone && buyerData.telefone.trim() !== '' && buyerData.telefone !== '-';

        if (saleRecord.status === 'concluida' && hasRealNome && hasRealCpf && hasRealTel) {
          try {
            if (saleRecord.motoId) {
              await updateDoc(doc(db, 'motos', saleRecord.motoId), { arquivada: true });
            }
            if (saleRecord.motoPlaca) {
              const purchasesSnapshot = await getDocs(collection(db, 'purchases'));
              const matchingDoc = purchasesSnapshot.docs.find(d => d.data().motoInfo?.placa === saleRecord.motoPlaca);
              if (matchingDoc) {
                await updateDoc(doc(db, 'purchases', matchingDoc.id), {
                  arquivada: true
                });
              }
            }
          } catch (err) {
            console.error("Erro ao arquivar moto automaticamente no recibo de venda:", err);
          }
        }
      }

      setTimeout(() => {
        setIsSaved(true);
        setIsSaving(false);
      }, 800);
    } catch (error) {
      console.error("Erro ao salvar recibo:", error);
      setIsSaving(false);
      // Fallback local persistence so user doesn't get blocked
      setIsSaved(true);
    }
  };

  const valorFinal = saleRecord.valorVendaFinal ?? saleRecord.valorVenda ?? moto.precoAVista;
  const pagamentos = saleRecord.pagamentos || (
    saleRecord.pagamentoAVista ? [
      {
        id: Date.now().toString(),
        tipo: 'dinheiro',
        valor: saleRecord.valorVenda,
        detalhes: 'À Vista'
      }
    ] : saleRecord.financiamentoBancario ? [
      {
        id: Date.now().toString(),
        tipo: 'financiamento',
        valor: saleRecord.financiamentoBancario.valorFinanciado,
        detalhes: `Banco: ${saleRecord.financiamentoBancario.banco}`
      }
    ] : [
      {
        id: Date.now().toString(),
        tipo: 'dinheiro',
        valor: saleRecord.entrada,
        detalhes: 'Entrada'
      },
      {
        id: (Date.now() + 1).toString(),
        tipo: 'financiamento',
        valor: saleRecord.valorVenda - saleRecord.entrada,
        parcelas: saleRecord.parcelas,
        detalhes: `${saleRecord.parcelas}x de R$ ${saleRecord.valorParcela.toFixed(2)}`
      }
    ]
  );
  const diferenciais = saleRecord.diferenciais || {
    dutIncluso: moto.statusDut === 'DUT INCLUSO',
    garantia6Meses: true,
    tanqueCheio: false,
    capacete: false,
    revisao: moto.statusRevisao === 'REVISADA'
  };
  const observacoes = saleRecord.observacoes || '';
  const fotosRecibo = saleRecord.fotosRecibo || [];

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:max-w-none print:m-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-content, #receipt-content * {
            visibility: visible !important;
          }
          #receipt-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-shadow: none !important;
            background: white !important;
            box-sizing: border-box !important;
          }
        }
      ` }} />
      {/* Formulário do Comprador (Não aparece na impressão) */}
      <div className="lg:col-span-4 bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-800 print:hidden">
        <div className="bg-black p-6 text-white flex items-center gap-3 border-b border-orange-600">
          <FileText className="text-orange-500" size={28} />
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Dados do <span className="text-orange-600">Comprador</span></h2>
            <p className="text-zinc-400 text-xs mt-1 font-bold">Preencha para gerar o recibo</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nome Completo</label>
            <input
              type="text"
              name="nome"
              required
              value={buyerData.nome}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">CPF</label>
              <input
                type="text"
                name="cpf"
                required
                value={buyerData.cpf}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">RG</label>
              <input
                type="text"
                name="rg"
                required
                value={buyerData.rg}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">CEP</label>
              <input
                type="text"
                name="cep"
                value={buyerData.cep}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Telefone</label>
              <input
                type="text"
                name="telefone"
                required
                value={buyerData.telefone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Endereço Completo</label>
            <input
              type="text"
              name="endereco"
              required
              value={buyerData.endereco}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data da Venda</label>
            <input
              type="date"
              name="dataVenda"
              required
              value={buyerData.dataVenda}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-sm text-white"
            />
          </div>

          <div className="pt-6 border-t border-zinc-800 flex flex-col gap-3">
            <motion.button
              type="submit"
              disabled={isSaving}
              layout
              initial={false}
              animate={{
                backgroundColor: isSaved ? '#16a34a' : '#ea580c',
                color: isSaved ? '#ffffff' : '#00050c',
                scale: isSaving ? 0.98 : 1,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 rounded-xl font-black shadow-lg flex justify-center items-center gap-2 uppercase tracking-wider text-sm cursor-pointer border border-transparent select-none`}
            >
              <AnimatePresence mode="wait">
                {isSaving ? (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-black font-black"
                  >
                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Salvando...</span>
                  </motion.div>
                ) : isSaved ? (
                  <motion.div
                    key="saved"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                    className="flex items-center gap-2 text-white font-black"
                  >
                    <CheckCircle size={18} className="text-white" />
                    <span>Dados Salvos</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="save"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex items-center gap-2 text-black font-black"
                  >
                    <span>Salvar Dados</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors shadow-md flex justify-center items-center gap-2 uppercase tracking-wider text-sm"
            >
              <Printer size={18} />
              Imprimir Recibo
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 uppercase tracking-wider text-sm"
            >
              {isDownloading ? (
                <span className="animate-pulse">Gerando PDF...</span>
              ) : (
                <>
                  <Download size={18} />
                  Baixar PDF
                </>
              )}
            </button>
            {pdfError && (
              <p className="text-red-500 text-xs text-center font-bold mt-2">{pdfError}</p>
            )}
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2 border border-zinc-700 rounded-xl text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition-colors flex justify-center items-center gap-2 text-xs uppercase tracking-wider mt-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </form>
      </div>
            {/* Visualização do Recibo (Aparece na impressão) */}
      <div className="lg:col-span-8 bg-zinc-100 p-4 md:p-8 overflow-x-auto custom-scrollbar print:p-0 print:bg-white">
        <div 
          id="receipt-content"
          ref={receiptRef}
          className="w-[651px] min-h-[1123px] bg-white shadow-2xl mx-auto print:shadow-none print:w-full print:min-h-0 text-black flex flex-col"
          style={{ padding: '40px', boxSizing: 'border-box' }}
        >
          {/* Cabeçalho Moderno */}
          <div className="flex justify-between items-start mb-10 pb-8 border-b-4 border-orange-600">
            <div className="flex items-center gap-4">
              <div className="bg-black p-4 rounded-2xl transform -skew-x-6 shadow-lg">
                <Bike size={48} className="text-orange-600 transform skew-x-6" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-black tracking-tighter uppercase leading-none">
                  Franklin <span className="text-orange-600">Motos</span>
                </h1>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Comércio de Motocicletas</p>
                <div className="mt-4 space-y-0.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  <p className="flex items-center gap-1.5"><MapPin size={10} className="text-orange-600" /> AV. CARNEIRO DE MENDONÇA 1606</p>
                  <p className="flex items-center gap-1.5"><Phone size={10} className="text-orange-600" /> (85) 3233-2200 | CNPJ: 08.967.579/0001-78</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-black text-xl mb-2 inline-block shadow-lg border border-orange-600/20">
                RECIBO DE VENDA
              </div>
              <div className="text-zinc-400 font-mono text-xs font-bold">
                Nº {Math.floor(Math.random() * 10000).toString().padStart(5, '0')}
              </div>
              <div className="text-zinc-900 font-black text-sm mt-1 uppercase tracking-widest">
                {new Date(buyerData.dataVenda).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-grow space-y-10">
            {/* Texto do Recibo */}
            <div className="text-base leading-relaxed text-zinc-800 text-justify">
              Recebemos de <span className="font-black text-black uppercase border-b border-zinc-200">{buyerData.nome || '________________________________________________'}</span>, 
              portador(a) do CPF nº <span className="font-bold text-black">{buyerData.cpf || '__________________'}</span> e RG nº <span className="font-bold text-black">{buyerData.rg || '__________________'}</span>, 
              residente e domiciliado(a) na <span className="font-bold text-black">{buyerData.endereco || '____________________________________________________________________'}</span>, 
              a importância de <span className="font-black text-2xl text-orange-600 bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-100">{formatCurrency(valorFinal)}</span> 
              {' '}(<span className="italic text-zinc-500 text-sm font-medium">{numeroPorExtenso(valorFinal)}</span>), referente à compra do veículo abaixo discriminado:
            </div>

            {/* Grid de Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Dados do Veículo */}
              <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 shadow-sm">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Bike size={14} className="text-orange-600" /> Identificação do Veículo
                </h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Marca/Modelo</span>
                    <span className="font-black text-zinc-900 text-sm uppercase">{moto.marcaModelo}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Placa</span>
                    <span className="font-black text-orange-600 text-sm font-mono">{moto.placa}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Ano Fab/Mod</span>
                    <span className="font-black text-zinc-900 text-sm">{moto.anoFabricacao}/{moto.anoModelo}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Quilometragem</span>
                    <span className="font-black text-zinc-900 text-sm">{moto.quilometragem}</span>
                  </div>
                </div>
                
                {/* Diferenciais */}
                <div className="mt-8 pt-6 border-t border-zinc-200">
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-3">Diferenciais Inclusos</span>
                  <div className="flex flex-wrap gap-2">
                    {diferenciais.garantia6Meses && (
                      <span className="flex items-center gap-1 bg-orange-600/10 text-orange-700 text-[9px] px-2.5 py-1 rounded-full font-black border border-orange-600/20">
                        <ShieldCheck size={10} /> GARANTIA 6 MESES
                      </span>
                    )}
                    {diferenciais.tanqueCheio && (
                      <span className="flex items-center gap-1 bg-blue-600/10 text-blue-700 text-[9px] px-2.5 py-1 rounded-full font-black border border-blue-600/20">
                        <CheckCircle size={10} /> TANQUE CHEIO
                      </span>
                    )}
                    {diferenciais.capacete && (
                      <span className="flex items-center gap-1 bg-zinc-900 text-white text-[9px] px-2.5 py-1 rounded-full font-black">
                        <CheckCircle size={10} /> CAPACETE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Condições de Pagamento */}
              <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800 text-white">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <CreditCard size={14} className="text-orange-600" /> Condições de Pagamento
                </h3>
                
                {pagamentos.length > 0 ? (
                  <div className="space-y-4">
                    {pagamentos.map((pag) => (
                      <div key={pag.id} className="flex justify-between items-center text-xs border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                        <div>
                          <span className="font-black text-zinc-100 uppercase tracking-tight">{pag.tipo.replace('_', ' ')}</span>
                          {pag.parcelas && <span className="text-zinc-500 ml-2 font-bold">({pag.parcelas}x)</span>}
                        </div>
                        <span className="font-black text-orange-500">{formatCurrency(pag.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t-2 border-orange-600">
                      <span className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Total Pago</span>
                      <span className="font-black text-white text-xl">{formatCurrency(pagamentos.reduce((acc, curr) => acc + Number(curr.valor), 0))}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-xs font-bold italic">Nenhum pagamento registrado.</div>
                )}
              </div>
            </div>

            {/* Código de Defesa do Consumidor e Termo de Garantia */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-orange-600" /> Código de Defesa do Consumidor (CDC) & Garantia
                </h3>
                <p className="text-[11px] text-zinc-650 leading-relaxed text-justify">
                  Conforme determinado pelo Artigo 26 do Código de Defesa do Consumidor (CDC) brasileiro, a garantia legal obrigatória para motocicletas e veículos usados (bens duráveis) é de <strong>90 dias (3 meses)</strong>. Como benefício exclusivo pós-venda de nossa marca e visando a sua segurança técnica plena, a <strong>Franklin Motos</strong> concede uma garantia bônus voluntária de mais <strong>3 meses (90 dias)</strong> adicionais, totalizando <strong>6 meses (180 dias) de garantia total (limitada a motor e câmbio) com cobertura válida para o referido prazo ou até atingir a quilometragem máxima de 3.500 km rodados</strong> (o que ocorrer primeiro). Este bônus contratual é condicionado à conservação adequada e manutenção preventiva correta realizada pelo proprietário.
                </p>
                <p className="text-[11px] text-zinc-650 leading-relaxed text-justify border-t border-zinc-200/60 pt-2.5">
                  <strong>Declaração de Entrega e Vistoria Presencial:</strong> Fica formalmente registrado que o adquirente/novo proprietário acompanhou de forma minuciosa a vistoria técnica e estética detalhada no ato da entrega do veículo, declarando estar plenamente ciente e de acordo com o excelente estado mecânico, funcional, operacional e estético da motocicleta, atestando que a mesma se encontra em perfeitas condições de uso, segurança e conservação.
                </p>
              </div>
            </div>

            {/* Observações */}
            {observacoes && (
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Info size={14} className="text-orange-600" /> Observações Adicionais
                </h3>
                <p className="text-sm text-zinc-700 leading-relaxed italic">{observacoes}</p>
              </div>
            )}

            {/* Rodapé e Assinaturas */}
            <div className="pt-10">
              <div className="text-center mb-20">
                <p className="text-xs text-zinc-400 font-medium">Por ser verdade, firmamos o presente recibo, dando plena e geral quitação para não mais reclamar sobre a referida quantia.</p>
              </div>

              <div className="grid grid-cols-2 gap-20">
                <div className="text-center">
                  <div className="h-px bg-zinc-200 mb-4" />
                  <p className="font-black text-zinc-900 uppercase text-sm">FRANKLIN SARAGOSSA PAIVA</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vendedor / Emitente</p>
                </div>
                <div className="text-center">
                  <div className="h-px bg-zinc-200 mb-4" />
                  <p className="font-black text-zinc-900 uppercase text-sm">{buyerData.nome || 'Comprador'}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Comprador</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selo de Autenticidade */}
          <div className="mt-auto pt-10 flex justify-between items-end">
            <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
              <Bike size={16} /> Franklin Motos - Qualidade e Confiança
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-black">
                <CheckCircle size={24} />
              </div>
              <div className="text-left">
                <p className="text-[8px] text-zinc-400 font-black uppercase tracking-tighter">Documento Gerado em</p>
                <p className="text-[10px] text-zinc-900 font-black">{new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fotos do Recibo (Apenas Digital) */}
        {fotosRecibo.length > 0 && (
          <div data-html2canvas-ignore="true" className="w-[210mm] mx-auto mt-8 pt-8 border-t-2 border-dashed border-zinc-800 print:hidden">
            <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Camera size={20} className="text-orange-600" /> Anexos Digitais (Fotos da Moto/Documentos)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {fotosRecibo.map((foto, index) => (
                <div key={index} className="aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-lg group relative">
                  <img src={foto} alt={`Anexo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" crossOrigin="anonymous" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-black text-xs uppercase tracking-widest">Anexo {index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
