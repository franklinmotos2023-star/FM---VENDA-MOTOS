import React from 'react';
import { CartItem, BlackFridayCoupon } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, MessageCircle, Tag } from 'lucide-react';
import { useAcessoriosConfig } from '../hooks/useAcessoriosConfig';

interface CartModalProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (acessorioId: string, delta: number) => void;
  onRemoveItem: (acessorioId: string) => void;
  onClearCart?: () => void;
  activeCoupon?: BlackFridayCoupon | null;
}

export default function CartModal({
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  activeCoupon
}: CartModalProps) {
  const config = useAcessoriosConfig();

  const getBlackFridayPrice = (acessorio: CartItem['acessorio']) => {
    if (
      acessorio.emPromocao &&
      typeof acessorio.precoPromocional === 'number' &&
      acessorio.precoPromocional > 0 &&
      acessorio.precoPromocional < acessorio.preco
    ) {
      return acessorio.precoPromocional;
    }
    return Math.round(acessorio.preco * 0.9 * 100) / 100;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const originalSubtotal = cart.reduce((acc, item) => {
    return acc + item.acessorio.preco * item.quantidade;
  }, 0);

  const discountedTotal = cart.reduce((acc, item) => {
    const price = getBlackFridayPrice(item.acessorio);
    return acc + price * item.quantidade;
  }, 0);

  const totalSavings = Math.max(0, originalSubtotal - discountedTotal);

  const generateWhatsAppUrl = () => {
    const lines: string[] = [
      '🔥 *NOVO PEDIDO BLACK FRIDAY — FRANKLIN MOTOS* 🔥',
      'Olá! Gostaria de efetuar o pedido abaixo e confirmar os detalhes para finalizar minha compra.',
      '',
      '📦 *PRODUTOS DO PEDIDO:*',
      ''
    ];

    cart.forEach((item, index) => {
      const unitOriginal = item.acessorio.preco;
      const unitDiscounted = getBlackFridayPrice(item.acessorio);
      const itemDiscountPercent = unitOriginal > 0
        ? Math.max(0, Math.round(((unitOriginal - unitDiscounted) / unitOriginal) * 100))
        : 0;
      const itemSavings = Math.max(0, (unitOriginal - unitDiscounted) * item.quantidade);
      const itemSubtotal = unitDiscounted * item.quantidade;

      lines.push(`*${index + 1}. ${item.acessorio.nome}*`);
      lines.push(`• Quantidade: ${item.quantidade}x`);
      lines.push(`• Valor unitário original: ${formatCurrency(unitOriginal)}`);
      lines.push(`• Desconto aplicado: ${itemDiscountPercent}% OFF (-${formatCurrency(itemSavings)})`);
      lines.push(`• Valor unitário com desconto: ${formatCurrency(unitDiscounted)}`);
      lines.push(`• *Subtotal do produto:* ${formatCurrency(itemSubtotal)}`);
      lines.push('');
    });

    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('💰 *RESUMO DO PEDIDO:*');
    lines.push(`• Valor sem desconto: ${formatCurrency(originalSubtotal)}`);
    if (totalSavings > 0) {
      lines.push(`• Desconto total nos produtos: -${formatCurrency(totalSavings)}`);
    }
    lines.push(`• *TOTAL A PAGAR: ${formatCurrency(discountedTotal)}*`);

    if (activeCoupon) {
      lines.push(`🎟️ *Cupom utilizado:* ${activeCoupon.code} (${activeCoupon.discountText})`);
    } else {
      lines.push('🎟️ *Cupom utilizado:* Promoção Black Friday (-10% em peças e acessórios)');
    }

    lines.push('');
    lines.push('✅ *Aviso:* Estou enviando este pedido para efetuá-lo agora! Aguardo confirmação para pagamento e retirada/entrega.');

    const rawPhone = (config.whatsappNumber || '558532332200').replace(/\D/g, '');
    const targetNumber = rawPhone.length >= 10 && !rawPhone.startsWith('55') ? `55${rawPhone}` : (rawPhone || '558532332200');
    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-zinc-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-[#FF4D00]" size={24} />
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Seu Carrinho
              </h2>
              {cart.length > 0 && (
                <p className="text-[11px] font-semibold text-zinc-400 tabular-nums">
                  {cart.reduce((acc, i) => acc + i.quantidade, 0)} {cart.reduce((acc, i) => acc + i.quantidade, 0) === 1 ? 'item' : 'itens'} · Desconto Black Friday aplicado
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors uppercase tracking-wider whitespace-nowrap shrink-0"
          >
            Continuar Comprando
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p className="font-bold uppercase tracking-wider text-sm">Seu carrinho está vazio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => {
                const unitOriginal = item.acessorio.preco;
                const unitDiscounted = getBlackFridayPrice(item.acessorio);
                const discountPercent = unitOriginal > 0
                  ? Math.max(0, Math.round(((unitOriginal - unitDiscounted) / unitOriginal) * 100))
                  : 0;
                const itemSavings = Math.max(0, (unitOriginal - unitDiscounted) * item.quantidade);
                const itemTotal = unitDiscounted * item.quantidade;

                return (
                  <div key={item.acessorio.id} className="flex gap-4 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                    <div className="w-20 h-20 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                      {item.acessorio.fotos[0] ? (
                        <img
                          src={item.acessorio.fotos[0]}
                          alt={item.acessorio.nome}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ShoppingCart size={24} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.acessorio.nome}</h4>

                        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 tabular-nums">
                          {unitOriginal > unitDiscounted && (
                            <span className="text-[11px] text-zinc-500 line-through">
                              {formatCurrency(unitOriginal)}
                            </span>
                          )}
                          <span className="text-[#FF4D00] font-black text-sm">
                            {formatCurrency(unitDiscounted)} <span className="text-[10px] font-semibold text-zinc-400">/ un.</span>
                          </span>
                        </div>

                        {discountPercent > 0 && (
                          <p className="text-[11px] font-bold text-emerald-400 tabular-nums">
                            Desconto de {discountPercent}% (-{formatCurrency(itemSavings)} neste item)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center gap-2.5 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                          <button
                            onClick={() => onUpdateQuantity(item.acessorio.id, -1)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-5 text-center tabular-nums">{item.quantidade}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.acessorio.id, 1)}
                            disabled={item.quantidade >= item.acessorio.estoque}
                            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white tabular-nums">
                            {formatCurrency(itemTotal)}
                          </span>
                          <button
                            onClick={() => onRemoveItem(item.acessorio.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            aria-label="Remover item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {onClearCart && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[11px] font-semibold text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-black border-t border-zinc-800 space-y-4">
            <div className="space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between items-center text-zinc-400 text-xs">
                <span>Valor original dos produtos</span>
                <span className="line-through">{formatCurrency(originalSubtotal)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between items-center text-emerald-400 text-xs font-bold">
                  <span>Desconto aplicado nos itens</span>
                  <span>-{formatCurrency(totalSavings)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Total com desconto</span>
                <span className="text-2xl font-black text-white">{formatCurrency(discountedTotal)}</span>
              </div>
            </div>

            {activeCoupon && (
              <div className="flex items-center gap-2 text-xs text-[#FF4D00] font-bold bg-[#FF4D00]/10 border border-[#FF4D00]/30 px-3 py-2 rounded-lg">
                <Tag size={14} className="shrink-0" />
                <span className="truncate">
                  Cupom selecionado: {activeCoupon.code} ({activeCoupon.discountText})
                </span>
              </div>
            )}

            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-5 bg-[#25D366] hover:bg-[#20BD5A] text-black rounded-xl font-black transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(37,211,102,0.35)]"
            >
              <MessageCircle size={20} />
              <span>Finalizar com cupom</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
