import React, { useState } from 'react';
import { BlackFridayConfig, BlackFridayCoupon, Moto } from '../types';
import { db, doc, setDoc } from '../firebase';
import { 
  Flame, 
  Save, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  DollarSign
} from 'lucide-react';

interface AdminBlackFridayProps {
  config: BlackFridayConfig;
  motos: Moto[];
  onClose: () => void;
  onSaveConfig: (updated: BlackFridayConfig) => void;
}

export default function AdminBlackFriday({
  config,
  motos,
  onClose,
  onSaveConfig
}: AdminBlackFridayProps) {
  const [formData, setFormData] = useState<BlackFridayConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New coupon form state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponCond, setNewCouponCond] = useState('');
  const [newCouponTag, setNewCouponTag] = useState('');

  // Selected moto promo prices
  const [motoPromoPrices, setMotoPromoPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    motos.forEach(m => {
      if (m.precoPromocionalBlack) {
        map[m.id] = m.precoPromocionalBlack;
      }
    });
    return map;
  });

  const handleToggleEnabled = () => {
    setFormData(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleAddCoupon = () => {
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) return;

    const newCoupon: BlackFridayCoupon = {
      id: `cupom-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountText: newCouponDiscount.trim().toUpperCase(),
      description: newCouponDesc.trim() || 'Desconto exclusivo na campanha Black Friday.',
      conditions: newCouponCond.trim() || 'Válido durante a Black Friday para compras fechadas na loja.',
      validUntil: new Date(formData.endDate).toLocaleDateString('pt-BR'),
      active: true,
      tag: newCouponTag.trim().toUpperCase() || 'NOVO'
    };

    setFormData(prev => ({
      ...prev,
      coupons: [...prev.coupons, newCoupon]
    }));

    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDesc('');
    setNewCouponCond('');
    setNewCouponTag('');
  };

  const handleToggleCoupon = (id: string) => {
    setFormData(prev => ({
      ...prev,
      coupons: prev.coupons.map(c => c.id === id ? { ...c, active: !c.active } : c)
    }));
  };

  const handleDeleteCoupon = (id: string) => {
    setFormData(prev => ({
      ...prev,
      coupons: prev.coupons.filter(c => c.id !== id)
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Save configuration to Firestore
      await setDoc(doc(db, 'settings', 'blackFriday'), formData, { merge: true });

      // Save promo prices directly to individual moto documents in Firestore
      for (const [motoId, promoPrice] of Object.entries(motoPromoPrices)) {
        await setDoc(doc(db, 'motos', motoId), { precoPromocionalBlack: promoPrice }, { merge: true });
      }

      onSaveConfig(formData);
      setMessage({ type: 'success', text: 'Configurações da Black Friday salvas com sucesso!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao salvar configurações da Black Friday:', err);
      setMessage({ type: 'error', text: 'Erro ao salvar. Verifique sua conexão e tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF4D00]/10 text-[#FF4D00] rounded-xl border border-[#FF4D00]/30">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl uppercase tracking-wide text-white">
                Painel da Black Friday Franklin
              </h2>
              <p className="text-xs text-zinc-400">
                Configure descontos, validade, cupons e destaque do catálogo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 text-sm text-zinc-300">
          
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Section 1: Ativação e Contagem */}
          <div className="bg-[#191919] border border-[#262626] p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                  Status da Campanha
                </h3>
                <p className="text-xs text-zinc-400">
                  Quando ativada, a homepage exibe a identidade Franklin Black.
                </p>
              </div>

              <button
                onClick={handleToggleEnabled}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  formData.enabled 
                    ? 'bg-[#FF4D00] text-black shadow-lg shadow-[#FF4D00]/20' 
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {formData.enabled ? 'Campanha Ativa' : 'Campanha Desativada'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Data de Encerramento (Contador Regressivo):
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate ? formData.endDate.slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: new Date(e.target.value).toISOString() }))}
                  className="w-full p-2.5 bg-black border border-zinc-800 rounded-xl text-white text-xs focus:border-[#FF4D00] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Moto em Destaque no Hero:
                </label>
                <select
                  value={formData.featuredMotoId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, featuredMotoId: e.target.value }))}
                  className="w-full p-2.5 bg-black border border-zinc-800 rounded-xl text-white text-xs focus:border-[#FF4D00] outline-none"
                >
                  {motos.filter(m => !m.arquivada).map((moto) => (
                    <option key={moto.id} value={moto.id}>
                      {moto.marcaModelo} ({moto.placa}) — R$ {moto.precoAVista}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Gestão de Cupons */}
          <div className="bg-[#191919] border border-[#262626] p-5 rounded-2xl space-y-4">
            <h3 className="font-display font-black text-lg text-white uppercase tracking-wider flex items-center justify-between">
              <span>Cupons Promocionais Ativos</span>
              <span className="text-xs text-[#FF4D00] font-sans font-bold">
                {formData.coupons.length} cadastrados
              </span>
            </h3>

            {/* List of current coupons */}
            <div className="space-y-3">
              {formData.coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="p-3 bg-black/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-base text-[#FF4D00] tracking-wider uppercase">
                        {coupon.code}
                      </span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-bold">
                        {coupon.discountText}
                      </span>
                      {coupon.tag && (
                        <span className="text-[10px] bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-0.5 rounded font-bold">
                          {coupon.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{coupon.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCoupon(coupon.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase transition-colors ${
                        coupon.active ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {coupon.active ? 'Ativo' : 'Pausado'}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Excluir Cupom"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new coupon */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Adicionar Novo Cupom:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Código (ex: MOTOBLACK)"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white uppercase"
                />
                <input
                  type="text"
                  placeholder="Benefício (ex: R$ 500 OFF)"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  className="p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Etiqueta (ex: VIP / POPULAR)"
                  value={newCouponTag}
                  onChange={(e) => setNewCouponTag(e.target.value)}
                  className="p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Descrição resumida do benefício"
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  className="p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Regras e condições de uso"
                  value={newCouponCond}
                  onChange={(e) => setNewCouponCond(e.target.value)}
                  className="p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <button
                onClick={handleAddCoupon}
                className="px-4 py-2 bg-zinc-800 hover:bg-[#FF4D00] text-white hover:text-black rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Plus size={16} /> Adicionar Cupom
              </button>
            </div>
          </div>

          {/* Section 3: Preços Promocionais por Moto */}
          <div className="bg-[#191919] border border-[#262626] p-5 rounded-2xl space-y-4">
            <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
              Preços Promocionais no Estoque
            </h3>
            <p className="text-xs text-zinc-400">
              Defina o preço especial de Black Friday para cada moto. Deixe em branco ou igual para manter o valor original.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {motos.filter(m => !m.arquivada).map((moto) => (
                <div
                  key={moto.id}
                  className="flex items-center justify-between p-2.5 bg-black/60 border border-zinc-800 rounded-xl text-xs"
                >
                  <div className="truncate max-w-[200px] sm:max-w-xs">
                    <span className="font-bold text-white block truncate">{moto.marcaModelo}</span>
                    <span className="text-[10px] text-zinc-500">Placa {moto.placa} • Valor Atual: R$ {moto.precoAVista}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-bold uppercase">Preço Black (R$):</span>
                    <input
                      type="number"
                      placeholder={String(moto.precoAVista)}
                      value={motoPromoPrices[moto.id] ?? ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMotoPromoPrices(prev => ({ ...prev, [moto.id]: val }));
                      }}
                      className="w-28 p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-xs text-right focus:border-[#FF4D00] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#262626] flex items-center justify-between bg-[#191919]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2.5 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}
