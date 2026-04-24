import React, { useState } from 'react';
import { CartItem, AcessorioSaleRecord } from '../types';
import { ShoppingCart, X, Plus, Minus, Trash2, CheckCircle2, MessageCircle, Info, CreditCard, Banknote } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAcessoriosConfig } from '../hooks/useAcessoriosConfig';

interface CartModalProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (acessorioId: string, delta: number) => void;
  onRemoveItem: (acessorioId: string) => void;
  onClearCart: () => void;
}

export default function CartModal({ cart, onClose, onUpdateQuantity, onRemoveItem, onClearCart }: CartModalProps) {
  const config = useAcessoriosConfig();
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [buyerData, setBuyerData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    cep: '',
    endereco: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'credito' | 'avista' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((acc, item) => {
    const price = item.acessorio.emPromocao && item.acessorio.precoPromocional 
      ? item.acessorio.precoPromocional 
      : item.acessorio.preco;
    return acc + (price * item.quantidade);
  }, 0);

  // Discount calculation based on payment method
  let discountPercentage = 0;
  if (paymentMethod === 'credito') {
    discountPercentage = 0.10;
  } else if (paymentMethod === 'avista') {
    discountPercentage = 0.15;
  }

  const discount = subtotal * discountPercentage;
  const total = subtotal - discount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      alert("Por favor, selecione uma forma de pagamento.");
      return;
    }
    setIsSubmitting(true);

    try {
      const saleRecord: Omit<AcessorioSaleRecord, 'id'> = {
        items: cart.map(item => ({
          acessorioId: item.acessorio.id,
          nome: item.acessorio.nome,
          preco: item.acessorio.emPromocao && item.acessorio.precoPromocional ? item.acessorio.precoPromocional : item.acessorio.preco,
          quantidade: item.quantidade
        })),
        valorTotal: total,
        compradorNome: buyerData.nome,
        compradorCpf: buyerData.cpf,
        telefone: buyerData.telefone,
        cep: buyerData.cep,
        endereco: buyerData.endereco,
        dataVenda: new Date().toISOString(),
        status: 'pendente',
        metodoPagamento: paymentMethod
      };

      await addDoc(collection(db, 'acessorio_sales'), saleRecord);

      setStep('success');
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onClearCart();
    }
    onClose();
  };

  const generateWhatsAppUrl = () => {
    let message = `*NOVO PEDIDO DE ACESSÓRIOS - FRANKLIN MOTOS*%0A%0A` +
      `*CLIENTE:* ${buyerData.nome}%0A` +
      `*CPF:* ${buyerData.cpf}%0A` +
      `*TELEFONE:* ${buyerData.telefone}%0A%0A` +
      `*ITENS DO PEDIDO:*%0A`;

    cart.forEach(item => {
      const price = item.acessorio.emPromocao && item.acessorio.precoPromocional ? item.acessorio.precoPromocional : item.acessorio.preco;
      message += `- ${item.quantidade}x ${item.acessorio.nome} (${formatCurrency(price)})%0A`;
    });

    const paymentText = paymentMethod === 'credito' ? 'Cartão de Crédito (10% desconto)' : 'À Vista (15% desconto, Dinheiro/PIX/Débito)';

    message += `%0A*FORMA DE PAGAMENTO:* ${paymentText}%0A`;
    message += `*SUBTOTAL:* ${formatCurrency(subtotal)}%0A`;
    if (discount > 0) {
      message += `*DESCONTO:* -${formatCurrency(discount)}%0A`;
    }
    message += `*TOTAL A PAGAR:* ${formatCurrency(total)}%0A%0A` +
      `Gostaria de prosseguir com o pagamento e retirada deste pedido.`;

    const targetNumber = config.whatsappNumber || '558532332200';
    return `https://wa.me/${targetNumber}?text=${message}`;
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(22,163,74,0.4)]">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Pedido <span className="text-green-500">Enviado!</span></h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Obrigado, <strong>{buyerData.nome}</strong>! Seu pedido foi registrado em nosso sistema.
          </p>
          <div className="bg-zinc-950 p-4 rounded-xl border border-orange-600/30 text-left">
            <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-1">Atenção</p>
            <p className="text-white text-xs">Para agilizar o atendimento e confirmar o pagamento, envie o pedido via WhatsApp.</p>
          </div>
          <div className="space-y-3 pt-4">
            <button
              onClick={() => window.open(generateWhatsAppUrl(), '_blank')}
              className="w-full py-4 bg-[#25D366] text-white rounded-xl font-black hover:bg-[#20BD5A] transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <MessageCircle size={20} />
              Enviar via WhatsApp
            </button>
            <button
              onClick={handleClose}
              className="w-full py-4 bg-zinc-800 text-white rounded-xl font-black hover:bg-zinc-700 transition-all uppercase tracking-wider text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-zinc-900 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-orange-500" size={24} />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {step === 'cart' ? 'Seu Carrinho' : 'Finalizar Pedido'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cart' ? (
            cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="font-bold uppercase tracking-wider text-sm">Seu carrinho está vazio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => {
                  const price = item.acessorio.emPromocao && item.acessorio.precoPromocional ? item.acessorio.precoPromocional : item.acessorio.preco;
                  return (
                    <div key={item.acessorio.id} className="flex gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <div className="w-20 h-20 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                        {item.acessorio.fotos[0] ? (
                          <img src={item.acessorio.fotos[0]} alt={item.acessorio.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700"><ShoppingCart size={24} /></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white line-clamp-1">{item.acessorio.nome}</h4>
                          <p className="text-orange-500 font-black text-sm">{formatCurrency(price)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                            <button onClick={() => onUpdateQuantity(item.acessorio.id, -1)} className="p-1 text-zinc-400 hover:text-white"><Minus size={14} /></button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                            <button onClick={() => onUpdateQuantity(item.acessorio.id, 1)} disabled={item.quantidade >= item.acessorio.estoque} className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => onRemoveItem(item.acessorio.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
                <input type="text" required value={buyerData.nome} onChange={e => setBuyerData({...buyerData, nome: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm" placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">CPF</label>
                <input type="text" required value={buyerData.cpf} onChange={e => setBuyerData({...buyerData, cpf: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Telefone / WhatsApp</label>
                <input type="text" required value={buyerData.telefone} onChange={e => setBuyerData({...buyerData, telefone: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">CEP</label>
                  <input type="text" value={buyerData.cep} onChange={e => setBuyerData({...buyerData, cep: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm" placeholder="00000-000" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Endereço</label>
                  <input type="text" value={buyerData.endereco} onChange={e => setBuyerData({...buyerData, endereco: e.target.value})} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm" placeholder="Rua, Número" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credito')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'credito' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    <CreditCard size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center">Cartão de Crédito</span>
                    <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">10% Desconto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('avista')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'avista' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    <Banknote size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center">À Vista (Pix/Din.)</span>
                    <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">15% Desconto</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipo de Entrega</label>
                <div className="bg-orange-600/10 border border-orange-500 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Retirada na Loja</p>
                    <p className="text-zinc-400 font-medium text-xs">O desconto já está aplicado no total ao selecionar a forma de pagamento.</p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-black border-t border-zinc-800">
            {step === 'cart' ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(subtotal)}</span>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full py-4 bg-orange-600 text-black rounded-xl font-black hover:bg-orange-500 transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                >
                  Continuar para Dados
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-500 font-bold">Desconto ({paymentMethod === 'credito' ? '10%' : '15%'})</span>
                      <span className="text-green-500 font-bold">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider text-sm">Total a Pagar</span>
                    <span className="text-2xl font-black text-white">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="px-6 py-4 bg-zinc-800 text-white rounded-xl font-black hover:bg-zinc-700 transition-all uppercase tracking-wider text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isSubmitting || !paymentMethod}
                    className="flex-1 py-4 bg-orange-600 text-black rounded-xl font-black hover:bg-orange-500 transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(234,88,12,0.3)] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processando...' : 'Finalizar Pedido'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
