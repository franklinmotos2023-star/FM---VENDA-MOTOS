import React, { useRef, useState } from 'react';
import { PurchaseRecord } from '../types';
import { FileText, Printer, ArrowLeft, Download, Bike, MapPin, Phone, CreditCard, Info, User, Calendar, ShieldCheck, Camera } from 'lucide-react';
import { numeroPorExtenso } from '../utils/numberToWords';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';

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

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recibo-Compra-${purchase.motoInfo.placa}-${purchase.vendedorNome.replace(/\s+/g, '-').toLowerCase()}`,
  });

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    setPdfError(null);
    
    try {
      const element = receiptRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        imageTimeout: 15000,
        logging: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      
      const finalWidth = pdfWidth;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
      
      // If content is longer than one page, we might need to handle multiple pages
      // but for a receipt, usually one page is enough or we can scale it down.
      
      pdf.save(`recibo-compra-${purchase.motoInfo.placa}-${purchase.vendedorNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setPdfError("Erro ao gerar PDF. Tente imprimir e salvar como PDF.");
    } finally {
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
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Valor de Entrada</span>
                  <span className="font-black text-white text-lg">{formatCurrency(purchase.entrada)}</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Saldo Parcelado</span>
                  <span className="font-black text-orange-500 text-lg">{formatCurrency(purchase.valorFinanciado)}</span>
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
