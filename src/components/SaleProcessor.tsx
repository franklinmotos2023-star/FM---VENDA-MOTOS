import React, { useState } from 'react';
import { SaleRecord, PaymentMethod, Moto } from '../types';
import { doc, updateDoc, db, handleFirestoreError, OperationType } from '../firebase';
import { CheckCircle2, X, Plus, Trash2, Camera, FileText, Printer } from 'lucide-react';
import ReceiptGenerator from './ReceiptGenerator';

interface SaleProcessorProps {
  sale: SaleRecord;
  moto?: Moto;
  onClose: () => void;
  readOnly?: boolean;
}

export default function SaleProcessor({ sale, moto, onClose, readOnly = false }: SaleProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(readOnly); // If readOnly, we might want to just show the receipt or details
  
  // Editable fields
  const [valorVendaFinal, setValorVendaFinal] = useState(sale.valorVendaFinal || sale.valorVenda);
  const [descontoAplicado, setDescontoAplicado] = useState(sale.descontoAplicado || 0);
  const [observacoes, setObservacoes] = useState(sale.observacoes || '');
  
  const [diferenciais, setDiferenciais] = useState({
    dutIncluso: sale.diferenciais?.dutIncluso ?? true,
    garantia6Meses: sale.diferenciais?.garantia6Meses ?? true,
    tanqueCheio: sale.diferenciais?.tanqueCheio ?? false,
    capacete: sale.diferenciais?.capacete ?? false,
    revisao: sale.diferenciais?.revisao ?? true,
  });

  const [pagamentos, setPagamentos] = useState<PaymentMethod[]>(sale.pagamentos || (
    sale.pagamentoAVista ? [
      {
        id: Date.now().toString(),
        tipo: 'dinheiro',
        valor: sale.valorVenda,
        detalhes: 'À Vista'
      }
    ] : sale.financiamentoBancario ? [
      {
        id: Date.now().toString(),
        tipo: 'financiamento',
        valor: sale.financiamentoBancario.valorFinanciado,
        detalhes: `Banco: ${sale.financiamentoBancario.banco}`
      }
    ] : [
      {
        id: Date.now().toString(),
        tipo: 'dinheiro',
        valor: sale.entrada,
        detalhes: 'Entrada'
      },
      {
        id: (Date.now() + 1).toString(),
        tipo: 'financiamento',
        valor: sale.valorVenda - sale.entrada,
        parcelas: sale.parcelas,
        detalhes: `${sale.parcelas}x de R$ ${sale.valorParcela.toFixed(2)}`
      }
    ]
  ));

  const [fotosRecibo, setFotosRecibo] = useState<string[]>(sale.fotosRecibo || []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openBase64InNewTab = (base64Data: string) => {
    try {
      const parts = base64Data.split(';base64,');
      if (parts.length !== 2) {
        console.error("Invalid base64 string");
        return;
      }
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Erro ao abrir o arquivo.");
    }
  };

  const handleAddPayment = () => {
    setPagamentos([
      ...pagamentos,
      { id: Date.now().toString(), tipo: 'dinheiro', valor: 0 }
    ]);
  };

  const handleRemovePayment = (id: string) => {
    setPagamentos(pagamentos.filter(p => p.id !== id));
  };

  const handleUpdatePayment = (id: string, field: keyof PaymentMethod, value: any) => {
    setPagamentos(pagamentos.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFinalize = async () => {
    if (!sale.id) return;
    setIsProcessing(true);
    setSaveError(null);

    try {
      const saleRef = doc(db, 'sales', sale.id);
      
      const updatedData: Partial<SaleRecord> = {
        status: 'concluida',
        valorVendaFinal,
        descontoAplicado,
        pagamentos,
        diferenciais,
        observacoes,
        fotosRecibo,
        dataFinalizacao: new Date().toISOString()
      };

      try {
        await updateDoc(saleRef, updatedData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sales/${sale.id}`);
      }
      
      // Update local sale object for the receipt
      Object.assign(sale, updatedData);
      
      setIsSaved(true);
      setTimeout(() => {
        setShowReceipt(true);
        setIsSaved(false);
      }, 1500);
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      setSaveError("Erro ao finalizar venda. Verifique sua conexão e tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
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

        // Compress to 70% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFotosRecibo(prev => [...prev, compressedBase64]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const totalPagamentos = pagamentos.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const diferenca = valorVendaFinal - totalPagamentos;

  if (showReceipt) {
    const receiptMoto: Moto = moto || {
      id: sale.motoId,
      placa: sale.motoPlaca,
      marcaModelo: sale.motoMarcaModelo,
      anoFabricacao: 0,
      anoModelo: 0,
      quilometragem: '',
      precoAVista: sale.valorVenda,
      statusRevisao: sale.diferenciais?.revisao ? 'REVISADA' : 'NÃO REVISADA',
      statusDut: sale.diferenciais?.dutIncluso ? 'DUT INCLUSO' : 'POR CONTA DO COMPRADOR',
      fotos: []
    };

    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
        <div className="p-4">
          <ReceiptGenerator
            moto={receiptMoto}
            saleRecord={sale}
            onBack={() => {
              if (readOnly) {
                onClose();
              } else {
                setShowReceipt(false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-4xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between items-center rounded-t-3xl z-10">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Finalizar Venda</h2>
            <p className="text-orange-500 font-mono text-sm">{sale.motoMarcaModelo} - {sale.motoPlaca}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Resumo Original */}
          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-orange-500" />
                Dados da Proposta Original
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">Cliente</span>
                  <span className="text-white font-medium">{sale.compradorNome}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">CPF</span>
                  <span className="text-white font-medium">{sale.compradorCpf || '-'}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">Telefone</span>
                  <span className="text-white font-medium">{sale.telefone}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">Email</span>
                  <span className="text-white font-medium">{sale.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">CEP</span>
                  <span className="text-white font-medium">{sale.cep || '-'}</span>
                </div>
                {sale.dataNascimento && (
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase text-xs">Data Nasc.</span>
                    <span className="text-white font-medium">{sale.dataNascimento.split('-').reverse().join('/')}</span>
                  </div>
                )}
                {sale.possuiCnh !== undefined && (
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase text-xs">Possui CNH?</span>
                    <span className="text-white font-medium">{sale.possuiCnh ? 'Sim' : 'Não'}</span>
                  </div>
                )}
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-xs">Valor Base Simulado</span>
                  <span className="text-white font-medium">{formatCurrency(sale.valorVenda)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-zinc-500 font-bold uppercase text-xs">Proposta de Pagamento</span>
                  <span className="text-orange-500 font-bold">{formatCurrency(sale.entrada)} + {sale.parcelas}x de {formatCurrency(sale.valorParcela)}</span>
                </div>
              </div>
            </div>

            {sale.financiamentoBancario?.questionario && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                  Questionário de Avaliação (Cliente)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase text-xs">Tempo Certo de Compra</span>
                    <span className="text-white font-medium">{sale.financiamentoBancario.questionario.tempoCompra}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase text-xs">Feedback da Simulação</span>
                    <span className="text-white font-medium">{sale.financiamentoBancario.questionario.sistemaSimulacao}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase text-xs">Aprovação dos Preços</span>
                    <span className="text-white font-medium">{sale.financiamentoBancario.questionario.precos}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna 1: Valores e Diferenciais */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-zinc-800 pb-2">Valores Finais</h3>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Valor Final da Venda (R$)</label>
                  <input
                    type="number"
                    value={valorVendaFinal}
                    onChange={(e) => setValorVendaFinal(Number(e.target.value))}
                    disabled={readOnly}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white font-bold disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Desconto Aplicado (R$)</label>
                  <input
                    type="number"
                    value={descontoAplicado}
                    onChange={(e) => setDescontoAplicado(Number(e.target.value))}
                    disabled={readOnly}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white font-bold disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-zinc-800 pb-2">Diferenciais Inclusos</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(diferenciais).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setDiferenciais({ ...diferenciais, [key]: e.target.checked })}
                        disabled={readOnly}
                        className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-600 focus:ring-offset-zinc-900 bg-zinc-900 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-zinc-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna 2: Pagamentos e Observações */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Métodos de Pagamento</h3>
                  {!readOnly && (
                    <button onClick={handleAddPayment} className="text-xs font-bold text-orange-500 hover:text-orange-400 uppercase flex items-center gap-1">
                      <Plus size={14} /> Adicionar
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {pagamentos.map((pagamento, index) => (
                    <div key={pagamento.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 relative group">
                      {!readOnly && (
                        <button 
                          onClick={() => handleRemovePayment(pagamento.id)}
                          className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                          <select
                            value={pagamento.tipo}
                            onChange={(e) => handleUpdatePayment(pagamento.id, 'tipo', e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-50"
                          >
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            <option value="financiamento">Financiamento</option>
                            <option value="promissoria">Promissória</option>
                            <option value="outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            value={pagamento.valor}
                            onChange={(e) => handleUpdatePayment(pagamento.id, 'valor', Number(e.target.value))}
                            disabled={readOnly}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                      
                      {(pagamento.tipo === 'cartao_credito' || pagamento.tipo === 'financiamento' || pagamento.tipo === 'promissoria') && (
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Parcelas</label>
                          <input
                            type="number"
                            value={pagamento.parcelas || ''}
                            onChange={(e) => handleUpdatePayment(pagamento.id, 'parcelas', Number(e.target.value))}
                            placeholder="Qtd."
                            disabled={readOnly}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-50"
                          />
                        </div>
                      )}
                      
                      <div>
                        <input
                          type="text"
                          value={pagamento.detalhes || ''}
                          onChange={(e) => handleUpdatePayment(pagamento.id, 'detalhes', e.target.value)}
                          placeholder="Detalhes (ex: Banco, Bandeira)"
                          disabled={readOnly}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-orange-500 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={`p-3 rounded-xl flex justify-between items-center text-sm font-bold ${diferenca === 0 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                  <span>Total Pagamentos: {formatCurrency(totalPagamentos)}</span>
                  <span>Diferença: {formatCurrency(diferenca)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Anotações internas sobre a venda..."
                  disabled={readOnly}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm resize-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-zinc-800 pb-2">Anexos do Recibo</h3>
                <div className="grid grid-cols-3 gap-3">
                  {sale.financiamentoBancario?.anexoProposta && (
                    <div className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-800 flex flex-col items-center justify-center bg-zinc-950">
                      <button onClick={() => openBase64InNewTab(sale.financiamentoBancario!.anexoProposta!)} className="flex flex-col items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors w-full h-full justify-center">
                        <FileText size={32} />
                        <span className="text-xs font-bold text-center px-2">Proposta<br/>Financiamento</span>
                      </button>
                    </div>
                  )}
                  {fotosRecibo.map((foto, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-800">
                      <img src={foto} alt={`Anexo ${index + 1}`} className="w-full h-full object-cover" />
                      {!readOnly && (
                        <button
                          onClick={() => setFotosRecibo(fotosRecibo.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-800 hover:border-orange-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-zinc-500 hover:text-orange-500 bg-zinc-950">
                      <Camera size={24} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">Adicionar<br/>Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-6 border-t border-zinc-800 bg-zinc-950 rounded-b-3xl flex flex-col gap-4">
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs font-bold text-center">
              {saveError}
            </div>
          )}
          
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {readOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button
                onClick={handleFinalize}
                disabled={isProcessing || isSaved || diferenca !== 0}
                className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isSaved 
                    ? 'bg-green-600 text-white' 
                    : 'bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSaved ? (
                  <CheckCircle2 size={20} className="animate-bounce" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {isSaved ? 'Venda Finalizada!' : 'Confirmar Venda'}
              </button>
            )}
            {readOnly && (
              <button
                onClick={() => setShowReceipt(true)}
                className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
              >
                <Printer size={20} />
                Ver Recibo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
