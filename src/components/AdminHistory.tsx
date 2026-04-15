import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, handleFirestoreError, OperationType, updateDoc, increment } from '../firebase';
import { db } from '../firebase';
import { SaleRecord, Moto, AcessorioSaleRecord } from '../types';
import { Calendar, User, Phone, CheckCircle2, Clock, FileEdit, Eye, Trash2, FileText, Package, Wrench, X } from 'lucide-react';
import SaleProcessor from './SaleProcessor';

interface AdminHistoryProps {
  motos: Moto[];
}

export default function AdminHistory({ motos }: AdminHistoryProps) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [acessorioSales, setAcessorioSales] = useState<AcessorioSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [vendasTab, setVendasTab] = useState<'motos' | 'acessorios'>('motos');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [selectedAcessorioSale, setSelectedAcessorioSale] = useState<AcessorioSaleRecord | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [acessorioSaleToDelete, setAcessorioSaleToDelete] = useState<string | null>(null);

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

  const confirmDeleteAcessorioSale = async () => {
    if (acessorioSaleToDelete) {
      try {
        await deleteDoc(doc(db, 'acessorio_sales', acessorioSaleToDelete));
        setAcessorioSaleToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `acessorio_sales/${acessorioSaleToDelete}`);
      }
    }
  };

  const updateAcessorioSaleStatus = async (sale: AcessorioSaleRecord, newStatus: 'concluida' | 'cancelada') => {
    try {
      if (newStatus === 'concluida') {
        // Decrement stock for each item
        for (const item of sale.items) {
          const acessorioRef = doc(db, 'acessorios', item.acessorioId);
          await updateDoc(acessorioRef, {
            estoque: increment(-item.quantidade)
          });
        }
      }
      await updateDoc(doc(db, 'acessorio_sales', sale.id!), { status: newStatus });
      setSelectedAcessorioSale(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `acessorio_sales/${sale.id}`);
    }
  };

  useEffect(() => {
    const qSales = query(collection(db, 'sales'), orderBy('dataVenda', 'desc'));
    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
      setSales(salesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
      setLoading(false);
    });

    const qAcessorioSales = query(collection(db, 'acessorio_sales'), orderBy('dataVenda', 'desc'));
    const unsubscribeAcessorioSales = onSnapshot(qAcessorioSales, (snapshot) => {
      const acessorioSalesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcessorioSaleRecord));
      setAcessorioSales(acessorioSalesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'acessorio_sales');
    });

    return () => {
      unsubscribeSales();
      unsubscribeAcessorioSales();
    };
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

  const filteredAcessorioSales = acessorioSales.filter(sale => 
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
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Vendas</h2>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setVendasTab('motos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                vendasTab === 'motos' 
                  ? 'bg-orange-600 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Package size={14} /> Vendas - Motos
            </button>
            <button
              onClick={() => setVendasTab('acessorios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                vendasTab === 'acessorios' 
                  ? 'bg-orange-600 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Wrench size={14} /> Vendas - Peças e Acessórios
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full sm:w-auto bg-zinc-900 p-1 rounded-xl border border-zinc-800 max-w-fit">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
            activeTab === 'pendentes' 
              ? 'bg-zinc-800 text-white shadow-lg' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          Pendentes
          {(vendasTab === 'motos' ? sales : acessorioSales).filter(s => s.status === 'pendente').length > 0 && (
            <span className="ml-2 bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs">
              {(vendasTab === 'motos' ? sales : acessorioSales).filter(s => s.status === 'pendente').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('concluidas')}
          className={`px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
            activeTab === 'concluidas' 
              ? 'bg-zinc-800 text-white shadow-lg' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          Concluídas
        </button>
      </div>

      {vendasTab === 'motos' ? (
        filteredSales.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-800">
            <Clock size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma venda de moto {activeTab === 'pendentes' ? 'pendente' : 'concluída'}</h3>
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
        )
      ) : (
        filteredAcessorioSales.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-800">
            <Clock size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum pedido de acessório {activeTab === 'pendentes' ? 'pendente' : 'concluído'}</h3>
            <p className="text-zinc-500">
              {activeTab === 'pendentes' 
                ? 'Os novos pedidos aparecerão aqui para análise.' 
                : 'Os pedidos finalizados aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAcessorioSales.map((sale) => (
              <div key={sale.id} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Pedido #{sale.id?.substring(0, 6)}</h3>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-wider">{sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAcessorioSaleToDelete(sale.id!);
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Excluir Pedido"
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
                  <div className="space-y-2 mb-3">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-zinc-400 truncate pr-2">{item.quantidade}x {item.nome}</span>
                        <span className="text-white font-bold shrink-0">{formatCurrency(item.preco * item.quantidade)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total do Pedido</span>
                    <span className="text-lg font-black text-orange-500">{formatCurrency(sale.valorTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAcessorioSale(sale)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Eye size={18} />
                  Ver Detalhes
                </button>
              </div>
            ))}
          </div>
        )
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

      {selectedAcessorioSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Pedido #{selectedAcessorioSale.id?.substring(0, 6)}</h2>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">{formatDate(selectedAcessorioSale.dataVenda)}</p>
              </div>
              <button onClick={() => setSelectedAcessorioSale(null)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4">Dados do Cliente</h3>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">Nome</span>
                  <span className="text-white font-medium">{selectedAcessorioSale.compradorNome}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">CPF</span>
                  <span className="text-white font-medium">{selectedAcessorioSale.compradorCpf}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">Telefone</span>
                  <span className="text-white font-medium">{selectedAcessorioSale.telefone}</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4">Endereço</h3>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">CEP</span>
                  <span className="text-white font-medium">{selectedAcessorioSale.cep || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">Endereço Completo</span>
                  <span className="text-white font-medium">{selectedAcessorioSale.endereco || 'Não informado'}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 mb-8">
              <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4">Itens do Pedido</h3>
              <div className="space-y-3">
                {selectedAcessorioSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b border-zinc-800/50 last:border-0 last:pb-0">
                    <div>
                      <span className="text-white font-medium block">{item.nome}</span>
                      <span className="text-zinc-500 text-xs">{item.quantidade}x {formatCurrency(item.preco)}</span>
                    </div>
                    <span className="text-white font-bold">{formatCurrency(item.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400 font-bold uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black text-orange-500">{formatCurrency(selectedAcessorioSale.valorTotal)}</span>
              </div>
            </div>

            {selectedAcessorioSale.status === 'pendente' && (
              <div className="flex gap-4">
                <button
                  onClick={() => updateAcessorioSaleStatus(selectedAcessorioSale, 'cancelada')}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-red-500/20 text-white hover:text-red-500 rounded-xl font-black uppercase tracking-wider transition-all"
                >
                  Cancelar Pedido
                </button>
                <button
                  onClick={() => updateAcessorioSaleStatus(selectedAcessorioSale, 'concluida')}
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-black rounded-xl font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                >
                  Marcar como Concluído
                </button>
              </div>
            )}
          </div>
        </div>
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

      {acessorioSaleToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Excluir Pedido</h3>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja excluir este pedido de acessório? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAcessorioSaleToDelete(null)}
                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAcessorioSale}
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
