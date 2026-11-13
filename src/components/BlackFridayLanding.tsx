import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moto, 
  BlackFridayConfig, 
  BlackFridayCoupon 
} from '../types';
import { 
  DEFAULT_BLACK_FRIDAY_CONFIG, 
  buildWhatsAppLink, 
  trackBlackFridayEvent 
} from '../services/blackFridayService';
import { 
  Flame, 
  Clock, 
  ShieldCheck, 
  FileCheck, 
  Wrench, 
  CreditCard, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  Check, 
  MessageCircle, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Sparkles, 
  Zap, 
  Award, 
  ExternalLink, 
  MapPin, 
  Phone, 
  ArrowUpRight, 
  Tag, 
  Layers, 
  Eye, 
  ZoomIn, 
  X,
  Bike,
  Info
} from 'lucide-react';

interface BlackFridayLandingProps {
  motos: Moto[];
  config?: BlackFridayConfig;
  isAdmin?: boolean;
  onOpenAdminBlackFriday?: () => void;
  onSelectMotoDetail?: (moto: Moto) => void;
  onSimulateFinance?: (moto: Moto) => void;
}

export default function BlackFridayLanding({
  motos,
  config = DEFAULT_BLACK_FRIDAY_CONFIG,
  isAdmin = false,
  onOpenAdminBlackFriday,
  onSelectMotoDetail,
  onSimulateFinance
}: BlackFridayLandingProps) {
  const navigate = useNavigate();

  // Campaign end time calculation for countdown
  const targetDate = useMemo(() => {
    try {
      const parsed = new Date(config.endDate).getTime();
      if (!isNaN(parsed)) return parsed;
    } catch {
      // fallback
    }
    return Date.now() + 10 * 24 * 60 * 60 * 1000;
  }, [config.endDate]);

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Featured Moto for Hero
  const featuredMoto = useMemo(() => {
    if (config.featuredMotoId) {
      const found = motos.find(m => m.id === config.featuredMotoId && !m.arquivada);
      if (found) return found;
    }
    // Default to the first available moto or one with promo price
    return motos.find(m => !m.arquivada && m.precoAntigo && m.precoAntigo > m.precoAVista) || motos[0] || null;
  }, [motos, config.featuredMotoId]);

  // Image slider for hero moto
  const [heroImgIndex, setHeroImgIndex] = useState(0);

  // Coupons state & copy feedback
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('BLACKFRANKLIN');

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setSelectedCouponCode(code);
    trackBlackFridayEvent('copy_coupon', { coupon: code });
    setTimeout(() => setCopiedCoupon(null), 3000);
  };

  // Full Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('TODAS');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [selectedPriceRange, setSelectedPriceRange] = useState<'TODOS' | 'ATE_15K' | '15K_25K' | 'ACIMA_25K'>('TODOS');
  const [selectedDisplacement, setSelectedDisplacement] = useState<'TODAS' | 'ATE_160' | '160_300' | 'ACIMA_300'>('TODAS');

  // Trade-in & Financing quick simulator state
  const [simMotoValue, setSimMotoValue] = useState<number>(featuredMoto?.precoAVista || 15000);
  const [simDownPayment, setSimDownPayment] = useState<number>(3000);
  const [simInstallments, setSimInstallments] = useState<number>(36);
  const [simHasTradeIn, setSimHasTradeIn] = useState<boolean>(false);
  const [simTradeInModel, setSimTradeInModel] = useState<string>('');

  // Image Lightbox / Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Available brands derived from stock
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    motos.forEach(m => {
      if (m.marcaModelo) {
        const brand = m.marcaModelo.split('/')[0]?.trim().toUpperCase();
        if (brand) brands.add(brand);
      }
    });
    return ['TODAS', ...Array.from(brands)];
  }, [motos]);

  // Filtered motos list
  const filteredMotos = useMemo(() => {
    return motos.filter(moto => {
      if (moto.arquivada && !isAdmin) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = moto.marcaModelo.toLowerCase().includes(q);
        const matchesPlate = moto.placa.toLowerCase().includes(q);
        const matchesYear = `${moto.anoFabricacao}/${moto.anoModelo}`.includes(q);
        if (!matchesName && !matchesPlate && !matchesYear) return false;
      }

      // Brand filter
      if (selectedBrand !== 'TODAS') {
        const brand = moto.marcaModelo.split('/')[0]?.trim().toUpperCase();
        if (brand !== selectedBrand) return false;
      }

      // Category filter (infer if not explicit: Scooter, Trail, Street)
      if (selectedCategory !== 'TODAS') {
        const modelUpper = moto.marcaModelo.toUpperCase();
        const isScooter = modelUpper.includes('NMAX') || modelUpper.includes('PCX') || modelUpper.includes('ADV') || modelUpper.includes('ELITE') || modelUpper.includes('BURGMAN') || modelUpper.includes('FLUO') || modelUpper.includes('SH');
        const isTrail = modelUpper.includes('BROS') || modelUpper.includes('XRE') || modelUpper.includes('CROSSER') || modelUpper.includes('LANDER') || modelUpper.includes('TENERE');
        const isStreet = modelUpper.includes('CG') || modelUpper.includes('FAN') || modelUpper.includes('TITAN') || modelUpper.includes('FAZER') || modelUpper.includes('YBR') || modelUpper.includes('FACTOR');

        if (selectedCategory === 'SCOOTER' && !isScooter) return false;
        if (selectedCategory === 'TRAIL' && !isTrail) return false;
        if (selectedCategory === 'STREET' && !isStreet) return false;
      }

      // Price filter
      const price = moto.precoPromocionalBlack || moto.precoAVista;
      if (selectedPriceRange === 'ATE_15K' && price > 15000) return false;
      if (selectedPriceRange === '15K_25K' && (price <= 15000 || price > 25000)) return false;
      if (selectedPriceRange === 'ACIMA_25K' && price <= 25000) return false;

      // Displacement filter
      if (selectedDisplacement !== 'TODAS') {
        const match = moto.marcaModelo.match(/\d{3,4}/);
        const cc = match ? parseInt(match[0], 10) : 150;
        if (selectedDisplacement === 'ATE_160' && cc > 160) return false;
        if (selectedDisplacement === '160_300' && (cc <= 160 || cc > 300)) return false;
        if (selectedDisplacement === 'ACIMA_300' && cc <= 300) return false;
      }

      return true;
    });
  }, [motos, searchQuery, selectedBrand, selectedCategory, selectedPriceRange, selectedDisplacement, isAdmin]);

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Financing calculation estimate
  const estimatedInstallment = useMemo(() => {
    const financed = Math.max(0, simMotoValue - simDownPayment);
    if (financed <= 0) return 0;
    // Estimated average monthly rate of 1.79%
    const rate = 0.0179;
    const factor = (rate * Math.pow(1 + rate, simInstallments)) / (Math.pow(1 + rate, simInstallments) - 1);
    return Math.round(financed * factor);
  }, [simMotoValue, simDownPayment, simInstallments]);

  return (
    <div className="bg-[#080808] text-white min-h-screen font-body selection:bg-[#FF4D00] selection:text-black relative">
      
      {/* SECTION 1: TOP ANNOUNCEMENT BAR (BLACK FRIDAY ALERT) */}
      <section className="bg-gradient-to-r from-black via-[#141414] to-black border-b border-[#FF4D00]/40 py-2.5 px-4 text-xs sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4D00]"></span>
            </span>
            <span className="font-display font-black text-sm uppercase tracking-wider text-[#FF4D00] flex items-center gap-1.5">
              <Flame size={16} className="text-[#FF4D00]" />
              BLACK FRIDAY OFICIAL FRANKLIN MOTOS
            </span>
            <span className="hidden md:inline-block text-zinc-400">|</span>
            <span className="hidden md:inline-block text-zinc-300 font-medium">
              O PREÇO CAIU. A CHANCE ACELEROU.
            </span>
          </div>

          {/* Countdown Clock Display */}
          <div className="flex items-center gap-2 font-display text-sm">
            <span className="text-zinc-400 uppercase text-[11px] font-bold tracking-widest flex items-center gap-1">
              <Clock size={13} className="text-[#FF4D00]" /> TERMINA EM:
            </span>
            <div className="flex items-center gap-1 text-white font-black">
              <span className="bg-[#191919] border border-[#262626] px-1.5 py-0.5 rounded text-white text-xs">
                {String(timeLeft.days).padStart(2, '0')}d
              </span>
              <span className="text-[#FF4D00]">:</span>
              <span className="bg-[#191919] border border-[#262626] px-1.5 py-0.5 rounded text-white text-xs">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span className="text-[#FF4D00]">:</span>
              <span className="bg-[#191919] border border-[#262626] px-1.5 py-0.5 rounded text-white text-xs">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-[#FF4D00]">:</span>
              <span className="bg-[#191919] border border-[#262626] px-1.5 py-0.5 rounded text-[#FF4D00] text-xs">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HEADER MENU WITH OFFICIAL LOGO & COMMERCIAL CALLS */}
      <header className="bg-[#080808]/95 border-b border-[#262626] sticky top-[41px] z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img 
              src="/logo.png" 
              alt="Franklin Motos" 
              className="h-9 md:h-11 w-auto object-contain transition-transform group-hover:scale-105 duration-200" 
            />
            <div className="hidden lg:flex flex-col border-l border-[#262626] pl-3">
              <span className="font-display font-black text-sm tracking-widest text-[#FF4D00] uppercase">
                FRANKLIN BLACK
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                Edição Especial 2026
              </span>
            </div>
          </div>

          {/* Quick Nav Anchors */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <button 
              onClick={() => navigate('/oficina')}
              className="px-4 py-2 rounded-lg text-zinc-300 hover:text-[#FF4D00] hover:bg-[#191919] transition-all flex items-center gap-1.5"
            >
              <Wrench size={14} /> Oficina
            </button>
            <a 
              href="#ofertas" 
              className="px-4 py-2 rounded-lg text-zinc-300 hover:text-[#FF4D00] hover:bg-[#191919] transition-all flex items-center gap-1.5"
            >
              <Bike size={14} /> Motos
            </a>
            <button 
              onClick={() => navigate('/acessorios')}
              className="px-4 py-2 rounded-lg text-zinc-300 hover:text-[#FF4D00] hover:bg-[#191919] transition-all flex items-center gap-1.5"
            >
              <Wrench size={14} /> Peças
            </button>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            {isAdmin && onOpenAdminBlackFriday && (
              <button
                onClick={onOpenAdminBlackFriday}
                className="px-3 py-2 bg-[#191919] border border-[#FF4D00]/50 hover:border-[#FF4D00] text-[#FF4D00] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Gerenciar Black
              </button>
            )}

            <a
              href={buildWhatsAppLink(
                config.whatsappNumber,
                config.whatsappMessageTemplate,
                featuredMoto,
                selectedCouponCode
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBlackFridayEvent('click_header_whatsapp')}
              className="flex items-center gap-2 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-sm uppercase px-4 py-2.5 rounded-xl transition-all shadow-[0_0_25px_rgba(255,77,0,0.35)] hover:scale-105 active:scale-95"
            >
              <MessageCircle size={18} className="text-black" />
              <span className="hidden sm:inline">Falar com Consultor</span>
              <span className="sm:hidden">Consultor</span>
            </a>
          </div>
        </div>
      </header>

      {/* SECTION 3: HERO PRINCIPAL COM MOTO E OFERTA DE DESTAQUE */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#080808] via-[#101010] to-[#080808] pt-8 md:pt-16 pb-16 md:pb-24 border-b border-[#262626]">
        {/* Ambient glow & speed pattern */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[#FF4D00]/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-speed-stripes opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left: Aggressive Typography, Pricing & Hero CTA */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#191919] border border-[#FF4D00]/40 rounded-full">
                <Flame size={16} className="text-[#FF4D00] animate-bounce" />
                <span className="font-display font-black text-xs md:text-sm uppercase tracking-widest text-[#FF4D00]">
                  FRANKLIN BLACK • EDIÇÃO HISTÓRICA
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl uppercase tracking-tighter leading-[0.9] text-white">
                  BLACK FRIDAY <br />
                  <span className="text-[#FF4D00] drop-shadow-[0_0_35px_rgba(255,77,0,0.5)]">
                    FRANKLIN MOTOS
                  </span>
                </h1>
                <p className="font-display font-bold text-xl sm:text-2xl md:text-3xl uppercase tracking-wide text-zinc-300">
                  O PREÇO CAIU. <span className="text-[#FF4D00]">A CHANCE ACELEROU.</span>
                </p>
              </div>

              {/* Featured Motorcycle Offer Box */}
              {featuredMoto && (
                <div className="bg-[#191919]/90 border border-[#333333] hover:border-[#FF4D00]/60 p-5 rounded-2xl backdrop-blur-xl shadow-2xl transition-all space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Máquina Destaque
                      </span>
                      <h3 className="font-display font-black text-2xl md:text-3xl text-white uppercase tracking-tight">
                        {featuredMoto.marcaModelo}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        Ano {featuredMoto.anoModelo} • {featuredMoto.quilometragem} • {featuredMoto.statusRevisao || '100% REVISADA'}
                      </span>
                    </div>

                    <div className="bg-[#FF4D00] text-black font-display font-black px-3 py-1 rounded-lg text-xs md:text-sm uppercase tracking-wider">
                      DUT INCLUSO + GARANTIA
                    </div>
                  </div>

                  {/* Pricing comparison */}
                  <div className="flex flex-wrap items-baseline gap-4">
                    {featuredMoto.precoAntigo && featuredMoto.precoAntigo > featuredMoto.precoAVista && (
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                          De:
                        </span>
                        <span className="text-lg md:text-xl text-zinc-400 line-through font-display font-black">
                          {formatBRL(featuredMoto.precoAntigo)}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-[#FF4D00] uppercase tracking-widest block font-bold">
                        Por apenas à vista:
                      </span>
                      <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white text-glow">
                        {formatBRL(featuredMoto.precoPromocionalBlack || featuredMoto.precoAVista)}
                      </span>
                    </div>

                    {featuredMoto.precoAntigo && featuredMoto.precoAntigo > featuredMoto.precoAVista && (
                      <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase">
                        Economia de {formatBRL(featuredMoto.precoAntigo - (featuredMoto.precoPromocionalBlack || featuredMoto.precoAVista))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <CreditCard size={15} className="text-[#FF4D00]" />
                    <span>
                      Financiamento facilitado em até <strong>48x</strong> ou cartão em até <strong>24x</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href={buildWhatsAppLink(
                    config.whatsappNumber,
                    config.whatsappMessageTemplate,
                    featuredMoto,
                    selectedCouponCode
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBlackFridayEvent('click_hero_offer', { moto: featuredMoto?.marcaModelo })}
                  className="flex-1 py-4 px-6 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-xl uppercase tracking-wider rounded-xl transition-all duration-200 shadow-[0_0_30px_rgba(255,77,0,0.4)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Flame size={22} className="text-black" />
                  QUERO ESSA OFERTA
                </a>

                <a
                  href="#ofertas"
                  className="py-4 px-6 bg-[#191919] hover:bg-zinc-800 text-white border border-[#333333] hover:border-zinc-600 font-display font-black text-xl uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  VER TODAS AS MOTOS
                  <ChevronRight size={20} className="text-[#FF4D00]" />
                </a>
              </div>

            </div>

            {/* Right: Real Large Motorcycle Image Protagonist */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none group">
                
                {/* Glow ring behind bike */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#FF4D00]/20 via-transparent to-[#FF4D00]/30 rounded-3xl blur-2xl group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative bg-[#141414] border border-[#262626] rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
                  
                  {/* Badge on photo */}
                  <div className="absolute top-6 left-6 z-20 flex flex-col gap-1.5">
                    <span className="bg-[#FF4D00] text-black font-display font-black text-xs md:text-sm uppercase tracking-wider px-3 py-1 rounded-md shadow-lg">
                      OFERTA RELÂMPAGO
                    </span>
                    <span className="bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded border border-white/10">
                      Placa {featuredMoto?.placa || 'CONFIRMADA'}
                    </span>
                  </div>

                  {/* Zoom button */}
                  {featuredMoto && featuredMoto.fotos && featuredMoto.fotos.length > 0 && (
                    <button
                      onClick={() => setZoomedImage(featuredMoto.fotos[heroImgIndex])}
                      className="absolute top-6 right-6 z-20 p-2.5 bg-black/70 hover:bg-[#FF4D00] text-white hover:text-black rounded-xl transition-all border border-white/10 backdrop-blur-sm"
                      title="Ver foto em tamanho real"
                    >
                      <ZoomIn size={18} />
                    </button>
                  )}

                  {/* Main bike photo */}
                  <div className="h-64 sm:h-80 md:h-96 relative flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-900/60">
                    {featuredMoto?.fotos && featuredMoto.fotos.length > 0 ? (
                      <motion.img 
                        key={heroImgIndex}
                        initial={{ opacity: 0.7, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        src={featuredMoto.fotos[heroImgIndex]} 
                        alt={featuredMoto.marcaModelo}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Bike size={64} />
                        <span className="text-xs uppercase font-bold mt-2">Sem foto cadastrada</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail gallery if multiple photos */}
                  {featuredMoto && featuredMoto.fotos && featuredMoto.fotos.length > 1 && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
                      {featuredMoto.fotos.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHeroImgIndex(idx)}
                          className={`relative h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                            heroImgIndex === idx 
                              ? 'border-[#FF4D00] scale-105' 
                              : 'border-zinc-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: BARRA DE VANTAGENS DA CAMPANHA (TRUST PILLARS) */}
      <section className="bg-[#141414] border-b border-[#262626] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6">
            
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191919] border border-[#262626]">
              <div className="p-2.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm uppercase text-white tracking-wide">
                  Garantia de 6 Meses
                </h4>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Motor e câmbio revisados com laudo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191919] border border-[#262626]">
              <div className="p-2.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                <FileCheck size={22} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm uppercase text-white tracking-wide">
                  DUT Incluso
                </h4>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Transferência grátis em modelos selecionados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191919] border border-[#262626]">
              <div className="p-2.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                <Wrench size={22} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm uppercase text-white tracking-wide">
                  Revisão 100%
                </h4>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Mais de 40 itens inspecionados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191919] border border-[#262626]">
              <div className="p-2.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                <CreditCard size={22} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm uppercase text-white tracking-wide">
                  Sem Entrada
                </h4>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Financiamento bancário em até 48x
                </p>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 flex items-start gap-3 p-3 rounded-xl bg-[#191919] border border-[#262626]">
              <div className="p-2.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] shrink-0">
                <RefreshCw size={22} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm uppercase text-white tracking-wide">
                  Sua Moto na Troca
                </h4>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Avaliação imediata e justa
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5: VITRINE DE MOTOCICLETAS PROMOCIONAIS ("AS MÁQUINAS ENTRARAM NA BLACK") */}
      <section id="ofertas" className="py-16 md:py-24 border-b border-[#262626] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header of Section */}
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191919] border border-[#FF4D00]/40 rounded-full text-xs font-display font-black tracking-widest text-[#FF4D00] uppercase">
              <Zap size={14} /> OFERTAS ATIVAS NO ESTOQUE
            </div>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white">
              AS MÁQUINAS ENTRARAM NA <span className="text-[#FF4D00]">BLACK.</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
              Preços agressivos com benefícios reais confirmados. Clique e garanta a sua antes que outro leve.
            </p>
          </div>

          {/* Grid of Promotional Motos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredMotos.slice(0, 6).map((moto) => {
              const promoPrice = moto.precoPromocionalBlack || moto.precoAVista;
              const hasDiscount = moto.precoAntigo && moto.precoAntigo > promoPrice;
              const discountValue = hasDiscount ? (moto.precoAntigo! - promoPrice) : 0;
              const discountPercent = hasDiscount ? Math.round((discountValue / moto.precoAntigo!) * 100) : 0;

              return (
                <div
                  key={moto.id}
                  className="bg-[#191919] border border-[#262626] hover:border-[#FF4D00] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,77,0,0.15)] flex flex-col group"
                >
                  {/* Photo area */}
                  <div className="h-56 relative bg-zinc-900 overflow-hidden cursor-pointer" onClick={() => onSelectMotoDetail?.(moto)}>
                    {hasDiscount && (
                      <div className="absolute top-3 left-3 z-10 bg-[#FF4D00] text-black font-display font-black text-xs uppercase px-2.5 py-1 rounded shadow-md">
                        -{discountPercent}% OFF
                      </div>
                    )}

                    <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (moto.fotos && moto.fotos[0]) setZoomedImage(moto.fotos[0]);
                        }}
                        className="p-1.5 bg-black/60 hover:bg-[#FF4D00] text-white hover:text-black rounded-lg transition-all border border-white/10 backdrop-blur-sm"
                        title="Ver foto ampliada"
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>

                    {moto.fotos && moto.fotos.length > 0 ? (
                      <img 
                        src={moto.fotos[0]} 
                        alt={moto.marcaModelo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Bike size={48} />
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold text-zinc-300 border border-white/10">
                      Placa {moto.placa}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase text-[#FF4D00] tracking-wider">
                          {moto.statusDut || 'DUT INCLUSO'}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-semibold">
                          Ano {moto.anoModelo}
                        </span>
                      </div>

                      <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight group-hover:text-[#FF4D00] transition-colors">
                        {moto.marcaModelo}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2">
                        <span>{moto.quilometragem}</span>
                        <span>•</span>
                        <span>{moto.statusRevisao || 'REVISADA'}</span>
                        <span>•</span>
                        <span className="text-zinc-300">{moto.combustivel || 'FLEX'}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-[#141414] border border-zinc-800 p-3.5 rounded-xl space-y-1">
                      {hasDiscount && (
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>Preço anterior:</span>
                          <span className="line-through">{formatBRL(moto.precoAntigo!)}</span>
                        </div>
                      )}

                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-[#FF4D00] uppercase">
                          Black Friday:
                        </span>
                        <span className="font-display font-black text-2xl md:text-3xl text-white">
                          {formatBRL(promoPrice)}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80 flex items-center justify-between">
                        <span>Financiamento estimado:</span>
                        <span className="text-white font-bold">
                          a partir de {formatBRL(Math.round(promoPrice * 0.032))}/mês
                        </span>
                      </div>
                    </div>

                    {/* Coupon tag */}
                    <div className="flex items-center justify-between text-xs bg-[#FF4D00]/10 border border-[#FF4D00]/30 px-3 py-2 rounded-lg text-[#FF4D00]">
                      <span className="font-bold flex items-center gap-1.5">
                        <Tag size={13} /> Cupom aplicável:
                      </span>
                      <span className="font-display font-black tracking-wider uppercase">
                        {selectedCouponCode || 'BLACKFRANKLIN'}
                      </span>
                    </div>

                    {/* Action button */}
                    <a
                      href={buildWhatsAppLink(
                        config.whatsappNumber,
                        config.whatsappMessageTemplate,
                        moto,
                        selectedCouponCode
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackBlackFridayEvent('click_card_offer', { moto: moto.marcaModelo, id: moto.id })}
                      className="w-full py-3.5 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-base uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,77,0,0.25)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Flame size={18} />
                      GARANTIR MINHA OFERTA
                    </a>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* SECTION 6: CENTRAL DE CUPONS ("DESBLOQUEIE SEU DESCONTO") */}
      <section id="cupons" className="py-16 md:py-24 bg-[#141414] border-b border-[#262626] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191919] border border-[#FF4D00]/40 rounded-full text-xs font-display font-black tracking-widest text-[#FF4D00] uppercase">
              <Tag size={14} /> BENEFÍCIOS EXCLUSIVOS
            </div>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white">
              DESBLOQUEIE SEU <span className="text-[#FF4D00]">DESCONTO.</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
              Copie o cupom abaixo e apresente ao consultor para ativar o desconto ou benefício no seu atendimento.
            </p>
          </div>

          {/* Ticket style cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.coupons.filter(c => c.active).map((coupon) => {
              const isCopied = copiedCoupon === coupon.code;
              const isSelected = selectedCouponCode === coupon.code;

              return (
                <div
                  key={coupon.id}
                  className={`bg-[#191919] border-2 border-dashed ${
                    isSelected ? 'border-[#FF4D00] shadow-[0_0_25px_rgba(255,77,0,0.2)]' : 'border-[#333333]'
                  } rounded-2xl p-6 relative flex flex-col justify-between transition-all group hover:border-[#FF4D00]`}
                >
                  {/* Decorative ticket notches */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#141414] rounded-full border-r border-[#333333]" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#141414] rounded-full border-l border-[#333333]" />

                  <div>
                    {/* Tag badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#FF4D00] text-black">
                        {coupon.tag || 'CUPOM ATIVO'}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1 font-semibold">
                        <Clock size={12} /> Validade: {coupon.validUntil}
                      </span>
                    </div>

                    <h3 className="font-display font-black text-3xl text-white uppercase tracking-tight">
                      {coupon.discountText}
                    </h3>

                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      {coupon.description}
                    </p>

                    <p className="text-[11px] text-zinc-500 mt-2 italic">
                      Regras: {coupon.conditions}
                    </p>
                  </div>

                  {/* Code box & copy button */}
                  <div className="pt-6 mt-6 border-t border-dashed border-zinc-800 space-y-3">
                    <div className="bg-black border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                      <span className="font-display font-black text-xl text-[#FF4D00] tracking-widest uppercase">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCoupon(coupon.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                          isCopied 
                            ? 'bg-green-500 text-black' 
                            : 'bg-zinc-800 hover:bg-[#FF4D00] text-white hover:text-black'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} /> COPIADO!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> COPIAR CUPOM
                          </>
                        )}
                      </button>
                    </div>

                    <a
                      href={buildWhatsAppLink(
                        config.whatsappNumber,
                        config.whatsappMessageTemplate,
                        featuredMoto,
                        coupon.code
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-xs font-bold text-zinc-400 hover:text-[#FF4D00] uppercase tracking-wider transition-colors"
                    >
                      Aplicar no WhatsApp agora →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* SECTION 7: FILTROS E CATÁLOGO COMPLETO */}
      <section id="catalogo" className="py-16 md:py-24 border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-[#FF4D00] uppercase tracking-widest block mb-1">
                ESTOQUE EM TEMPO REAL
              </span>
              <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-white">
                CATÁLOGO COMPLETO FRANKLIN
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Filtrando {filteredMotos.length} de {motos.length} motocicletas prontas para entrega
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por modelo, marca ou ano..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#191919] border border-[#262626] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl mb-8 space-y-4">
            
            {/* Brands */}
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
                Marca:
              </span>
              <div className="flex flex-wrap gap-2">
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedBrand === brand 
                        ? 'bg-[#FF4D00] text-black shadow-md' 
                        : 'bg-[#191919] text-zinc-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="pt-3 border-t border-zinc-800/60">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
                Categoria:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'TODAS', label: 'Todas as Categorias' },
                  { id: 'SCOOTER', label: 'Scooter (NMAX, PCX, ADV)' },
                  { id: 'STREET', label: 'Street (CG, Titan, Fazer)' },
                  { id: 'TRAIL', label: 'Trail (Bros, XRE, Crosser)' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-[#FF4D00] text-black shadow-md' 
                        : 'bg-[#191919] text-zinc-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="pt-3 border-t border-zinc-800/60">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
                Faixa de Preço:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'TODOS', label: 'Todos os Preços' },
                  { id: 'ATE_15K', label: 'Até R$ 15.000' },
                  { id: '15K_25K', label: 'R$ 15.000 a R$ 25.000' },
                  { id: 'ACIMA_25K', label: 'Acima de R$ 25.000' }
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setSelectedPriceRange(range.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedPriceRange === range.id 
                        ? 'bg-[#FF4D00] text-black shadow-md' 
                        : 'bg-[#191919] text-zinc-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Catalog Grid */}
          {filteredMotos.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] rounded-2xl border border-[#262626] p-8 space-y-4">
              <Bike size={48} className="mx-auto text-zinc-600" />
              <h3 className="font-display font-black text-2xl uppercase text-white">
                Nenhuma moto encontrada com esses filtros
              </h3>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Tente redefinir a busca ou entre em contato com nosso estoque para saber de novidades que acabaram de chegar.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBrand('TODAS');
                  setSelectedCategory('TODAS');
                  setSelectedPriceRange('TODOS');
                  setSelectedDisplacement('TODAS');
                }}
                className="px-6 py-2.5 bg-[#FF4D00] text-black font-display font-black uppercase text-sm rounded-xl"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMotos.map((moto) => {
                const promoPrice = moto.precoPromocionalBlack || moto.precoAVista;
                return (
                  <div
                    key={moto.id}
                    className="bg-[#191919] border border-[#262626] hover:border-[#FF4D00]/60 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all"
                  >
                    <div className="relative h-48 bg-zinc-900 overflow-hidden cursor-pointer" onClick={() => onSelectMotoDetail?.(moto)}>
                      {moto.fotos && moto.fotos.length > 0 ? (
                        <img 
                          src={moto.fotos[0]} 
                          alt={moto.marcaModelo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Bike size={36} />
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (moto.fotos && moto.fotos[0]) setZoomedImage(moto.fotos[0]);
                          }}
                          className="p-1.5 bg-black/70 hover:bg-[#FF4D00] text-white hover:text-black rounded-lg transition-all"
                          title="Zoom"
                        >
                          <ZoomIn size={14} />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-zinc-300">
                        {moto.placa}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-display font-black text-xl text-white uppercase group-hover:text-[#FF4D00] transition-colors truncate">
                          {moto.marcaModelo}
                        </h4>
                        <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                          <span>{moto.anoModelo} • {moto.quilometragem}</span>
                          <span className="text-green-400 font-bold">{moto.statusRevisao || 'REVISADA'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold">À vista:</span>
                          <span className="font-display font-black text-2xl text-white">
                            {formatBRL(promoPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {onSimulateFinance && (
                          <button
                            onClick={() => onSimulateFinance(moto)}
                            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold uppercase transition-colors"
                          >
                            Simular
                          </button>
                        )}
                        <a
                          href={buildWhatsAppLink(
                            config.whatsappNumber,
                            config.whatsappMessageTemplate,
                            moto,
                            selectedCouponCode
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <MessageCircle size={14} />
                          Proposta
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* SECTION 8: ÁREA DE FINANCIAMENTO E TROCA DE MOTO */}
      <section id="financiamento" className="py-16 md:py-24 bg-[#141414] border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191919] border border-[#FF4D00]/40 rounded-full text-xs font-display font-black tracking-widest text-[#FF4D00] uppercase">
                <CreditCard size={14} /> SIMULADOR INSTANTÂNEO
              </div>
              <h2 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-white">
                FINANCIAMENTO & <span className="text-[#FF4D00]">TROCA DE MOTO.</span>
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Aprovação ágil com os principais bancos: Santander, BV, Pan, Bradesco e Itaú. Parcelamos a sua entrada em até 24x no cartão e pegamos a sua moto usada como parte do pagamento.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 size={16} className="text-[#FF4D00]" />
                  <span>Sem burocracia: aprovação em até 30 minutos</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 size={16} className="text-[#FF4D00]" />
                  <span>Aceitamos autônomos e primeira habilitação</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 size={16} className="text-[#FF4D00]" />
                  <span>Opções de financiamento com zero de entrada</span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Box */}
            <div className="lg:col-span-7 bg-[#191919] border border-[#262626] p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
              <h3 className="font-display font-black text-2xl uppercase text-white tracking-wide border-b border-zinc-800 pb-3 flex items-center justify-between">
                <span>Simule Agora sua Parcela</span>
                <span className="text-xs text-[#FF4D00] font-sans font-bold">Black Friday Taxas Reduzidas</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Valor da Moto Desejada (R$)
                  </label>
                  <input
                    type="number"
                    value={simMotoValue}
                    onChange={(e) => setSimMotoValue(Math.max(1000, Number(e.target.value)))}
                    className="w-full p-3 bg-black border border-zinc-800 rounded-xl text-white font-display font-black text-xl focus:border-[#FF4D00] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Valor da Entrada (R$)
                  </label>
                  <input
                    type="number"
                    value={simDownPayment}
                    onChange={(e) => setSimDownPayment(Math.max(0, Number(e.target.value)))}
                    className="w-full p-3 bg-black border border-zinc-800 rounded-xl text-white font-display font-black text-xl focus:border-[#FF4D00] outline-none"
                  />
                </div>
              </div>

              {/* Installments selector */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Prazo de Financiamento:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSimInstallments(term)}
                      className={`py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
                        simInstallments === term 
                          ? 'bg-[#FF4D00] text-black shadow-lg scale-105' 
                          : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {term}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade-in checkbox */}
              <div className="p-4 bg-black/60 border border-zinc-800 rounded-xl space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simHasTradeIn}
                    onChange={(e) => setSimHasTradeIn(e.target.checked)}
                    className="w-4 h-4 text-[#FF4D00] accent-[#FF4D00] rounded"
                  />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Desejo dar minha moto atual na troca
                  </span>
                </label>

                {simHasTradeIn && (
                  <input
                    type="text"
                    placeholder="Qual o modelo, ano e km da sua moto usada?"
                    value={simTradeInModel}
                    onChange={(e) => setSimTradeInModel(e.target.value)}
                    className="w-full p-2.5 bg-[#191919] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-[#FF4D00] outline-none"
                  />
                )}
              </div>

              {/* Results & WhatsApp Send */}
              <div className="bg-[#141414] border border-[#FF4D00]/40 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                    Parcela Estimada:
                  </span>
                  <div className="font-display font-black text-3xl md:text-4xl text-[#FF4D00]">
                    {simInstallments}x de {formatBRL(estimatedInstallment)}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    *Sujeito à análise de crédito do CPF
                  </span>
                </div>

                <a
                  href={`https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá! Gostaria de simular o financiamento na Black Friday da Franklin Motos:\n- Valor da Moto: ${formatBRL(simMotoValue)}\n- Entrada: ${formatBRL(simDownPayment)}\n- Prazo: ${simInstallments}x de ~${formatBRL(estimatedInstallment)}${simHasTradeIn ? `\n- Moto na Troca: ${simTradeInModel || 'Sim'}` : ''}\n- Cupom: ${selectedCouponCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-base uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,77,0,0.3)] flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  ENVIAR SIMULAÇÃO
                </a>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* SECTION 9: DESTAQUE DE OPORTUNIDADES ESPECIAIS (FLASH DEALS / COMBOS) */}
      <section className="py-16 md:py-20 border-b border-[#262626] bg-gradient-to-r from-black via-[#141414] to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-r from-[#191919] via-[#1f120c] to-[#191919] border border-[#FF4D00]/50 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF4D00]/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF4D00] text-black rounded-md text-xs font-display font-black uppercase tracking-wider">
                  COMBO ACELERAÇÃO BLACK
                </div>
                <h3 className="font-display font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-white">
                  FECHOU NA BLACK? LEVE O PACOTE VIP COMPLETO.
                </h3>
                <p className="text-zinc-300 text-sm md:text-base leading-relaxed max-w-2xl">
                  Ao garantir sua motocicleta durante a campanha, você recebe gratuitamente: 
                  <strong> Laudo Cautelar 100% aprovado</strong>, <strong>1º Tanque Cheio</strong>, 
                  <strong>Capacete Novo Certificado</strong> e <strong>Revisão de Entrega</strong>.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold text-zinc-300">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-[#FF4D00]" /> Economia de mais de R$ 900</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-[#FF4D00]" /> Saia rodando no mesmo dia</span>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-6 bg-black/60 border border-[#262626] rounded-2xl space-y-3">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
                  Disponibilidade:
                </span>
                <span className="font-display font-black text-3xl text-[#FF4D00]">
                  LOTE LIMITADO
                </span>
                <p className="text-[11px] text-zinc-400">
                  Válido apenas enquanto durarem os cupons ativos no sistema.
                </p>
                <a
                  href={buildWhatsAppLink(
                    config.whatsappNumber,
                    config.whatsappMessageTemplate,
                    featuredMoto,
                    'ACELERABLACK'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg"
                >
                  RESERVAR COMBO VIP
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 10: DEPOIMENTOS REAIS E INFORMAÇÕES DE CONFIANÇA */}
      <section className="py-16 md:py-24 bg-[#141414] border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191919] border border-[#FF4D00]/40 rounded-full text-xs font-display font-black tracking-widest text-[#FF4D00] uppercase">
              <Award size={14} /> AUTORIDADE EM FORTALEZA
            </div>
            <h2 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-white">
              QUEM COMPRA NA FRANKLIN <span className="text-[#FF4D00]">RECOMENDA.</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
              Mais de uma década de tradição com loja física própria, oficina especializada e milhares de clientes satisfeitos.
            </p>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#191919] border border-[#262626] p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-1 text-[#FF4D00]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                "Comprei minha NMAX com o Franklin na Black Friday do ano passado e foi a melhor decisão. Moto impecável, revisão de primeira e o DUT saiu sem eu ter nenhuma dor de cabeça."
              </p>
              <div className="pt-2 border-t border-zinc-800">
                <span className="font-display font-black text-white text-base block uppercase">
                  Rodrigo Silva Albuquerque
                </span>
                <span className="text-xs text-zinc-500">Cliente NMAX 160 • Fortaleza</span>
              </div>
            </div>

            <div className="bg-[#191919] border border-[#262626] p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-1 text-[#FF4D00]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                "Financiamento aprovado em menos de 20 minutos com taxa excelente pelo banco. Pegaram minha Fan na troca com avaliação muito honesta. Recomendo de olhos fechados!"
              </p>
              <div className="pt-2 border-t border-zinc-800">
                <span className="font-display font-black text-white text-base block uppercase">
                  Marcos Vinícius Santos
                </span>
                <span className="text-xs text-zinc-500">Cliente PCX 150 • Caucaia</span>
              </div>
            </div>

            <div className="bg-[#191919] border border-[#262626] p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-1 text-[#FF4D00]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                "O que me conquistou foi a transparência do histórico da moto e a garantia de 6 meses real da oficina. Atendimento impecável pelo WhatsApp."
              </p>
              <div className="pt-2 border-t border-zinc-800">
                <span className="font-display font-black text-white text-base block uppercase">
                  Camila Peixoto Costa
                </span>
                <span className="text-xs text-zinc-500">Cliente Honda Elite 125 • Fortaleza</span>
              </div>
            </div>

          </div>

          {/* Trust stats counter strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-[#191919] border border-[#262626] rounded-xl">
              <span className="font-display font-black text-3xl md:text-4xl text-[#FF4D00] block">
                +3.500
              </span>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
                Motos Entregues
              </span>
            </div>

            <div className="p-4 bg-[#191919] border border-[#262626] rounded-xl">
              <span className="font-display font-black text-3xl md:text-4xl text-white block">
                4.9 ★
              </span>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
                Avaliação no Google
              </span>
            </div>

            <div className="p-4 bg-[#191919] border border-[#262626] rounded-xl">
              <span className="font-display font-black text-3xl md:text-4xl text-[#FF4D00] block">
                10+ Anos
              </span>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
                Tradição no Mercado
              </span>
            </div>

            <div className="p-4 bg-[#191919] border border-[#262626] rounded-xl">
              <span className="font-display font-black text-3xl md:text-4xl text-white block">
                100%
              </span>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">
                Estoque Inspecionado
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 11: CHAMADA FINAL PARA ATENDIMENTO VIA WHATSAPP */}
      <section className="py-16 md:py-24 border-b border-[#262626] text-center relative overflow-hidden bg-gradient-to-b from-[#080808] to-[#141414]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          
          <div className="w-16 h-16 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center mx-auto border border-[#FF4D00]/30 shadow-[0_0_25px_rgba(255,77,0,0.3)]">
            <Flame size={32} />
          </div>

          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white leading-tight">
            NÃO ESPERE O ESTOQUE <span className="text-[#FF4D00]">ACABAR.</span>
          </h2>

          <p className="text-zinc-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            As ofertas da <strong>Franklin Black</strong> possuem quantidade limitada de motos e cupons ativos. Fale agora mesmo com nossos consultores de plantão e receba sua proposta personalizada em minutos.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={buildWhatsAppLink(
                config.whatsappNumber,
                config.whatsappMessageTemplate,
                featuredMoto,
                selectedCouponCode
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBlackFridayEvent('click_final_whatsapp')}
              className="w-full sm:w-auto px-8 py-5 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-xl uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_35px_rgba(255,77,0,0.45)] flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
            >
              <MessageCircle size={24} className="text-black" />
              FALAR COM VENDEDOR NO WHATSAPP
            </a>
          </div>

          <p className="text-xs text-zinc-500 pt-2">
            Atendimento imediato pelo WhatsApp: (85) 3233-2200 • Av. Carneiro de Mendonça 1606, Fortaleza/CE
          </p>
        </div>
      </section>

      {/* SECTION 12: RODAPÉ COM INFORMAÇÕES DA EMPRESA E REGULAMENTO */}
      <footer className="bg-black py-12 border-t border-[#262626] text-zinc-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Brand Info */}
            <div className="space-y-3">
              <img src="/logo.png" alt="Franklin Motos" className="h-8 w-auto object-contain" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Franklin Motos — A maior referência em compra, venda, troca e manutenção especializada de motocicletas e scooters de Fortaleza.
              </p>
              <div className="text-xs text-zinc-400 space-y-1">
                <p><strong>CNPJ:</strong> 08.967.579/0001-78</p>
                <p><strong>Endereço:</strong> Av. Carneiro de Mendonça, 1606 - Demócrito Rocha, Fortaleza - CE</p>
                <p><strong>Telefone / WhatsApp:</strong> (85) 3233-2200</p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">
                Navegação Rápida
              </h4>
              <ul className="space-y-2">
                <li><a href="#ofertas" className="hover:text-[#FF4D00] transition-colors">Ofertas Black Friday</a></li>
                <li><a href="#cupons" className="hover:text-[#FF4D00] transition-colors">Central de Cupons</a></li>
                <li><a href="#catalogo" className="hover:text-[#FF4D00] transition-colors">Catálogo de Motos</a></li>
                <li><a href="#financiamento" className="hover:text-[#FF4D00] transition-colors">Simulador de Financiamento</a></li>
                <li><button onClick={() => navigate('/oficina')} className="hover:text-[#FF4D00] transition-colors">Oficina Especializada Scooter</button></li>
                <li><button onClick={() => navigate('/acessorios')} className="hover:text-[#FF4D00] transition-colors">Peças & Acessórios</button></li>
              </ul>
            </div>

            {/* Horário & Atendimento */}
            <div>
              <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">
                Horário de Atendimento
              </h4>
              <ul className="space-y-1.5 text-zinc-400">
                <li>Segunda a Sexta: 08:00 às 18:00</li>
                <li>Sábado: 08:00 às 13:00</li>
                <li>Domingo: Fechado (Atendimento WhatsApp sob plantão)</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-zinc-900">
                <span className="text-[11px] text-zinc-500 block">
                  Financiamento sujeito à análise cadastral e aprovação de crédito pelas instituições financeiras parceiras.
                </span>
              </div>
            </div>

            {/* Regulamento Black Friday */}
            <div>
              <h4 className="font-display font-black text-white uppercase tracking-wider text-sm mb-3">
                Regulamento da Campanha
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Campanha válida até {new Date(targetDate).toLocaleDateString('pt-BR')} ou até o término do estoque promocional. Os descontos e cupons não são cumulativos com outras ofertas institucionais. Fotos reais dos veículos presentes no pátio da loja. Valores e condições podem sofrer alteração sem aviso prévio.
              </p>
            </div>

          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
            <p>© {new Date().getFullYear()} Franklin Motos. Todos os direitos reservados.</p>
            <p>FRANKLIN BLACK — O PREÇO CAIU. A CHANCE ACELEROU.</p>
          </div>

        </div>
      </footer>

      {/* MOBILE STICKY CTA AT THE BOTTOM (Viewport cap <= 15%) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 border-t border-[#FF4D00]/50 p-2.5 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase text-[#FF4D00] block truncate">
            🔥 BLACK FRIDAY FRANKLIN
          </span>
          <span className="text-xs font-display font-black text-white block truncate">
            {featuredMoto ? featuredMoto.marcaModelo : 'GARANTA SUA OFERTA'}
          </span>
        </div>

        <a
          href={buildWhatsAppLink(
            config.whatsappNumber,
            config.whatsappMessageTemplate,
            featuredMoto,
            selectedCouponCode
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBlackFridayEvent('click_mobile_sticky_whatsapp')}
          className="px-4 py-2.5 bg-[#FF4D00] hover:bg-[#e04400] text-black font-display font-black text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5 shrink-0"
        >
          <MessageCircle size={16} />
          NEGOCIAR AGORA
        </a>
      </div>

      {/* FULLSCREEN IMAGE ZOOM LIGHTBOX */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => {
              setZoomedImage(null);
              setZoomScale(1);
            }}
          >
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomScale(prev => Math.min(prev + 0.3, 3));
                }}
                className="p-2.5 bg-zinc-900 border border-zinc-800 text-white hover:text-[#FF4D00] rounded-xl transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomScale(prev => Math.max(prev - 0.3, 1));
                }}
                className="p-2.5 bg-zinc-900 border border-zinc-800 text-white hover:text-[#FF4D00] rounded-xl transition-colors"
                title="Diminuir Zoom"
              >
                <ZoomIn size={20} className="rotate-180" />
              </button>
              <button
                onClick={() => {
                  setZoomedImage(null);
                  setZoomScale(1);
                }}
                className="p-2.5 bg-zinc-900 border border-zinc-800 text-white hover:text-red-500 rounded-xl transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div 
              className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                src={zoomedImage}
                alt="Foto Ampliada"
                style={{ scale: zoomScale }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="max-w-full max-h-full object-contain rounded-xl select-none"
              />
            </div>

            <div className="absolute bottom-6 text-center text-xs text-zinc-400">
              Use os botões de zoom ou clique fora para fechar a visualização
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
