import React, { useState } from 'react';
import { Moto, PlanoFinanceiro } from '../types';
import { db, doc, setDoc } from '../firebase';
import { Settings, Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';

interface AdminRatesProps {
  motos: Moto[];
}

export default function AdminRates({ motos }: AdminRatesProps) {
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [planos, setPlanos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Default plans based on the provided image for 14.000
  const defaultPlanos: PlanoFinanceiro[] = [
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

  const handleSelectMoto = (moto: Moto) => {
    setSelectedMoto(moto);
    const sourcePlanos = (moto.planos && moto.planos.length > 0) ? moto.planos : defaultPlanos;
    setPlanos(sourcePlanos.map(p => ({
      parcelas: p.parcelas,
      taxaTotal: p.taxaTotal.toString(),
      valorFinal: (moto.precoAVista * (1 + p.taxaTotal / 100)).toFixed(2)
    })));
  };

  const handleAddPlano = () => {
    setPlanos([...planos, { parcelas: 12, taxaTotal: '', valorFinal: '' }]);
  };

  const handleRemovePlano = (index: number) => {
    setPlanos(planos.filter((_, i) => i !== index));
  };

  const handlePlanoChange = (index: number, field: string, value: string | number) => {
    const newPlanos = [...planos];
    newPlanos[index] = { ...newPlanos[index], [field]: value };
    
    if (field === 'taxaTotal' && selectedMoto) {
      const taxa = parseFloat(value as string);
      if (!isNaN(taxa)) {
        newPlanos[index].valorFinal = (selectedMoto.precoAVista * (1 + taxa / 100)).toFixed(2);
      } else {
        newPlanos[index].valorFinal = '';
      }
    }
    
    setPlanos(newPlanos);
  };

  const handleValorFinalChange = (index: number, valorFinalStr: string) => {
    if (!selectedMoto) return;
    const newPlanos = [...planos];
    newPlanos[index] = { ...newPlanos[index], valorFinal: valorFinalStr };
    
    const valorFinal = parseFloat(valorFinalStr);
    if (!isNaN(valorFinal)) {
      const taxaTotal = ((valorFinal / selectedMoto.precoAVista) - 1) * 100;
      newPlanos[index].taxaTotal = taxaTotal.toFixed(3);
    } else {
      newPlanos[index].taxaTotal = '';
    }
    setPlanos(newPlanos);
  };

  const handleSave = async () => {
    if (!selectedMoto) return;
    setSaving(true);
    try {
      const planosToSave = planos.map(p => ({
        parcelas: Number(p.parcelas),
        taxaTotal: Number(p.taxaTotal) || 0
      }));
      
      const motoRef = doc(db, 'motos', selectedMoto.id);
      await setDoc(motoRef, { planos: planosToSave }, { merge: true });
      
      // Update local state to reflect changes
      setSelectedMoto({ ...selectedMoto, planos: planosToSave });
      alert('Taxas salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar taxas:', error);
      alert('Erro ao salvar taxas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Edição de <span className="text-orange-600">Taxas</span></h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Motos */}
        <div className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 bg-black border-b border-zinc-800">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Selecione uma Moto</h3>
          </div>
          <div className="overflow-y-auto flex-grow custom-scrollbar">
            {motos.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">Nenhuma moto cadastrada.</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {motos.map((moto) => (
                  <button
                    key={moto.id}
                    onClick={() => handleSelectMoto(moto)}
                    className={`w-full text-left p-4 hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                      selectedMoto?.id === moto.id ? 'bg-orange-600/10 border-l-4 border-orange-600' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div>
                      <h4 className={`font-black uppercase tracking-tight ${selectedMoto?.id === moto.id ? 'text-orange-500' : 'text-white'}`}>
                        {moto.marcaModelo}
                      </h4>
                      <p className="text-xs text-zinc-500 font-mono font-bold">{moto.placa}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-zinc-400">{moto.anoModelo}</span>
                      <span className="block text-sm font-bold text-white">{formatCurrency(moto.precoAVista)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor de Taxas */}
        <div className="lg:col-span-2">
          {selectedMoto ? (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-xl">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-zinc-800">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                    {selectedMoto.marcaModelo}
                  </h3>
                  <p className="text-orange-500 font-mono font-bold text-sm">{selectedMoto.placa}</p>
                </div>
                <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 text-right">
                  <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Valor à Vista</span>
                  <span className="text-lg font-black text-white">{formatCurrency(selectedMoto.precoAVista)}</span>
                </div>
              </div>

              <div className="bg-orange-600/10 border border-orange-600/20 rounded-xl p-4 mb-8 flex gap-3">
                <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-zinc-300">
                  <p className="font-bold text-orange-500 mb-1">Como funcionam as taxas?</p>
                  <p>Você pode digitar a <strong>Taxa Total (%)</strong> ou digitar diretamente o <strong>Valor Final</strong> que o cliente vai pagar. O sistema calculará o outro valor automaticamente com base no Valor à Vista da moto.</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Settings size={20} className="text-orange-600" /> Planos de Parcelamento
                  </h4>
                  <button
                    onClick={handleAddPlano}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-zinc-700"
                  >
                    <Plus size={16} /> Adicionar Plano
                  </button>
                </div>

                {planos.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500">
                    Nenhum plano configurado para esta moto.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {planos.map((plano, index) => {
                      return (
                        <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                          <div className="w-full md:w-1/4 space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Parcelas</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="48"
                                value={plano.parcelas}
                                onChange={(e) => handlePlanoChange(index, 'parcelas', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                              />
                              <span className="text-zinc-500 font-bold">x</span>
                            </div>
                          </div>

                          <div className="w-full md:w-1/3 space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Valor Final (R$)</label>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 font-bold">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={plano.valorFinal !== undefined ? plano.valorFinal : ''}
                                onChange={(e) => handleValorFinalChange(index, e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                              />
                            </div>
                          </div>

                          <div className="w-full md:w-1/4 space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Taxa Total (%)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={plano.taxaTotal !== undefined ? plano.taxaTotal : ''}
                                onChange={(e) => handlePlanoChange(index, 'taxaTotal', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                              />
                              <span className="text-zinc-500 font-bold">%</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemovePlano(index)}
                            className="mt-5 p-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-600/20 shrink-0"
                            title="Remover Plano"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-zinc-800">
                <button
                  onClick={() => handleSelectMoto(selectedMoto)}
                  className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider text-sm"
                  disabled={saving}
                >
                  Desfazer
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-black px-8 py-3 rounded-xl font-black transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-70 uppercase tracking-wider text-sm"
                >
                  {saving ? (
                    <span className="animate-pulse">Salvando...</span>
                  ) : (
                    <>
                      <Save size={20} /> Salvar Taxas
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
              <Settings size={64} className="mb-4 text-zinc-800" />
              <h3 className="text-xl font-bold text-white mb-2">Selecione uma moto</h3>
              <p>Escolha uma moto na lista ao lado para visualizar e editar seus planos de parcelamento e taxas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
