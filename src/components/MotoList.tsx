import React, { useState } from 'react';
import { Moto } from '../types';
import { Plus, Calculator, Edit2, Trash2, Calendar, Gauge, Settings, Fuel, Info, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MotoListProps {
  motos: Moto[];
  onAddMoto: () => void;
  onFinance: (moto: Moto) => void;
  isAdmin?: boolean;
  onEditMoto?: (moto: Moto) => void;
  onDeleteMoto?: (id: string) => void;
}

interface MotoCardProps {
  moto: Moto;
  isAdmin?: boolean;
  onEditMoto?: (moto: Moto) => void;
  onDeleteMoto?: (id: string) => void;
  onFinance: (moto: Moto) => void;
  onSelect: (moto: Moto) => void;
  key?: string | number;
}

function MotoCard({ moto, isAdmin, onEditMoto, onDeleteMoto, onFinance, onSelect }: MotoCardProps) {
  const [currentImg, setCurrentImg] = useState(0);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (moto.fotos && moto.fotos.length > 0) {
      setCurrentImg((prev) => (prev + 1) % moto.fotos.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (moto.fotos && moto.fotos.length > 0) {
      setCurrentImg((prev) => (prev - 1 + moto.fotos.length) % moto.fotos.length);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div 
      onClick={() => onSelect(moto)}
      className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col hover:border-orange-600/50 transition-colors group shadow-xl relative cursor-pointer"
    >
      {isAdmin && (
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditMoto?.(moto);
            }}
            className="p-2 bg-black/60 hover:bg-orange-600 text-white hover:text-black rounded-lg transition-all border border-white/10 backdrop-blur-sm"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMoto?.(moto.id);
            }}
            className="p-2 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-all border border-white/10 backdrop-blur-sm"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      <div className="h-48 md:h-56 bg-zinc-800 relative overflow-hidden group/img">
        {moto.precoAntigo && moto.precoAVista && moto.precoAntigo > moto.precoAVista && (
          <div className="absolute bottom-4 left-4 bg-green-500 text-black px-3 py-1 rounded-md font-black text-sm shadow-lg z-10 flex items-center gap-1">
            <span className="uppercase tracking-wider text-[10px]">Promo</span>
            <span>-{Math.round(((moto.precoAntigo - moto.precoAVista) / moto.precoAntigo) * 100)}%</span>
          </div>
        )}
        {moto.fotos && moto.fotos.length > 0 ? (
          <>
            <img 
              src={moto.fotos[currentImg]} 
              alt={moto.marcaModelo} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            {moto.fotos.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-orange-600"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-orange-600"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {moto.fotos.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImg ? 'bg-orange-600 w-3' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            Sem foto
          </div>
        )}
        <div className="absolute top-4 right-4 bg-orange-600 text-black px-3 py-1 rounded-md font-black text-sm shadow-lg">
          {moto.anoModelo}
        </div>
      </div>
      
      <div className="p-4 md:p-6 flex-grow flex flex-col">
        <h3 className="text-xl md:text-2xl font-black text-white mb-1 uppercase tracking-tight">{moto.marcaModelo}</h3>
        <p className="text-orange-500 text-xs md:text-sm mb-4 md:mb-6 font-mono font-bold uppercase tracking-wider">6 MESES DE GARANTIA*</p>
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-2 md:gap-y-4 md:gap-x-4 text-xs md:text-sm mb-6 md:mb-8">
          <div className="bg-zinc-950 p-2 md:p-3 rounded-lg border border-zinc-800/50">
            <span className="block text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5 md:mb-1">Quilometragem</span>
            <span className="font-bold text-zinc-100">{moto.quilometragem}</span>
          </div>
          <div className="bg-zinc-950 p-2 md:p-3 rounded-lg border border-zinc-800/50">
            <span className="block text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5 md:mb-1">Fabricação</span>
            <span className="font-bold text-zinc-100">{moto.anoFabricacao}</span>
          </div>
          <div className="bg-zinc-950 p-2 md:p-3 rounded-lg border border-zinc-800/50">
            <span className="block text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5 md:mb-1">Status</span>
            <span className="font-bold text-orange-500">{moto.statusRevisao}</span>
          </div>
          <div className="bg-zinc-950 p-2 md:p-3 rounded-lg border border-zinc-800/50">
            <span className="block text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5 md:mb-1">Documento</span>
            <span className="font-bold text-zinc-100">{moto.statusDut}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="mb-4 md:mb-6">
            <span className="block text-zinc-500 text-[10px] md:text-xs uppercase tracking-widest mb-1">Preço à vista</span>
            {moto.precoAntigo && moto.precoAVista && moto.precoAntigo > moto.precoAVista && (
              <span className="block text-zinc-500 line-through text-xs md:text-sm font-bold mb-1">
                {formatCurrency(moto.precoAntigo)}
              </span>
            )}
            <span className="text-2xl md:text-3xl font-black text-white">
              {formatCurrency(moto.precoAVista)}
            </span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFinance(moto);
            }}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-black py-3 md:py-4 rounded-xl font-black transition-colors uppercase tracking-wider text-xs md:text-sm shadow-[0_0_15px_rgba(234,88,12,0.2)]"
          >
            <Calculator size={18} />
            {isAdmin ? 'Vender / Simular' : 'Simule sua Proposta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MotoList({ motos, onAddMoto, onFinance, isAdmin, onEditMoto, onDeleteMoto }: MotoListProps) {
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMoto?.fotos) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedMoto.fotos.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMoto?.fotos) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedMoto.fotos.length) % selectedMoto.fotos.length);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Estoque <span className="text-orange-600">Disponível</span></h2>
        {isAdmin && (
          <button
            onClick={onAddMoto}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-black px-6 py-3 rounded-lg font-bold transition-colors uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(234,88,12,0.3)]"
          >
            <Plus size={20} />
            Adicionar Moto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {motos.map((moto) => (
          <MotoCard 
            key={moto.id}
            moto={moto}
            isAdmin={isAdmin}
            onEditMoto={onEditMoto}
            onDeleteMoto={onDeleteMoto}
            onFinance={onFinance}
            onSelect={(m) => {
              setSelectedMoto(m);
              setCurrentImageIndex(0);
            }}
          />
        ))}
      </div>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {selectedMoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMoto(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col md:flex-row"
            >
              <button
                onClick={() => setSelectedMoto(null)}
                className="absolute top-4 right-4 z-20 bg-black/60 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Galeria de Fotos */}
              <div className="w-full md:w-1/2 h-64 md:h-auto bg-black relative group">
                {selectedMoto.fotos && selectedMoto.fotos.length > 0 ? (
                  <>
                    <img 
                      src={selectedMoto.fotos[currentImageIndex]} 
                      alt={selectedMoto.marcaModelo} 
                      className="w-full h-full object-contain"
                    />
                    {selectedMoto.fotos.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                        >
                          <ChevronRight size={24} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {selectedMoto.fotos.map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-orange-600 w-4' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    Sem foto
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto custom-scrollbar">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-orange-600 text-black px-3 py-1 rounded-md font-black text-xs uppercase tracking-widest">
                      {selectedMoto.anoModelo}
                    </span>
                    <span className="text-orange-500 font-mono font-bold tracking-widest text-sm uppercase">
                      6 MESES DE GARANTIA*
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                    {selectedMoto.marcaModelo}
                  </h2>
                  <div className="text-4xl font-black text-orange-500">
                    {formatCurrency(selectedMoto.precoAVista)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 mb-10">
                  {/* Características */}
                  <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Settings size={14} className="text-orange-600" /> Características
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <Calendar size={20} className="text-orange-600" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Ano</span>
                          <span className="text-white font-bold">{selectedMoto.anoFabricacao}/{selectedMoto.anoModelo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <Gauge size={20} className="text-orange-600" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Quilometragem</span>
                          <span className="text-white font-bold">{selectedMoto.quilometragem}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <Settings size={20} className="text-orange-600" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Câmbio</span>
                          <span className="text-white font-bold">{selectedMoto.cambio || 'MANUAL'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <Fuel size={20} className="text-orange-600" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Combustível</span>
                          <span className="text-white font-bold">{selectedMoto.combustivel || 'FLEX'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedMoto.descricao && (
                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Info size={14} className="text-orange-600" /> Descrição
                      </h3>
                      <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedMoto.descricao}
                      </p>
                    </div>
                  )}

                  {/* Equipamentos */}
                  {selectedMoto.equipamentos && selectedMoto.equipamentos.length > 0 && (
                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-orange-600" /> Equipamentos e Opcionais
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedMoto.equipamentos.map((eq, i) => (
                          <div key={i} className="flex items-center gap-3 text-zinc-300">
                            <CheckCircle2 size={16} className="text-orange-600 shrink-0" />
                            <span className="text-sm font-medium">{eq}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      onFinance(selectedMoto);
                      setSelectedMoto(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-black py-5 rounded-2xl font-black transition-all uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(234,88,12,0.3)]"
                  >
                    <Calculator size={24} />
                    {isAdmin ? 'Vender / Simular' : 'Simule sua Proposta'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onEditMoto?.(selectedMoto);
                        setSelectedMoto(null);
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white p-5 rounded-2xl transition-colors border border-zinc-700"
                    >
                      <Edit2 size={24} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
