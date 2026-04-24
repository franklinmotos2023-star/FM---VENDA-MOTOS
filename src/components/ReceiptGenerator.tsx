import React, { useState, useRef } from 'react';
import { Moto, BuyerData, SaleRecord } from '../types';
import { FileText, Printer, ArrowLeft, CheckCircle, Camera, Download, Bike, ShieldCheck, MapPin, Phone, CreditCard, Info, User } from 'lucide-react';
import { numeroPorExtenso } from '../utils/numberToWords';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useReactToPrint } from 'react-to-print';

interface ReceiptGeneratorProps {
  moto: Moto;
  saleRecord: SaleRecord;
  onBack: () => void;
}

export default function ReceiptGenerator({ moto, saleRecord, onBack }: ReceiptGeneratorProps) {
  const [buyerData, setBuyerData] = useState<BuyerData>({
    nome: saleRecord.compradorNome || '',
    cpf: saleRecord.compradorCpf || '',
    rg: '',
    endereco: '',
    telefone: saleRecord.telefone || '',
    dataVenda: new Date(saleRecord.dataVenda).toISOString().split('T')[0],
    cep: saleRecord.cep || ''
  });

  const [isSaved, setIsSaved] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBuyerData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recibo-${saleRecord.motoPlaca}-${buyerData.nome.replace(/\s+/g, '-').toLowerCase()}`,
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      
      const finalWidth = pdfWidth;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
      
      // If content is longer than one page, we might need to handle it, 
      // but usually receipts are one page A4.
      
      pdf.save(`recibo-venda-${saleRecord.motoPlaca}-${buyerData.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setPdfError("Erro ao gerar PDF. Tente usar a opção 'Imprimir Recibo' e selecione 'Salvar como PDF'.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
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
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .custom-scrollbar {
            overflow: visible !important;
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
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-black transition-colors shadow-md flex justify-center items-center gap-2 uppercase tracking-wider text-sm ${
                isSaved ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-orange-600 text-black hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle size={18} />
                  Dados Salvos
                </>
              ) : (
                'Salvar Dados'
              )}
            </button>
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
          className="w-[794px] min-h-[1123px] bg-white shadow-2xl mx-auto print:shadow-none print:w-full print:min-h-0 text-black flex flex-col"
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
