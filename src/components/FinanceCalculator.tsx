import React, { useState, useEffect } from 'react';
import { Moto, SaleData, SaleRecord } from '../types';
import { Calculator, ArrowRight, CheckCircle2, Info, MessageCircle, User, CreditCard, MapPin, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, setDoc, doc } from '../firebase';

interface FinanceCalculatorProps {
  moto: Moto;
  onConfirm: (saleData: SaleData, record?: SaleRecord) => void;
  onCancel: () => void;
  isAdmin?: boolean;
  userData?: any;
}

export default function FinanceCalculator({ moto, onConfirm, onCancel, isAdmin, userData }: FinanceCalculatorProps) {
  const [entrada, setEntrada] = useState<number | ''>('');
  const [taxasExtras, setTaxasExtras] = useState<number>(0);
  const [desconto, setDesconto] = useState<number | ''>('');
  
  const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'avista' | 'financiamento'>('cartao');
  const [banco, setBanco] = useState('');
  const [valorFinanciadoBancario, setValorFinanciadoBancario] = useState<number | ''>('');
  const [anexoProposta, setAnexoProposta] = useState<string | null>(null);

  const [financiamentoStep, setFinanciamentoStep] = useState<'dados_pessoais' | 'dados_moto' | 'proposta_enviada' | 'questionario'>('dados_pessoais');
  const [isConfirmingFinanciamento, setIsConfirmingFinanciamento] = useState(false);
  const [showLgpdModal, setShowLgpdModal] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [questionario, setQuestionario] = useState({
    tempoCompra: '',
    sistemaSimulacao: '',
    precos: '',
    proposalId: ''
  });

  const [opcoes, setOpcoes] = useState<SaleData[]>([]);
  const [resultado, setResultado] = useState<SaleData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [step, setStep] = useState<'calculator' | 'proposal_form' | 'success'>('calculator');
  
  const [buyerData, setBuyerData] = useState({
    nome: userData?.nome || '',
    cpf: userData?.cpf || '',
    cep: userData?.cep || '',
    telefone: userData?.telefone || '',
    email: userData?.email || '',
    dataNascimento: userData?.dataNascimento || '',
    possuiCnh: null as boolean | null
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod !== 'cartao') return;
    
    setIsCalculating(true);
    setResultado(null);

    setTimeout(() => {
      const valorDesconto = isAdmin ? (Number(desconto) || 0) : 0;
      const valorBase = moto.precoAVista - valorDesconto;
      const valorEntrada = Number(entrada) || 0;
      const valorFinanciado = valorBase - valorEntrada + taxasExtras;
      
      let planos = moto.planos && moto.planos.length > 0 ? moto.planos : [
        { parcelas: 12, taxaTotal: 10.30 },
        { parcelas: 16, taxaTotal: 13.443 },
        { parcelas: 17, taxaTotal: 14.207 },
        { parcelas: 18, taxaTotal: 14.982 },
        { parcelas: 19, taxaTotal: 15.767 },
        { parcelas: 20, taxaTotal: 16.564 },
        { parcelas: 21, taxaTotal: 17.371 },
        { parcelas: 24, taxaTotal: 19.73 },
        { parcelas: 36, taxaTotal: 29.15 },
        { parcelas: 48, taxaTotal: 38.58 }
      ];
      
      // Se não for admin, limita a 21x
      if (!isAdmin) {
        planos = planos.filter(p => p.parcelas <= 21);
      }
      
      const novasOpcoes = planos.map((plano) => {
        const multiplicador = 1 + (plano.taxaTotal / 100);
        const totalComTaxas = valorFinanciado * multiplicador;
        
        // Adiciona R$20 fixo em cada parcela (Taxa da Loja)
        const valorParcela = (totalComTaxas / plano.parcelas) + 20;
        const valorFinal = valorEntrada + (valorParcela * plano.parcelas);
        const totalJuros = (valorParcela * plano.parcelas) - valorFinanciado;

        return {
          motoId: moto.id,
          valorBase,
          entrada: valorEntrada,
          taxaJuros: plano.taxaTotal / plano.parcelas, // Taxa média mensal equivalente
          parcelas: plano.parcelas,
          taxasExtras,
          valorFinal,
          valorParcela,
          totalJuros,
          valorFinanciado
        };
      });

      setOpcoes(novasOpcoes);
      setIsCalculating(false);
    }, 600);
  };

  // Auto-scroll para o resultado quando selecionado
  useEffect(() => {
    if (resultado) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }, [resultado]);

  // Auto-scroll para as opções quando geradas
  useEffect(() => {
    if (opcoes.length > 0) {
      setTimeout(() => {
        document.getElementById('opcoes-parcelamento')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [opcoes]);

  const generateWhatsAppUrl = () => {
    let message = `*PROPOSTA DE COMPRA - FRANKLIN MOTOS*\n\n` +
      `*CLIENTE:* ${buyerData.nome}\n` +
      `*CPF:* ${buyerData.cpf}\n` +
      `*CEP:* ${buyerData.cep}\n` +
      `*TELEFONE:* ${buyerData.telefone}\n\n` +
      `*MOTO:* ${moto.marcaModelo}\n` +
      `*PLACA:* ${moto.placa}\n\n` +
      `*DETALHES DA PROPOSTA:*\n`;

    if (paymentMethod === 'avista') {
      message += `- Pagamento: À Vista\n` +
        `- Valor Original: ${formatCurrency(moto.precoAVista)}\n` +
        `- Desconto: R$ 500,00\n` +
        `- Valor Final: ${formatCurrency(moto.precoAVista - 500)}\n\n`;
    } else if (paymentMethod === 'financiamento') {
      message += `- Pagamento: Financiamento Bancário\n` +
        `- Banco: ${banco}\n` +
        `- Valor Financiado: ${formatCurrency(Number(valorFinanciadoBancario) || 0)}\n` +
        `- Valor da Moto: ${formatCurrency(moto.precoAVista)}\n\n`;
    } else {
      message += `- Pagamento: Cartão de Crédito\n` +
        `- Valor da Moto: ${formatCurrency(moto.precoAVista)}\n` +
        `- Entrada: ${formatCurrency(resultado!.entrada)}\n` +
        `- Parcelamento: ${resultado!.parcelas}x de ${formatCurrency(resultado!.valorParcela)}\n` +
        `- Valor Total (com encargos): ${formatCurrency(resultado!.valorFinal)}\n\n`;
    }

    message += `Tenho interesse nesta proposta e gostaria de prosseguir com o pedido.`;

    return `https://wa.me/558532332200?text=${encodeURIComponent(message)}`;
  };

  const handleConfirmAction = async () => {
    if (isAdmin) {
      // Admin approves directly
      try {
        const saleRecord: SaleRecord = {
          id: Date.now().toString(), // Generate a temporary ID or use Firestore auto-id
          motoId: moto.id,
          motoMarcaModelo: moto.marcaModelo,
          motoPlaca: moto.placa,
          compradorNome: 'Venda Direta (Admin)',
          compradorCpf: '000.000.000-00',
          telefone: '-',
          email: '-',
          cep: '-',
          valorVenda: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.valorFinal || moto.precoAVista),
          entrada: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.entrada || 0),
          parcelas: paymentMethod === 'avista' ? 1 : (resultado?.parcelas || 1),
          valorParcela: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.valorParcela || 0),
          dataVenda: new Date().toISOString(),
          vendedorUid: 'admin',
          status: 'pendente',
          pagamentoAVista: paymentMethod === 'avista',
          ...(paymentMethod === 'financiamento' ? {
            financiamentoBancario: {
              banco,
              valorFinanciado: Number(valorFinanciadoBancario) || 0,
              ...(anexoProposta ? { anexoProposta } : {})
            }
          } : {})
        };
        const docRef = doc(collection(db, 'sales'));
        saleRecord.id = docRef.id;
        await setDoc(docRef, saleRecord);
        
        // Instead of going to receipt, let's just go back to list and let the admin process it in history
        alert("Venda enviada para o histórico como pendente. Vá para a aba Histórico para finalizar.");
        onCancel();
      } catch (error) {
        console.error("Erro ao salvar venda:", error);
        alert("Erro ao registrar venda.");
      }
    } else {
      setStep('proposal_form');
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Abre o WhatsApp IMEDIATAMENTE para evitar bloqueadores de pop-up
      const whatsappUrl = generateWhatsAppUrl();
      window.open(whatsappUrl, '_blank');

      // Salvar a proposta no histórico
      const saleRecord: SaleRecord = {
        motoId: moto.id,
        motoMarcaModelo: moto.marcaModelo,
        motoPlaca: moto.placa,
        compradorNome: buyerData.nome,
        compradorCpf: buyerData.cpf,
        telefone: buyerData.telefone,
        email: buyerData.email,
        cep: buyerData.cep,
        dataNascimento: buyerData.dataNascimento,
        possuiCnh: buyerData.possuiCnh !== null ? buyerData.possuiCnh : undefined,
        valorVenda: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.valorFinal || moto.precoAVista),
        entrada: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.entrada || 0),
        parcelas: paymentMethod === 'avista' ? 1 : (resultado?.parcelas || 1),
        valorParcela: paymentMethod === 'avista' ? moto.precoAVista - 500 : (resultado?.valorParcela || 0),
        dataVenda: new Date().toISOString(),
        vendedorUid: 'cliente',
        status: 'pendente',
        pagamentoAVista: paymentMethod === 'avista',
        ...(paymentMethod === 'financiamento' ? {
          financiamentoBancario: {
            banco,
            valorFinanciado: Number(valorFinanciadoBancario) || 0,
            ...(anexoProposta ? { anexoProposta } : {})
          }
        } : {})
      };
      await setDoc(doc(collection(db, 'sales')), saleRecord);

      setStep('success');
    } catch (error) {
      console.error("Erro ao enviar proposta:", error);
      alert("Erro ao salvar proposta. Tente novamente.");
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(22,163,74,0.4)]">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Proposta <span className="text-green-500">Salva!</span></h2>
        <p className="text-zinc-400 text-lg mb-6 leading-relaxed">
          Obrigado pelo seu contato, <strong>{buyerData.nome}</strong>!<br/>
          Sua proposta foi salva em nosso sistema com sucesso.
        </p>
        <div className="bg-zinc-950 p-6 rounded-2xl border border-orange-600/30 mb-8 inline-block text-left max-w-lg">
          <div className="flex items-start gap-3">
            <Info className="text-orange-500 shrink-0 mt-1" size={24} />
            <div>
              <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-2">Atenção: Passo Importante</p>
              <p className="text-white font-medium text-sm leading-relaxed">
                Para agilizar o seu atendimento e garantir a reserva, é muito importante que você também nos envie a proposta via WhatsApp.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 max-w-md mx-auto">
          <button
            onClick={() => window.open(generateWhatsAppUrl(), '_blank')}
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] text-white rounded-xl font-black hover:bg-[#20BD5A] transition-all uppercase tracking-wider text-sm shadow-lg"
          >
            <MessageCircle size={20} />
            Re-enviar via WhatsApp
          </button>
          <button
            onClick={onCancel}
            className="block w-full py-4 bg-zinc-800 text-white rounded-xl font-black hover:bg-zinc-700 transition-all uppercase tracking-wider text-sm"
          >
            Voltar para as Motos
          </button>
        </div>
      </div>
    );
  }

  if (step === 'proposal_form') {
    return (
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800">
          <div className="bg-black p-8 text-white flex items-center gap-4 border-b border-orange-600">
            <div className="bg-orange-600 p-3 rounded-2xl">
              <User className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Confirmar <span className="text-orange-600">Proposta</span></h2>
              <p className="text-zinc-400 text-sm mt-1 font-bold">Preencha seus dados para enviar o pedido</p>
            </div>
          </div>

          <form onSubmit={handleSendWhatsApp} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <User size={14} className="text-orange-500" /> Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={buyerData.nome}
                  onChange={(e) => setBuyerData({...buyerData, nome: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <CreditCard size={14} className="text-orange-500" /> CPF
                </label>
                <input
                  type="text"
                  required
                  value={buyerData.cpf}
                  onChange={(e) => setBuyerData({...buyerData, cpf: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <MapPin size={14} className="text-orange-500" /> CEP
                </label>
                <input
                  type="text"
                  required
                  value={buyerData.cep}
                  onChange={(e) => setBuyerData({...buyerData, cep: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <Phone size={14} className="text-orange-500" /> Telefone
                </label>
                <input
                  type="tel"
                  required
                  value={buyerData.telefone}
                  onChange={(e) => setBuyerData({...buyerData, telefone: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white font-bold"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Resumo da Proposta</h4>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Moto:</span>
                <span className="text-white font-bold">{moto.marcaModelo}</span>
              </div>
              
              {paymentMethod === 'avista' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Pagamento:</span>
                    <span className="text-white font-bold">À Vista</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Desconto:</span>
                    <span className="text-green-500 font-bold">- R$ 500,00</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">Total:</span>
                    <span className="text-white font-black text-lg">{formatCurrency(moto.precoAVista - 500)}</span>
                  </div>
                </>
              )}

              {paymentMethod === 'financiamento' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Pagamento:</span>
                    <span className="text-white font-bold">Financiamento Bancário</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Banco:</span>
                    <span className="text-white font-bold">{banco}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Valor Financiado:</span>
                    <span className="text-white font-bold">{formatCurrency(Number(valorFinanciadoBancario) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">Valor da Moto:</span>
                    <span className="text-white font-black text-lg">{formatCurrency(moto.precoAVista)}</span>
                  </div>
                </>
              )}

              {paymentMethod === 'cartao' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Plano:</span>
                    <span className="text-orange-500 font-black">{resultado?.parcelas}x de {formatCurrency(resultado?.valorParcela || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">Total:</span>
                    <span className="text-white font-black text-lg">{formatCurrency(resultado?.valorFinal || 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setStep('calculator')}
                className="px-8 py-4 border border-zinc-700 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider text-sm"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-black hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] flex justify-center items-center gap-3 uppercase tracking-wider text-sm"
              >
                <MessageCircle size={20} />
                Confirmar via WhatsApp
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Formulário de Cálculo */}
      <div className="bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-800">
        <div className="bg-black p-6 text-white flex items-center justify-between border-b border-orange-600">
          <div className="flex items-center gap-3">
            <Calculator className="text-orange-500" size={28} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Simulação <span className="text-orange-600">Financeira</span></h2>
              <p className="text-zinc-400 text-sm mt-1 font-mono font-bold uppercase tracking-wider">{moto.marcaModelo} - 6 MESES DE GARANTIA*</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor da Moto</span>
            <span className="text-2xl font-black text-white">{formatCurrency(moto.precoAVista)}</span>
          </div>
        </div>

        <form onSubmit={paymentMethod === 'cartao' ? handleCalculate : () => setStep('proposal_form')} className="p-6">
          <div className="mb-8">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Opção de Pagamento</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => { setPaymentMethod('cartao'); setOpcoes([]); setResultado(null); }}
                className={`p-4 rounded-xl border-2 font-black uppercase tracking-wider text-sm transition-all ${paymentMethod === 'cartao' ? 'border-orange-600 bg-orange-600/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
              >
                Cartão de Crédito
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('avista'); setOpcoes([]); setResultado(null); }}
                className={`p-4 rounded-xl border-2 font-black uppercase tracking-wider text-sm transition-all ${paymentMethod === 'avista' ? 'border-orange-600 bg-orange-600/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
              >
                Pagamento à Vista
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('financiamento'); setOpcoes([]); setResultado(null); }}
                className={`p-4 rounded-xl border-2 font-black uppercase tracking-wider text-sm transition-all ${paymentMethod === 'financiamento' ? 'border-orange-600 bg-orange-600/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
              >
                Financiamento
              </button>
            </div>
          </div>

          {paymentMethod === 'cartao' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Valor da Moto</label>
                <div className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl font-black text-white text-lg flex flex-col justify-center">
                  {moto.precoAntigo && moto.precoAVista && moto.precoAntigo > moto.precoAVista && (
                    <span className="text-xs text-zinc-500 line-through mb-0.5">{formatCurrency(moto.precoAntigo)}</span>
                  )}
                  <span>{formatCurrency(moto.precoAVista)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Entrada (R$)</label>
                <input
                  type="number"
                  min="0"
                  max={moto.precoAVista}
                  step="0.01"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Digite o valor"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-lg font-bold text-white"
                />
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Desconto (R$)</label>
                  <input
                    type="number"
                    min="0"
                    max={moto.precoAVista}
                    step="0.01"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-lg font-bold text-white"
                  />
                  {Number(desconto) > 0 && (
                    <p className="text-xs text-orange-500 mt-1 font-bold">
                      Novo valor base: {formatCurrency(moto.precoAVista - Number(desconto))}
                    </p>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Taxas Extras (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxasExtras}
                    onChange={(e) => setTaxasExtras(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-lg font-bold text-white"
                  />
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'avista' && (
            <div className="mb-8 space-y-6">
              <div className="bg-green-600/10 border border-green-600/30 p-6 rounded-2xl">
                <h3 className="text-lg font-black text-green-500 uppercase tracking-wider mb-4">Benefícios do Pagamento à Vista</h3>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Desconto de R$ 500,00 no valor total</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Livre de taxa da loja</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Negociação à parte do DUT</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Valor Original</h4>
                  <p className="text-2xl font-black text-zinc-400 line-through">{formatCurrency(moto.precoAVista)}</p>
                </div>
                <div className="bg-orange-600/10 p-6 rounded-2xl border border-orange-600/30">
                  <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">Valor à Vista</h4>
                  <p className="text-3xl font-black text-white">{formatCurrency(moto.precoAVista - 500)}</p>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'financiamento' && (
            <div className="mb-8 space-y-6">
              {financiamentoStep === 'dados_pessoais' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-orange-600/10 border border-orange-600/30 p-6 rounded-2xl">
                    <h3 className="text-lg font-black text-orange-500 uppercase tracking-wider mb-2">Dados Pessoais</h3>
                    <p className="text-sm text-zinc-300">Preencha seus dados para iniciar a simulação de financiamento.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
                      <input type="text" required value={buyerData.nome} onChange={(e) => setBuyerData({...buyerData, nome: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">CPF (11 dígitos)</label>
                        {buyerData.cpf && buyerData.cpf.replace(/\D/g, '').length !== 11 && (
                          <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-bold">11 dígitos necessários</span>
                        )}
                      </div>
                      <input type="text" placeholder="Apenas números" required value={buyerData.cpf} onChange={(e) => setBuyerData({...buyerData, cpf: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white" maxLength={11} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Telefone (DDD + 9 dígitos)</label>
                        {buyerData.telefone && buyerData.telefone.replace(/\D/g, '').length !== 11 && (
                          <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-bold">11 dígitos necessários</span>
                        )}
                      </div>
                      <input type="text" placeholder="Apenas números (ex: 81999999999)" required value={buyerData.telefone} onChange={(e) => setBuyerData({...buyerData, telefone: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white" maxLength={11} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Data de Nascimento</label>
                      <input type="date" required value={buyerData.dataNascimento} onChange={(e) => setBuyerData({...buyerData, dataNascimento: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white [color-scheme:dark]" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                      <input type="email" required value={buyerData.email} onChange={(e) => setBuyerData({...buyerData, email: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">CEP</label>
                      <input type="text" required value={buyerData.cep} onChange={(e) => setBuyerData({...buyerData, cep: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Possui CNH?</label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setBuyerData({...buyerData, possuiCnh: true})}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${buyerData.possuiCnh === true ? 'border-orange-600 bg-orange-600/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setBuyerData({...buyerData, possuiCnh: false})}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${buyerData.possuiCnh === false ? 'border-orange-600 bg-orange-600/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLgpdModal(true);
                    }}
                    disabled={
                      !buyerData.nome || 
                      buyerData.cpf.replace(/\D/g, '').length !== 11 || 
                      buyerData.telefone.replace(/\D/g, '').length !== 11 || 
                      !buyerData.email || 
                      !buyerData.cep || 
                      !buyerData.dataNascimento || 
                      buyerData.possuiCnh === null
                    }
                    className="w-full py-4 bg-orange-600 text-black rounded-xl font-black hover:bg-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-70 flex justify-center items-center uppercase tracking-wider text-sm"
                  >
                    Confirmar Dados
                  </button>
                </motion.div>
              )}

              {financiamentoStep === 'proposta_enviada' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Proposta Enviada!</h3>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Sua proposta de financiamento foi enviada com sucesso. Nossa equipe analisará os dados e entrará em contato em breve.
                  </p>
                  <div className="flex flex-col gap-4 max-w-sm mx-auto mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        const text = `Olá! Acabei de enviar uma proposta de financiamento para a moto ${moto.marcaModelo} (${moto.anoFabricacao}/${moto.anoModelo}). Meu nome é ${buyerData.nome}.`;
                        window.open(`https://wa.me/5581999999999?text=${encodeURIComponent(text)}`, '_blank');
                        setFinanciamentoStep('questionario');
                      }}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-black hover:bg-green-500 transition-colors shadow-[0_0_15px_rgba(22,163,74,0.3)] flex justify-center items-center gap-2 uppercase tracking-wider text-sm"
                    >
                      <MessageCircle size={20} />
                      Confirmar via WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanciamentoStep('questionario')}
                      className="w-full py-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors uppercase tracking-wider text-sm"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              )}

              {financiamentoStep === 'questionario' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="bg-orange-600/10 border border-orange-600/30 p-6 rounded-2xl text-center">
                    <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider mb-2">Pesquisa Rápida</h3>
                    <p className="text-sm text-zinc-300">Ajude-nos a melhorar respondendo a estas 3 perguntas rápidas.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-white uppercase tracking-wider">1. Quando você pretende comprar a moto?</label>
                      <div className="space-y-2">
                        {['O mais rápido possível (1 semana)', 'Em breve (1 mês)', 'Ainda este ano (6 meses)', 'Estou apenas simulando'].map(opt => (
                          <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors">
                            <input type="radio" name="tempoCompra" value={opt} checked={questionario.tempoCompra === opt} onChange={(e) => setQuestionario({...questionario, tempoCompra: e.target.value})} className="text-orange-600 focus:ring-orange-600 bg-zinc-950 border-zinc-700" />
                            <span className="text-zinc-300 text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-white uppercase tracking-wider">2. O que achou do nosso sistema de simulação?</label>
                      <div className="space-y-2">
                        {['Fácil de utilizar e de entender cada etapa', 'Tive dificuldade no início mas depois consegui', 'Não consigo fazer minha simulação'].map(opt => (
                          <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors">
                            <input type="radio" name="sistemaSimulacao" value={opt} checked={questionario.sistemaSimulacao === opt} onChange={(e) => setQuestionario({...questionario, sistemaSimulacao: e.target.value})} className="text-orange-600 focus:ring-orange-600 bg-zinc-950 border-zinc-700" />
                            <span className="text-zinc-300 text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-white uppercase tracking-wider">3. O que achou dos nossos preços?</label>
                      <div className="space-y-2">
                        {['Em conta, preço justo.', 'Na média do mercado', 'Um pouco caro', 'Caríssimo, acima do mercado.'].map(opt => (
                          <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors">
                            <input type="radio" name="precos" value={opt} checked={questionario.precos === opt} onChange={(e) => setQuestionario({...questionario, precos: e.target.value})} className="text-orange-600 focus:ring-orange-600 bg-zinc-950 border-zinc-700" />
                            <span className="text-zinc-300 text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (questionario.proposalId) {
                          const proposalRef = doc(db, 'sales', questionario.proposalId);
                          await setDoc(proposalRef, {
                            financiamentoBancario: {
                              questionario: {
                                tempoCompra: questionario.tempoCompra,
                                sistemaSimulacao: questionario.sistemaSimulacao,
                                precos: questionario.precos
                              }
                            }
                          }, { merge: true });
                        }
                        onCancel();
                      } catch (error) {
                        console.error("Error saving questionnaire:", error);
                        alert("Erro ao salvar questionário. Tente novamente.");
                      }
                    }}
                    disabled={!questionario.tempoCompra || !questionario.sistemaSimulacao || !questionario.precos}
                    className="w-full py-4 bg-orange-600 text-black rounded-xl font-black hover:bg-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-70 flex justify-center items-center uppercase tracking-wider text-sm"
                  >
                    Finalizar Questionário
                  </button>
                </motion.div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            {paymentMethod !== 'financiamento' && (
              <button
                type="button"
                onClick={onCancel}
                className="px-8 py-4 border border-zinc-700 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider text-sm"
              >
                Voltar
              </button>
            )}
            {paymentMethod !== 'financiamento' && (
              <button
                type="button"
                onClick={() => {
                  if (paymentMethod === 'cartao') {
                    handleCalculate({ preventDefault: () => {} } as React.FormEvent);
                  } else {
                    setStep('proposal_form');
                  }
                }}
                disabled={isCalculating}
                className="flex-1 py-4 bg-orange-600 text-black rounded-xl font-black hover:bg-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-70 flex justify-center items-center uppercase tracking-wider text-sm"
              >
                {isCalculating ? (
                  <span className="animate-pulse">Processando...</span>
                ) : paymentMethod === 'cartao' ? (
                  'Gerar Opções de Parcelamento'
                ) : (
                  'Continuar'
                )}
              </button>
            )}
            {paymentMethod === 'financiamento' && financiamentoStep === 'dados_pessoais' && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-4 border border-zinc-700 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider text-sm"
              >
                Voltar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Opções de Parcelamento */}
      {opcoes.length > 0 && (
        <div id="opcoes-parcelamento" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <Info className="text-orange-500" size={20} />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Selecione um <span className="text-orange-600">Plano</span></h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {opcoes.map((opcao) => (
              <div
                key={opcao.parcelas}
                onClick={() => setResultado(opcao)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col h-full ${
                  resultado?.parcelas === opcao.parcelas 
                    ? 'bg-orange-600 border-orange-500 text-black shadow-[0_0_20px_rgba(234,88,12,0.4)] scale-[1.02]' 
                    : 'bg-zinc-900 border-zinc-800 text-white hover:border-orange-500/50 hover:bg-zinc-800'
                }`}
              >
                {resultado?.parcelas === opcao.parcelas && (
                  <div className="absolute -top-3 -right-3 bg-black text-orange-500 rounded-full p-1 shadow-lg border border-orange-500">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <span className="text-4xl font-black tracking-tighter">{opcao.parcelas}x</span>
                  <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${resultado?.parcelas === opcao.parcelas ? 'bg-black/20 text-black' : 'bg-zinc-950 text-orange-500 border border-zinc-800'}`}>
                    TAXA: {((opcao.valorFinal - opcao.entrada) / (opcao.valorBase - opcao.entrada + opcao.taxasExtras) * 100 - 100).toFixed(2)}%
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className={`block text-[10px] uppercase tracking-widest mb-1 font-bold ${resultado?.parcelas === opcao.parcelas ? 'text-black/60' : 'text-zinc-500'}`}>Valor da Parcela</span>
                  <div className="text-3xl font-black tracking-tight">
                    {formatCurrency(opcao.valorParcela)}
                  </div>
                </div>
                
                <div className={`mt-auto space-y-2 text-xs font-medium pt-4 border-t ${resultado?.parcelas === opcao.parcelas ? 'border-black/10' : 'border-zinc-800'}`}>
                  <div className="flex justify-between">
                    <span className={resultado?.parcelas === opcao.parcelas ? 'text-black/70' : 'text-zinc-400'}>Entrada:</span>
                    <span className="font-bold">{formatCurrency(opcao.entrada)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={resultado?.parcelas === opcao.parcelas ? 'text-black/70' : 'text-zinc-400'}>Taxa da Loja:</span>
                    <span className="font-bold">+{formatCurrency(20)}/parc</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={resultado?.parcelas === opcao.parcelas ? 'text-black/70' : 'text-zinc-400'}>Valor da Venda:</span>
                    <span className="font-bold">{formatCurrency(opcao.valorFinal - opcao.entrada)}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-between">
                      <span className={resultado?.parcelas === opcao.parcelas ? 'text-black/70' : 'text-zinc-400'}>Você Recebe:</span>
                      <span className="font-bold">{formatCurrency(opcao.valorBase - opcao.entrada + opcao.taxasExtras)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-start gap-3">
            <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              * Simulação baseada no modelo de <strong>Repasse de Taxas</strong>. O "Valor da Venda" é o valor que o cliente paga no cartão, garantindo que você receba o valor integral da moto (menos entrada).
            </p>
          </div>
        </div>
      )}

      {/* Resultado Final Confirmado */}
      <AnimatePresence mode="wait">
        {resultado && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-green-600 rounded-2xl shadow-2xl overflow-hidden text-white border border-green-500 mt-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="p-8 text-center border-b lg:border-b-0 lg:border-r border-green-500/30 flex flex-col justify-center items-center bg-green-700/20">
                <CheckCircle2 size={48} className="mb-4 text-green-300" />
                <h3 className="text-green-100 font-bold uppercase tracking-widest text-xs mb-2">Resumo da Venda</h3>
                <div className="text-5xl font-black tracking-tighter mb-2">
                  {formatCurrency(resultado.valorFinal)}
                </div>
                <p className="text-green-100 font-medium text-sm">
                  Entrada de {formatCurrency(resultado.entrada)} <br/>+ {resultado.parcelas}x de <span className="font-black text-white text-lg">{formatCurrency(resultado.valorParcela)}</span>
                </p>
              </div>

              <div className="p-8 space-y-4 flex flex-col justify-center">
                {isAdmin && (
                  <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                    <span className="text-green-200 font-medium">Valor Líquido (Moto)</span>
                    <span className="font-bold">{formatCurrency(resultado.valorBase)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                  <span className="text-green-200 font-medium">Valor a Financiar</span>
                  <span className="font-bold">{formatCurrency(resultado.valorFinanciado)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                  <span className="text-green-200 font-medium">Encargos do Parcelamento</span>
                  <span className="font-bold text-green-100">+{formatCurrency(resultado.totalJuros - (resultado.parcelas * 20))}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                  <span className="text-green-200 font-medium">Taxa da Loja</span>
                  <span className="font-bold text-green-100">+{formatCurrency(resultado.parcelas * 20)}</span>
                </div>
                {isAdmin && resultado.taxasExtras > 0 && (
                  <div className="flex justify-between items-center text-sm border-b border-green-500/20 pb-2">
                    <span className="text-green-200 font-medium">Taxas Extras</span>
                    <span className="font-bold">+{formatCurrency(resultado.taxasExtras)}</span>
                  </div>
                )}
              </div>

              <div className="p-8 bg-green-800/40 flex items-center justify-center">
                <button
                  onClick={handleConfirmAction}
                  className="w-full py-5 bg-white text-green-700 rounded-xl font-black text-lg hover:bg-green-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                  {isAdmin ? 'Aprovar e Gerar Recibo' : 'Selecionar Proposta'}
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LGPD Modal */}
      {showLgpdModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-800 shadow-2xl p-6"
          >
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 border-b border-zinc-800 pb-4">
              Aviso de Privacidade
            </h3>
            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              Estou ciente de que meus dados serão utilizados para simulações de financiamento pela empresa Franklin Motos.
            </p>
            
            <label className="flex items-center gap-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition-colors mb-6 group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-600 focus:ring-offset-zinc-900 bg-zinc-900 appearance-none peer"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                  <CheckCircle2 size={14} className="fill-orange-600 text-white" />
                </div>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-orange-500 transition-colors">
                Estou ciente e aceito
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLgpdModal(false);
                  setLgpdAccepted(false);
                }}
                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors uppercase tracking-wider text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!lgpdAccepted || isConfirmingFinanciamento}
                onClick={async () => {
                  setIsConfirmingFinanciamento(true);
                  try {
                    const saleRecord: SaleRecord = {
                      motoId: moto.id,
                      motoMarcaModelo: moto.marcaModelo,
                      motoPlaca: moto.placa,
                      compradorNome: buyerData.nome,
                      compradorCpf: buyerData.cpf,
                      telefone: buyerData.telefone,
                      email: buyerData.email,
                      cep: buyerData.cep,
                      dataNascimento: buyerData.dataNascimento,
                      possuiCnh: buyerData.possuiCnh !== null ? buyerData.possuiCnh : undefined,
                      valorVenda: moto.precoAVista,
                      entrada: 0,
                      parcelas: 1,
                      valorParcela: 0,
                      dataVenda: new Date().toISOString(),
                      vendedorUid: 'cliente',
                      status: 'pendente',
                      financiamentoBancario: {}
                    };
                    const docRef = doc(collection(db, 'sales'));
                    await setDoc(docRef, saleRecord);
                    setQuestionario(prev => ({ ...prev, proposalId: docRef.id }));
                    
                    setTimeout(() => {
                      setIsConfirmingFinanciamento(false);
                      setShowLgpdModal(false);
                      setFinanciamentoStep('proposta_enviada');
                    }, 500);
                  } catch (error) {
                    console.error("Error saving proposal:", error);
                    alert("Erro ao enviar proposta. Tente novamente.");
                    setIsConfirmingFinanciamento(false);
                  }
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-black transition-colors uppercase tracking-wider text-sm flex justify-center items-center ${
                  lgpdAccepted 
                    ? 'bg-orange-600 text-black hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isConfirmingFinanciamento ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
