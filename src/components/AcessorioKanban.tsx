import React, { useState } from 'react';
import { AcessorioSaleRecord } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { Calendar, User, Phone, CheckCircle2, Clock, Trash2, MapPin, CheckSquare, MessageSquare, Truck, PackageCheck, AlertCircle, X } from 'lucide-react';

interface KanbanProps {
  sales: AcessorioSaleRecord[];
}

export default function AcessorioKanban({ sales }: KanbanProps) {
  const [selectedSale, setSelectedSale] = useState<AcessorioSaleRecord | null>(null);

  const columns = [
    { id: 'pendente', title: 'Pedidos em Aberto', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'em_separacao', title: 'Em Separação', icon: PackageCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'aguardando_cliente', title: 'Aguardando Cliente', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'concluida', title: 'Concluído', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
  ];

  const updateStatus = async (sale: AcessorioSaleRecord, newStatus: string) => {
    try {
      if (newStatus === 'concluida' && sale.status !== 'concluida') {
        // Decrease stock if it moves to concluída and wasn't before
        for (const item of sale.items) {
          const acessorioRef = doc(db, 'acessorios', item.acessorioId);
          await updateDoc(acessorioRef, {
            estoque: increment(-item.quantidade)
          });
        }
      }
      
      await updateDoc(doc(db, 'acessorio_sales', sale.id!), { status: newStatus });
      setSelectedSale({ ...sale, status: newStatus as any });
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      try {
        await deleteDoc(doc(db, 'acessorio_sales', id));
        setSelectedSale(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const openWhatsApp = (sale: AcessorioSaleRecord, messageType: string) => {
    // Generate text message based on status
    const cleanPhone = sale.telefone.replace(/\D/g, '');
    let text = `Olá ${sale.compradorNome}, tudo bem? Aqui é da FM Vendas.\n\nSeu pedido de acessórios no valor de ${formatCurrency(sale.valorTotal)} `;
    
    if (messageType === 'em_separacao') {
      text += `foi APROVADO e acabou de entrar EM SEPARAÇÃO! Em breve avisaremos para vir retirar.`;
    } else if (messageType === 'aguardando_cliente') {
      text += `já está SEPARADO e AGUARDANDO A SUA RETIRADA em nossa loja! Pode vir buscar.`;
    } else if (messageType === 'concluida') {
      text += `foi entregue e CONCLUÍDO com sucesso! Agradecemos muito a sua preferência. Volte sempre!`;
    } else {
      text += `está sendo analisado. Qualquer dúvida, estamos à disposição.`;
    }

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="w-full">
      <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory h-[700px] items-start scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {columns.map(col => {
          const colSales = sales.filter(s => s.status === col.id);
          const Icon = col.icon;
          
          return (
            <div key={col.id} className="min-w-[300px] w-[350px] flex-shrink-0 flex flex-col bg-zinc-900/50 rounded-2xl border border-zinc-800 h-full overflow-hidden snap-center">
              {/* Column Header */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${col.bg} ${col.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="font-black text-sm uppercase tracking-wider text-zinc-100">{col.title}</span>
                  </div>
                  <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
                    {colSales.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {colSales.map(sale => (
                  <div 
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl cursor-pointer hover:border-orange-500/50 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-zinc-300 font-bold text-sm truncate pr-2">{sale.compradorNome}</span>
                      <span className="text-emerald-500 font-black text-sm">{formatCurrency(sale.valorTotal)}</span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-xs text-zinc-500">
                        <Clock size={12} className="mr-1.5" />
                        {formatDate(sale.dataVenda)}
                      </div>
                      <div className="flex items-center text-xs text-zinc-500">
                        <PackageCheck size={12} className="mr-1.5" />
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {sale.items.slice(0, 2).map((item, i) => (
                        <span key={i} className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-md truncate max-w-full">
                          {item.quantidade}x {item.nome}
                        </span>
                      ))}
                      {sale.items.length > 2 && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-md">
                          +{sale.items.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {colSales.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 py-10">
                    <Icon size={32} className="mb-2" />
                    <span className="text-xs uppercase tracking-widest font-bold">Vazio</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600/10 text-orange-500 rounded-xl flex items-center justify-center">
                  <PackageCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Pedido de Peças</h3>
                  <p className="text-zinc-500 text-sm font-medium">{formatDate(selectedSale.dataVenda)}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Informações do Cliente</h4>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <p className="text-white font-bold flex items-center gap-2">
                      <User size={16} className="text-orange-500" />
                      {selectedSale.compradorNome}
                    </p>
                    <p className="text-zinc-400 text-sm flex items-center gap-2">
                      <Phone size={16} className="text-zinc-500" />
                      {selectedSale.telefone}
                    </p>
                    {selectedSale.endereco && (
                      <p className="text-zinc-400 text-sm flex items-start gap-2 pt-2 border-t border-zinc-800/50">
                        <MapPin size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                        <span className="leading-tight">{selectedSale.endereco}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ações Rápidas</h4>
                  <button
                    onClick={() => openWhatsApp(selectedSale, selectedSale.status)}
                    className="w-full flex justify-center items-center gap-2 py-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl border border-[#25D366]/20 font-black uppercase tracking-wider text-xs hover:bg-[#25D366]/20 transition-colors"
                  >
                    <MessageSquare size={16} />
                    Avisar no WhatsApp
                  </button>
                  <p className="text-xs text-zinc-500 text-center px-4">
                    Envia um aviso pré-formatado sobre a situação atual do pedido.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Itens do Pedido</h4>
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                      <div>
                        <p className="text-zinc-200 font-bold text-sm">{item.nome}</p>
                        <p className="text-zinc-500 text-xs">{item.quantidade}x {formatCurrency(item.preco)}</p>
                      </div>
                      <p className="font-bold text-orange-500">{formatCurrency(item.preco * item.quantidade)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-zinc-800">
                    <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Total</span>
                    <span className="text-2xl font-black text-white">{formatCurrency(selectedSale.valorTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Status Actions */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-2">
                {selectedSale.status !== 'concluida' && (
                  <button
                    onClick={() => handleDelete(selectedSale.id!)}
                    className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-800 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {selectedSale.status === 'pendente' && (
                  <button
                    onClick={() => updateStatus(selectedSale, 'em_separacao')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-4 px-8 bg-blue-600 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
                  >
                    Aprovar para Separação
                  </button>
                )}
                {selectedSale.status === 'em_separacao' && (
                  <button
                    onClick={() => updateStatus(selectedSale, 'aguardando_cliente')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-4 px-8 bg-purple-600 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
                  >
                    Separado (Aguardar Cliente)
                  </button>
                )}
                {selectedSale.status === 'aguardando_cliente' && (
                  <button
                    onClick={() => {
                      if (confirm("Confirmar a entrega e o pagamento? Isso finalizará o pedido.")) {
                        updateStatus(selectedSale, 'concluida');
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-4 px-8 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                  >
                    Marcar como Concluído
                  </button>
                )}
                {selectedSale.status === 'concluida' && (
                  <div className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black uppercase tracking-wider text-xs">
                    <CheckCircle2 size={16} />
                    Pedido Finalizado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
