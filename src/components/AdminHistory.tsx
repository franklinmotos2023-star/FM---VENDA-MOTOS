import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, handleFirestoreError, OperationType, updateDoc, increment } from '../firebase';
import { db } from '../firebase';
import { SaleRecord, Moto, AcessorioSaleRecord } from '../types';
import { Calendar, User, Phone, CheckCircle2, Clock, FileEdit, Eye, Trash2, FileText, Package, Wrench, X, MessageSquare } from 'lucide-react';
import SaleProcessor from './SaleProcessor';
import AcessorioKanban from './AcessorioKanban';

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
    const qSales = query(collection(db, 'sales'), orderBy('dataVenda', 'desc'));
    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
      setSales(salesData);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error listing sales (quota exceeded?):", error);
      setSales([]);
      setLoading(false);
    });

    const qAcessorioSales = query(collection(db, 'acessorio_sales'), orderBy('dataVenda', 'desc'));
    const unsubscribeAcessorioSales = onSnapshot(qAcessorioSales, (snapshot) => {
      const acessorioSalesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcessorioSaleRecord));
      setAcessorioSales(acessorioSalesData);
    }, (error) => {
      console.warn("Firestore error listing acessorio_sales (quota exceeded?):", error);
      setAcessorioSales([]);
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

  const handleSendWhatsAppMessage = (sale: SaleRecord) => {
    const nome = sale.compradorNome;
    const moto = sale.motoMarcaModelo;
    const placa = sale.motoPlaca;

    let rawMessage = '';

    if (sale.status === 'concluida') {
      const valorOriginal = formatCurrency(sale.valorVenda);
      const valorFinal = formatCurrency(sale.valorVendaFinal || sale.valorVenda);
      const desconto = sale.descontoAplicado && sale.descontoAplicado > 0 ? formatCurrency(sale.descontoAplicado) : 'R$ 0,00';
      const dataVendaFormatada = sale.dataFinalizacao ? formatDate(sale.dataFinalizacao) : formatDate(sale.dataVenda);

      const mapPaymentType = (tipo: string) => {
        const maps: Record<string, string> = {
          dinheiro: 'Dinheiro',
          pix: 'PIX',
          cartao_credito: 'Cartão de Crédito',
          cartao_debito: 'Cartão de Débito',
          financiamento: 'Financiamento Bancário',
          promissoria: 'Nota Promissória',
          outro: 'Outro'
        };
        return maps[tipo] || tipo;
      };

      let formasPagamento = '';
      if (sale.pagamentos && sale.pagamentos.length > 0) {
        formasPagamento = sale.pagamentos.map(p => {
          let detail = `✔️ ${mapPaymentType(p.tipo)}: ${formatCurrency(p.valor)}`;
          if (p.parcelas && p.parcelas > 1) {
            detail += ` (${p.parcelas}x)`;
          }
          if (p.detalhes) {
            detail += ` - ${p.detalhes}`;
          }
          return detail;
        }).join('\n');
      } else {
        if (sale.pagamentoAVista) {
          formasPagamento = `✔️ À Vista\n• Valor Final: ${valorFinal}`;
        } else if (sale.financiamentoBancario) {
          const banco = sale.financiamentoBancario.banco || 'Banco Parceiro';
          const valorFinanciado = sale.financiamentoBancario.valorFinanciado ? formatCurrency(sale.financiamentoBancario.valorFinanciado) : valorFinal;
          const entrada = sale.entrada ? formatCurrency(sale.entrada) : 'R$ 0,00';
          formasPagamento = `✔️ Financiamento via ${banco}\n• Entrada: ${entrada}\n• Valor Financiado: ${valorFinanciado}`;
        } else {
          const entrada = sale.entrada ? formatCurrency(sale.entrada) : 'R$ 0,00';
          const parcelas = sale.parcelas || 1;
          const valorParcela = sale.valorParcela ? formatCurrency(sale.valorParcela) : 'R$ 0,00';
          formasPagamento = `✔️ Parcelamento Loja / Cartão\n• Entrada: ${entrada}\n• Plano: ${parcelas}x de ${valorParcela}`;
        }
      }

      const benefits = [];
      if (sale.diferenciais) {
        if (sale.diferenciais.dutIncluso) benefits.push('⭐ DUT Incluso');
        if (sale.diferenciais.revisao) benefits.push('⭐ Motocicleta Revisada');
        if (sale.diferenciais.garantia6Meses) {
          benefits.push('⭐ Garantia Estendida de 6 Meses ou até 3.500 km rodados (cobertura para motor e câmbio)');
        }
        if (sale.diferenciais.tanqueCheio) benefits.push('⭐ Tanque Cheio');
        if (sale.diferenciais.capacete) benefits.push('⭐ Capacete de Brinde');
      } else {
        benefits.push('⭐ DUT Incluso');
        benefits.push('⭐ Motocicleta Revisada');
        benefits.push('⭐ Garantia Estendida de 6 Meses ou até 3.500 km rodados (cobertura para motor e câmbio)');
      }
      benefits.push('🔍 Vistoria de Entrega Presencial: Confirmamos que o novo proprietário acompanhou presencialmente toda a vistoria detalhada de entrega do veículo, atestando sob sua total aprovação que a motocicleta se encontra em perfeitas condições mecânicas, de segurança, funcionais, estruturais e estéticas para uso imediato.');
      const benefitsText = benefits.length > 0 ? benefits.join('\n') : '';

      const observacoesTexto = sale.observacoes ? `\n\n📌 *Observações:* ${sale.observacoes}` : '';

      rawMessage = `🏍️ *FRANKLIN MOTOS* 🏍️
🧾 *RECIBO DE VENDA CONFIRMADA*

Prezado(a) *${nome}*, é com enorme orgulho que confirmamos a conclusão da venda do seu veículo! Segue o recibo detalhado da negociação realizada:

━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *DADOS DO CLIENTE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Nome:* ${nome}
• *CPF:* ${sale.compradorCpf || 'Não informado'}
• *Telefone:* ${sale.telefone}
• *Endereço:* ${sale.compradorEndereco || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🏍️ *DETALHES DO VEÍCULO*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Modelo:* ${moto}
• *Placa:* ${placa || 'Pendente'}
• *Data de Conclusão:* ${dataVendaFormatada}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *VALORES DA NEGOCIAÇÃO*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Valor Comercial:* ${valorOriginal}
• *Desconto Aplicado:* ${desconto}
• *Valor Final da Venda:* ${valorFinal}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 *FORMA DE PAGAMENTO*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${formasPagamento}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ *BENEFÍCIOS & DIFERENCIAIS ADQUIRIDOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${benefitsText}${observacoesTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━
A *Franklin Motos* agradece imensamente a sua confiança e preferência! Desejamos excelentes rodagens com o seu novo veículo! Que ele traga muitas conquistas e caminhos prósperos! 🏍️💨✨
━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    } else {
      const total = formatCurrency(sale.valorVenda);
      let pagamentoTexto = '';
      if (sale.pagamentoAVista) {
        pagamentoTexto = `👉 À Vista\n• Valor Final: ${total}`;
      } else if (sale.financiamentoBancario) {
        const banco = sale.financiamentoBancario.banco || 'Banco Parceiro';
        const valorFinanciado = sale.financiamentoBancario.valorFinanciado ? formatCurrency(sale.financiamentoBancario.valorFinanciado) : total;
        const entrada = sale.entrada ? formatCurrency(sale.entrada) : 'R$ 0,00';
        pagamentoTexto = `👉 Financiamento Bancário via ${banco}\n• Entrada: ${entrada}\n• Valor Financiado: ${valorFinanciado}`;
      } else {
        const entrada = sale.entrada ? formatCurrency(sale.entrada) : 'R$ 0,00';
        const parcelas = sale.parcelas || 1;
        const valorParcela = sale.valorParcela ? formatCurrency(sale.valorParcela) : 'R$ 0,00';
        pagamentoTexto = `👉 Parcelamento pela Loja / Cartão\n• Entrada: ${entrada}\n• Plano: ${parcelas}x de ${valorParcela}`;
      }

      // Diferenciais
      const difs = [];
      if (sale.diferenciais) {
        difs.push(`• DUT Incluso: ${sale.diferenciais.dutIncluso ? 'Sim' : 'Não/Por conta'}`);
        difs.push(`• Revisada: ${sale.diferenciais.revisao ? 'Sim' : 'Não'}`);
        difs.push(`• Garantia de 6 meses: ${sale.diferenciais.garantia6Meses ? 'Sim' : 'Não'}`);
        difs.push(`• Tanque Cheio: ${sale.diferenciais.tanqueCheio ? 'Sim' : 'Não'}`);
        difs.push(`• Capacete de Brinde: ${sale.diferenciais.capacete ? 'Sim' : 'Não'}`);
      } else {
        difs.push(`• DUT Incluso: Sim`);
        difs.push(`• Revisada: Sim`);
        difs.push(`• Garantia de 6 meses: Sim`);
      }

      const diferenciaisTexto = difs.join('\n');

      rawMessage = `Olá, *${nome}*! Tudo bem? 🌟

Temos ótimas notícias! Sua proposta para a aquisição da motocicleta na *Franklin Motos* foi **APROVADA** com sucesso! 🎉

Confira abaixo os detalhes da sua simulação aprovada:

🏍️ *Veículo:* ${moto}
📋 *Placa:* ${placa}
💰 *Valor do Veículo:* ${total}

💳 *Forma de Pagamento:*
${pagamentoTexto}

🛠️ *Diferenciais & Benefícios inclusos:*
${diferenciaisTexto}

Estamos muito felizes em fazer parte dessa nova conquista! Nossa equipe de atendimento está pronta para dar os próximos passos para a entrega do seu veículo. 

Por favor, nos confirme quando puder comparecer à nossa loja para a assinatura e retirada do veículo. 🏍️✨

Qualquer dúvida, estamos à total disposição neste número!

Atenciosamente,
*Franklin Motos* 🏍️`;
    }

    const encodedText = encodeURIComponent(rawMessage);
    // Sanitize phone number (remove non-digits)
    let cleanedPhone = sale.telefone.replace(/\D/g, '');
    if (cleanedPhone.length > 0) {
      // If it doesn't already have a country code (like 55 for Brazil), and has Brazilian local number length, prepend 55
      if (!cleanedPhone.startsWith('55') && (cleanedPhone.length === 10 || cleanedPhone.length === 11)) {
        cleanedPhone = '55' + cleanedPhone;
      }
    }
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
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

      {vendasTab === 'motos' && (
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
            {sales.filter(s => s.status === 'pendente').length > 0 && (
              <span className="ml-2 bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs">
                {sales.filter(s => s.status === 'pendente').length}
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
      )}

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

                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={() => handleSendWhatsAppMessage(sale)}
                    className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600 hover:text-black text-emerald-500 border border-emerald-500/20 hover:border-emerald-600 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-[10px]"
                    title={sale.status === 'concluida' ? "Enviar Recibo de Venda via WhatsApp" : "Enviar WhatsApp de Proposta Aprovada"}
                  >
                    <MessageSquare size={14} /> {sale.status === 'concluida' ? 'Enviar WhatsApp (Recibo)' : 'Enviar WhatsApp (Aprovada)'}
                  </button>

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
              </div>
            ))}
          </div>
        )
      ) : (
        <AcessorioKanban sales={acessorioSales} />
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
