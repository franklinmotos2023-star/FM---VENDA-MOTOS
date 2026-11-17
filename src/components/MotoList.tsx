import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moto, BlackFridayCoupon } from '../types';
import { Plus, Calculator, Edit2, Trash2, Calendar, Gauge, Settings, Fuel, Info, CheckCircle2, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2, Flame, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MotoListProps {
  motos: Moto[];
  onAddMoto: () => void;
  onFinance: (moto: Moto) => void;
  isAdmin?: boolean;
  onEditMoto?: (moto: Moto) => void;
  onDeleteMoto?: (id: string) => void;
  activeCoupon?: BlackFridayCoupon | null;
  onClearCoupon?: () => void;
}

interface MotoCardProps {
  moto: Moto;
  isAdmin?: boolean;
  onEditMoto?: (moto: Moto) => void;
  onDeleteMoto?: (id: string) => void;
  onFinance: (moto: Moto) => void;
  onSelect: (moto: Moto) => void;
  activeCoupon?: BlackFridayCoupon | null;
  key?: string | number;
}

function MotoCard({ moto, isAdmin, onEditMoto, onDeleteMoto, onFinance, onSelect, activeCoupon }: MotoCardProps) {
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

  const promoPrice = moto.precoPromocionalBlack || moto.precoAVista;
  const hasDiscount = Boolean(moto.precoAntigo && moto.precoAntigo > promoPrice);
  const discountPercent = hasDiscount ? Math.round(((moto.precoAntigo! - promoPrice) / moto.precoAntigo!) * 100) : 0;

  const baseWhatsappMessage = `Olá! Vi a promoção da Black Friday Franklin Motos na ${moto.marcaModelo} (${moto.anoModelo}, Placa ${moto.placa}) por ${formatCurrency(promoPrice)}. Quero aproveitar essa oferta!`;
  const whatsappMessage = activeCoupon
    ? `${baseWhatsappMessage} Cupom ${activeCoupon.code} (${activeCoupon.discountText}).`
    : baseWhatsappMessage;
  const whatsappUrl = `https://wa.me/558532332200?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div 
      onClick={() => onSelect(moto)}
      className={`bg-[#191919] rounded-2xl overflow-hidden border flex flex-col hover:border-[#FF4D00] transition-all group shadow-xl relative cursor-pointer ${
        moto.arquivada 
          ? 'opacity-65 border-zinc-950 grayscale-[50%] hover:grayscale-0 hover:opacity-100' 
          : 'border-[#262626]'
      }`}
    >
      {/* Valor Promocional em Cima - Chamativo Black Friday */}
      <div className="bg-gradient-to-r from-[#FF4D00] via-[#ff6a00] to-[#FF4D00] text-black px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-black/80 leading-none mb-0.5">
            {hasDiscount ? `Black Friday · -${discountPercent}% OFF` : 'Oferta Black Friday'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-2xl md:text-3xl tracking-tight tabular-nums leading-none">
              {formatCurrency(promoPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs font-bold line-through text-black/65 tabular-nums">
                {formatCurrency(moto.precoAntigo!)}
              </span>
            )}
          </div>
        </div>
        <span className="bg-black text-[#FF4D00] px-2.5 py-1 rounded-md font-display font-black text-xs tracking-wider uppercase shrink-0">
          {moto.anoModelo}
        </span>
      </div>

      {isAdmin && (
        <div className="absolute top-20 left-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditMoto?.(moto);
            }}
            className="p-2 bg-black/70 hover:bg-[#FF4D00] text-white hover:text-black rounded-lg transition-all border border-white/10 backdrop-blur-sm"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMoto?.(moto.id);
            }}
            className="p-2 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-all border border-white/10 backdrop-blur-sm"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      <div className="h-52 md:h-60 bg-zinc-900 relative overflow-hidden group/img">
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#FF4D00] md:bg-black/50 text-black md:text-white p-2 md:p-1.5 rounded-full opacity-100 md:opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-[#FF4D00] hover:text-black shadow-lg"
                >
                  <ChevronLeft size={24} className="md:w-5 md:h-5" />
                </button>
                <button
                  onClick={nextImg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF4D00] md:bg-black/50 text-black md:text-white p-2 md:p-1.5 rounded-full opacity-100 md:opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-[#FF4D00] hover:text-black shadow-lg"
                >
                  <ChevronRight size={24} className="md:w-5 md:h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {moto.fotos.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImg ? 'bg-[#FF4D00] w-3' : 'bg-white/40'}`}
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
        {moto.arquivada && (
          <div className="absolute top-4 right-4 bg-zinc-950/90 text-[#FF4D00] border border-[#FF4D00]/30 px-2 py-1 rounded-md font-black text-[10px] tracking-widest uppercase backdrop-blur-sm z-10 shadow-lg">
            Arquivada
          </div>
        )}
      </div>
      
      <div className="p-4 md:p-6 flex-grow flex flex-col">
        <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-1 uppercase tracking-tight">{moto.marcaModelo}</h3>
        <p className="text-zinc-400 text-xs mb-4 font-semibold tracking-wider">
          {moto.quilometragem} · {moto.anoFabricacao}/{moto.anoModelo} · {moto.statusDut} · 6 meses garantia*
        </p>

        <div className="mt-auto pt-2">
          {isAdmin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFinance(moto);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#FF4D00] hover:bg-[#e04400] text-black py-3.5 rounded-xl font-black transition-colors uppercase tracking-wider text-xs md:text-sm shadow-[0_0_15px_rgba(255,77,0,0.25)]"
            >
              <Calculator size={18} />
              Vender / Simular
            </button>
          ) : (
            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-full flex items-center justify-center gap-2.5 bg-[#FF4D00] hover:bg-[#ff5e1a] text-black py-4 px-4 rounded-xl font-display font-black uppercase tracking-wider text-base shadow-[0_0_24px_rgba(255,77,0,0.35)] hover:shadow-[0_0_32px_rgba(255,77,0,0.6)] transition-shadow"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 0.95, 1.15, 1], rotate: [0, -6, 6, -4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center"
              >
                <Flame size={20} className="text-black fill-black/20" />
              </motion.span>
              <span>Quero aproveitar essa oferta</span>
            </motion.a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MotoList({ motos, onAddMoto, onFinance, isAdmin, onEditMoto, onDeleteMoto, activeCoupon, onClearCoupon }: MotoListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (location.pathname.match(/^\/motos\/[^/]+$/)) {
      const id = location.pathname.split('/').pop();
      if (motos.length > 0) {
        const m = motos.find(mt => mt.id === id);
        if (m && (!selectedMoto || selectedMoto.id !== id)) {
          setSelectedMoto(m);
          setCurrentImageIndex(0);
        }
      }
    } else {
      setSelectedMoto(null);
    }
  }, [location.pathname, motos]);

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

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale === 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF4D00] block mb-1">
            Black Friday Franklin Motos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
            Motos em <span className="text-[#FF4D00]">Oferta</span>
          </h2>
        </div>
        {isAdmin && (
          <button
            onClick={onAddMoto}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FF4D00] hover:bg-[#e04400] text-black px-6 py-3 rounded-xl font-bold transition-colors uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(255,77,0,0.3)]"
          >
            <Plus size={20} />
            Adicionar Moto
          </button>
        )}
      </div>

      {activeCoupon && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141414] border border-[#FF4D00]/40 rounded-xl px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <Tag size={15} className="text-[#FF4D00] shrink-0" />
            <span>
              Cupom ativo nas ofertas: <strong className="text-[#FF4D00] font-mono">{activeCoupon.code}</strong> · {activeCoupon.discountText}
            </span>
          </div>
          {onClearCoupon && (
            <button
              type="button"
              onClick={onClearCoupon}
              className="text-zinc-400 hover:text-white font-semibold transition-colors"
            >
              Remover cupom
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {motos.map((moto) => (
          <MotoCard 
            key={moto.id}
            moto={moto}
            isAdmin={isAdmin}
            onEditMoto={onEditMoto}
            onDeleteMoto={onDeleteMoto}
            onFinance={onFinance}
            activeCoupon={activeCoupon}
            onSelect={(m) => {
              navigate(`/motos/${m.id}`);
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
              onClick={() => navigate('/motos')}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col md:flex-row"
            >
              <button
                onClick={() => navigate('/motos')}
                className="absolute top-4 right-4 z-20 bg-black/60 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Galeria de Fotos */}
              <div className="w-full md:w-1/2 h-64 md:h-auto md:min-h-[400px] bg-black relative group shrink-0 md:flex-1">
                {selectedMoto.fotos && selectedMoto.fotos.length > 0 ? (
                  <>
                    <div 
                      className="absolute inset-0 w-full h-full flex items-center justify-center cursor-zoom-in group/zoom"
                      onClick={() => {
                        setZoomIndex(currentImageIndex);
                        setIsZoomOpen(true);
                        setScale(1);
                        setPosition({ x: 0, y: 0 });
                      }}
                    >
                      <img 
                        src={selectedMoto.fotos[currentImageIndex]} 
                        alt={selectedMoto.marcaModelo} 
                        className="w-full h-full object-contain transition-all duration-300 group-hover/zoom:scale-[1.02]" 
                      />
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase flex items-center gap-2 opacity-0 group-hover/zoom:opacity-100 transition-opacity">
                        <Maximize2 size={12} className="text-orange-600 animate-pulse" />
                        Clique para Ampliar
                      </div>
                    </div>
                    {selectedMoto.fotos.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-orange-600 md:bg-black/40 text-black md:text-white p-2.5 md:p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500 md:hover:bg-orange-600 shadow-xl"
                        >
                          <ChevronLeft size={32} className="md:w-6 md:h-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-orange-600 md:bg-black/40 text-black md:text-white p-2.5 md:p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500 md:hover:bg-orange-600 shadow-xl"
                        >
                          <ChevronRight size={32} className="md:w-6 md:h-6" />
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
              <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-[#FF4D00] to-[#ff6a00] text-black p-4 rounded-2xl mb-5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-black/80">
                        Oferta Black Friday Franklin Motos
                      </span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-display text-3xl sm:text-4xl font-black tabular-nums">
                          {formatCurrency(selectedMoto.precoPromocionalBlack || selectedMoto.precoAVista)}
                        </span>
                        {selectedMoto.precoAntigo && selectedMoto.precoAntigo > (selectedMoto.precoPromocionalBlack || selectedMoto.precoAVista) && (
                          <span className="text-sm font-bold line-through text-black/65 tabular-nums">
                            {formatCurrency(selectedMoto.precoAntigo)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="bg-black text-[#FF4D00] px-3 py-1 rounded-md font-display font-black text-xs uppercase tracking-widest">
                      {selectedMoto.anoModelo}
                    </span>
                  </div>
                  <p className="text-[#FF4D00] font-bold tracking-wider text-xs uppercase mb-1">
                    6 MESES DE GARANTIA* · {selectedMoto.statusDut}
                  </p>
                  <h2 className="font-display text-4xl font-black text-white uppercase tracking-tight leading-none">
                    {selectedMoto.marcaModelo}
                  </h2>
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

                <div className="flex flex-col gap-3">
                  {isAdmin ? (
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          onFinance(selectedMoto);
                          setSelectedMoto(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-3 bg-[#FF4D00] hover:bg-[#e04400] text-black py-5 rounded-2xl font-black transition-all uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(255,77,0,0.3)]"
                      >
                        <Calculator size={24} />
                        Vender / Simular
                      </button>
                      <button
                        onClick={() => {
                          onEditMoto?.(selectedMoto);
                          setSelectedMoto(null);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white p-5 rounded-2xl transition-colors border border-zinc-700"
                      >
                        <Edit2 size={24} />
                      </button>
                    </div>
                  ) : (
                    <motion.a
                      href={`https://wa.me/558532332200?text=${encodeURIComponent(
                        `Olá! Vi a promoção da Black Friday Franklin Motos na ${selectedMoto.marcaModelo} (${selectedMoto.anoModelo}, Placa ${selectedMoto.placa}) por ${formatCurrency(selectedMoto.precoPromocionalBlack || selectedMoto.precoAVista)}. Quero aproveitar essa oferta!${activeCoupon ? ` Cupom ${activeCoupon.code} (${activeCoupon.discountText}).` : ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      className="w-full flex items-center justify-center gap-3 bg-[#FF4D00] hover:bg-[#ff5e1a] text-black py-4 px-6 rounded-2xl font-display font-black transition-shadow uppercase tracking-wider text-lg shadow-[0_0_30px_rgba(255,77,0,0.4)] hover:shadow-[0_0_40px_rgba(255,77,0,0.65)]"
                    >
                      <motion.span
                        animate={{ scale: [1, 1.2, 0.95, 1.15, 1], rotate: [0, -6, 6, -4, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="inline-flex items-center justify-center"
                      >
                        <Flame size={22} className="text-black fill-black/20" />
                      </motion.span>
                      <span>Quero aproveitar essa oferta</span>
                    </motion.a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isZoomOpen && selectedMoto && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md select-none touch-none">
            {/* Header com Controles */}
            <div className="flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent z-10 w-full shrink-0">
              <div className="flex flex-col">
                <h3 className="text-white font-black uppercase tracking-wider text-sm md:text-base">{selectedMoto.marcaModelo}</h3>
                <span className="text-zinc-500 font-mono text-[10px] md:text-xs">
                  Foto {zoomIndex + 1} de {selectedMoto.fotos.length} • {Math.round(scale * 100)}% Zoom
                </span>
              </div>
              
              {/* Botões de Controle de Zoom */}
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={handleZoomOut}
                  disabled={scale === 1}
                  className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-orange-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-xs font-mono text-zinc-400 min-w-[40px] text-center hidden sm:inline">
                  {scale.toFixed(1)}x
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={scale === 4}
                  className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-orange-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={handleResetZoom}
                  disabled={scale === 1 && position.x === 0 && position.y === 0}
                  className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-orange-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Resetar"
                >
                  <RotateCcw size={18} />
                </button>
                
                <div className="w-px h-6 bg-zinc-800 mx-1" />
                
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="p-2 bg-orange-600 text-black hover:bg-orange-500 rounded-xl transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Container Central com a Foto */}
            <div 
              className="flex-1 w-full relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
                }
              }}
              onTouchMove={(e) => {
                if (isDragging && e.touches.length === 1 && scale > 1) {
                  setPosition({
                    x: e.touches[0].clientX - dragStart.x,
                    y: e.touches[0].clientY - dragStart.y
                  });
                }
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  cursor: scale > 1 ? 'grab' : 'zoom-in',
                }}
                className="max-h-[85vh] max-w-[90vw] transition-transform duration-75 ease-out select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  if (scale === 1) {
                    setScale(2);
                  } else {
                    handleResetZoom();
                  }
                }}
              >
                <img
                  src={selectedMoto.fotos[zoomIndex]}
                  alt={selectedMoto.marcaModelo}
                  className="max-h-[80vh] max-w-[85vw] object-contain pointer-events-none select-none"
                />
              </div>

              {/* Botões de Navegação entre fotos no Zoom */}
              {selectedMoto.fotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomIndex((prev) => (prev - 1 + selectedMoto.fotos.length) % selectedMoto.fotos.length);
                      handleResetZoom();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-3 rounded-full hover:bg-zinc-800 border border-zinc-800 transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomIndex((prev) => (prev + 1) % selectedMoto.fotos.length);
                      handleResetZoom();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-3 rounded-full hover:bg-zinc-800 border border-zinc-800 transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Rodapé de Miniaturas */}
            {selectedMoto.fotos.length > 1 && (
              <div className="p-4 bg-black/60 flex justify-center gap-2 overflow-x-auto w-full max-w-xl mx-auto rounded-t-2xl border-t border-zinc-900 pb-6 shrink-0 z-10">
                {selectedMoto.fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setZoomIndex(index);
                      handleResetZoom();
                    }}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      zoomIndex === index ? 'border-orange-600 scale-105' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={foto} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
