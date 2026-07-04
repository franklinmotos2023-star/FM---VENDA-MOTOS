import React, { useRef, useState } from 'react';
import { PurchaseRecord } from '../types';
import { FileText, Printer, ArrowLeft, Download, Bike, MapPin, Phone, CreditCard, Info, User, Calendar, ShieldCheck, Camera } from 'lucide-react';
import { numeroPorExtenso } from '../utils/numberToWords';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';

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

interface PurchaseReceiptGeneratorProps {
  purchase: PurchaseRecord;
  onBack: () => void;
  isNew?: boolean;
}

export default function PurchaseReceiptGenerator({ purchase, onBack, isNew }: PurchaseReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const originalTitle = document.title;
    const documentTitle = `Recibo-Compra-${purchase.motoInfo.placa}-${purchase.vendedorNome.replace(/\s+/g, '-').toLowerCase()}`;
    document.title = documentTitle;

    // Create temporary hidden iframe for printable content separation
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

      // Apply print styling resets
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
          console.error("Iframe printing exception:", e);
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
      clonedReceipt.id = 'purchase-receipt-content';
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

      const elementToCapture = iframeDoc.getElementById('purchase-receipt-content') || clonedReceipt;

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
      pdf.save(`recibo-compra-${purchase.motoInfo.placa}-${purchase.vendedorNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4; 
            margin: 0; 
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-hidden {
            display: none !important;
          }
        }
      ` }} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Recibo de <span className="text-orange-600">Compra</span></h2>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] disabled:opacity-50"
          >
            {isDownloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
            ) : (
              <Download size={18} />
            )}
            {isDownloading ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>

      {isNew && (
        <div className="mb-8 bg-green-600/20 border border-green-600/50 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 print:hidden">
          <div className="bg-green-600 p-2 rounded-lg">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-green-500 font-black uppercase tracking-widest text-xs">Compra Registrada com Sucesso!</h4>
            <p className="text-green-500/70 text-[10px] font-bold uppercase tracking-widest">O recibo foi gerado e está pronto para impressão ou download.</p>
          </div>
        </div>
      )}

      {pdfError && <p className="text-red-500 text-center font-bold text-sm print:hidden">{pdfError}</p>}

      <div className="bg-zinc-100 p-4 md:p-8 overflow-x-auto print:p-0 print:bg-white flex justify-center">
        <div 
          id="purchase-receipt-content"
          ref={receiptRef}
          className="w-[794px] min-h-[1123px] bg-white shadow-2xl print:shadow-none print:w-full print:min-h-0 text-black flex flex-col"
          style={{ padding: '40px', boxSizing: 'border-box' }}
        >
          {/* Header */}
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
                RECIBO DE COMPRA
              </div>
              <div className="text-zinc-400 font-mono text-xs font-bold">
                Nº {Math.floor(Math.random() * 10000).toString().padStart(5, '0')}
              </div>
              <div className="text-zinc-900 font-black text-sm mt-1 uppercase tracking-widest">
                {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-grow space-y-10">
            <div className="text-base leading-relaxed text-zinc-800 text-justify">
              Pelo presente instrumento, a empresa <span className="font-black text-black uppercase">FRANKLIN SARAGOSSA PAIVA</span>, 
              inscrita no CNPJ sob o nº 08.967.579/0001-78, declara ter adquirido de 
              <span className="font-black text-black uppercase border-b border-zinc-200 ml-1">{purchase.vendedorNome}</span>, 
              portador(a) do CPF/CNPJ nº <span className="font-bold text-black">{purchase.vendedorCpfCnpj}</span>, 
              residente e domiciliado(a) em <span className="font-bold text-black">{purchase.vendedorEndereco || '________________________________________________'}</span>, 
              o veículo abaixo discriminado, pela importância total de 
              <span className="font-black text-2xl text-orange-600 bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-100 ml-1">{formatCurrency(purchase.valorTotal)}</span> 
              {' '}(<span className="italic text-zinc-500 text-sm font-medium">{numeroPorExtenso(purchase.valorTotal)}</span>).
            </div>

            {/* Vehicle Info */}
            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 shadow-sm">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Bike size={14} className="text-orange-600" /> Dados do Veículo Adquirido
              </h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Marca/Modelo</span>
                  <span className="font-black text-zinc-900 text-sm uppercase">{purchase.motoInfo.marcaModelo}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Placa</span>
                  <span className="font-black text-orange-600 text-sm font-mono">{purchase.motoInfo.placa}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Ano Fab/Mod</span>
                  <span className="font-black text-zinc-900 text-sm">{purchase.motoInfo.anoFabricacao}/{purchase.motoInfo.anoModelo}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Quilometragem</span>
                  <span className="font-black text-zinc-900 text-sm">{purchase.motoInfo.quilometragem}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Cor</span>
                  <span className="font-black text-zinc-900 text-sm uppercase">{purchase.motoInfo.cor}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Chassi</span>
                  <span className="font-black text-zinc-900 text-xs font-mono uppercase">{purchase.motoInfo.chassi || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800 text-white">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <CreditCard size={14} className="text-orange-600" /> Condições de Pagamento da Compra
              </h3>
              <div className="grid grid-cols-1 gap-8 mb-6">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Custo Total Acumulado</span>
                  <span className="font-black text-white text-lg">
                    {formatCurrency(purchase.custos?.reduce((acc: number, c: any) => acc + (c.valor || 0), 0) || 0)}
                  </span>
                </div>
              </div>

              {purchase.parcelas.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-3">Cronograma de Parcelas</span>
                  <div className="grid grid-cols-3 gap-2">
                    {purchase.parcelas.map((p) => (
                      <div key={p.numero} className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500">{p.numero}ª</span>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-zinc-100">{formatCurrency(p.valor)}</p>
                          <p className="text-[8px] font-bold text-zinc-600">{new Date(p.dataVencimento).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Observations */}
            {purchase.observacoes && (
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Info size={14} className="text-orange-600" /> Observações da Compra
                </h3>
                <p className="text-sm text-zinc-700 leading-relaxed italic">{purchase.observacoes}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-20">
              <div className="grid grid-cols-2 gap-20">
                <div className="text-center">
                  <div className="h-px bg-zinc-200 mb-4" />
                  <p className="font-black text-zinc-900 uppercase text-sm">FRANKLIN SARAGOSSA PAIVA</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Comprador / Adquirente</p>
                </div>
                <div className="text-center">
                  <div className="h-px bg-zinc-200 mb-4" />
                  <p className="font-black text-zinc-900 uppercase text-sm">{purchase.vendedorNome}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vendedor / Cedente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Seal */}
          <div className="mt-auto pt-10 flex justify-between items-end">
            <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
              <Bike size={16} /> Franklin Motos - Gestão de Estoque Profissional
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-black">
                <ShieldCheck size={24} />
              </div>
              <div className="text-left">
                <p className="text-[8px] text-zinc-400 font-black uppercase tracking-tighter">Compra Registrada em</p>
                <p className="text-[10px] text-zinc-900 font-black">{new Date(purchase.dataCompra).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
