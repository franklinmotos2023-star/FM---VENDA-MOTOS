import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { db } from '../firebase';
import { SaleRecord, Moto } from '../types';
import { Calendar, User, Phone, CheckCircle2, Clock, FileEdit, Eye, Trash2, FileText } from 'lucide-react';
import SaleProcessor from './SaleProcessor';

interface AdminHistoryProps {
  motos: Moto[];
}

export default function AdminHistory({ motos }: AdminHistoryProps) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const confirmDeleteSale = async () => {
    if (saleToDelete) {
      try {
        await deleteDoc(doc(db, 'sales', saleToDelete));
        setSaleToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `sales/${saleToDelete}`);
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('dataVenda', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
      setSales(salesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSales = sales.filter(sale => 
    activeTab === 'pendentes' ? sale.status === 'pendente' : sale.status === 'concluida'
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Histórico de <span className="text-orange-600">Vendas</span></h2>
        
        <div className="flex w-full sm:w-auto bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
              activeTab === 'pendentes' 
                ? 'bg-orange-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Pendentes
            {sales.filter(s => s.status === 'pendente').length > 0 && (
              <span className="ml-2 bg-white text-orange-600 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                {sales.filter(s => s.status === 'pendente').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('concluidas')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
              activeTab === 'concluidas' 
                ? 'bg-orange-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-800">
          <Clock size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma venda {activeTab === 'pendentes' ? 'pendente' : 'concluída'}</h3>
          <p className="text-zinc-500">
            {activeTab === 'pendentes' 
              ? 'As novas simulações aparecerão aqui para análise.' 
              : 'As vendas finalizadas aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{sale.motoMarcaModelo}</h3>
                  <p className="text-orange-500 font-mono font-bold text-sm">{sale.motoPlaca}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaleToDelete(sale.id!);
                    }}
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Excluir Registro"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className={`p-2 rounded-lg ${sale.status === 'concluida' ? 'bg-green-600/20 text-green-500' : 'bg-yellow-600/20 text-yellow-500'}`}>
                    {sale.status === 'concluida' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <User size={16} className="text-zinc-500" />
                  <span className="font-medium truncate">{sale.compradorNome}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Phone size={16} className="text-zinc-500" />
                  <span className="font-medium">{sale.telefone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Calendar size={16} className="text-zinc-500" />
                  <span className="font-medium">{formatDate(sale.dataVenda)}</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 space-y-2 mb-4">
                {sale.pagamentoAVista ? (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 uppercase font-bold tracking-wider">Pagamento</span>
                    <span className="text-green-500 font-black">À Vista</span>
                  </div>
                ) : sale.financiamentoBancario ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold tracking-wider">Pagamento</span>
                      <span className="text-blue-500 font-black">Financiamento</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold tracking-wider">Banco</span>
                      <span className="text-white font-bold">{sale.financiamentoBancario.banco}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold tracking-wider">Valor Financiado</span>
                      <span className="text-white font-bold">{formatCurrency(sale.financiamentoBancario.valorFinanciado)}</span>
                    </div>
                    {sale.financiamentoBancario.anexoProposta && (
                      <div className="flex justify-between text-xs pt-2 border-t border-zinc-800/50">
                        <span className="text-zinc-500 uppercase font-bold tracking-wider">Anexo</span>
                        <button 
                          onClick={() => openBase64InNewTab(sale.financiamentoBancario!.anexoProposta!)}
                          className="text-orange-500 hover:text-orange-400 font-bold flex items-center gap-1 transition-colors"
                        >
                          <FileText size={14} />
                          Ver Proposta
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold tracking-wider">Entrada</span>
                      <span className="text-white font-bold">{formatCurrency(sale.entrada)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold tracking-wider">Parcelamento</span>
                      <span className="text-orange-500 font-black">{sale.parcelas}x de {formatCurrency(sale.valorParcela)}</span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Simulado</span>
                  <span className="text-lg font-black text-white">{formatCurrency(sale.valorVenda)}</span>
                </div>
              </div>

              {activeTab === 'pendentes' ? (
                <button
                  onClick={() => setSelectedSale(sale)}
                  className="w-full py-3 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-600/20 hover:border-orange-600 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <FileEdit size={18} />
                  Analisar Proposta
                </button>
              ) : (
                <button
                  onClick={() => setSelectedSale(sale)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Eye size={18} />
                  Ver Detalhes
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedSale && activeTab === 'pendentes' && (
        <SaleProcessor 
          sale={selectedSale} 
          moto={motos.find(m => m.id === selectedSale.motoId)}
          onClose={() => setSelectedSale(null)} 
        />
      )}
      
      {selectedSale && activeTab === 'concluidas' && (
        <SaleProcessor 
          sale={selectedSale} 
          moto={motos.find(m => m.id === selectedSale.motoId)}
          onClose={() => setSelectedSale(null)} 
          readOnly={true}
        />
      )}

      {saleToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Excluir Registro</h3>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja excluir este registro de venda? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSaleToDelete(null)}
                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSale}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
