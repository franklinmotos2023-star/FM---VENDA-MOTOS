import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  History, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  Zap, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  ArrowRight, 
  Construction, 
  ChevronRight, 
  Disc, 
  Flame, 
  Sparkles, 
  Compass, 
  MessageSquare,
  HelpCircle,
  FileText,
  Search,
  Check
} from 'lucide-react';

const ScooterSilhouetteIcon = ({ size = 28, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.6" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M18 14 l-3 -8" />
    <path d="M14 6 h3" />
    <path d="M16.5 11.5 c-1 1 -2 2 -3 2 h-3.5 l-2 -2.5 H5.5 c-1 0 -2.5 1 -2.5 2.5 V15" />
    <path d="M5.5 9 h4.5 l1 2" />
    <path d="M9 17 H6" />
    <path d="M16 6 a1 1 0 0 1 2 1" />
  </svg>
);

interface OficinaAreaProps {
  initialSubTab?: 'historia' | 'scooters' | 'servicos' | 'manutencao';
  onNavigateHome?: () => void;
}

export default function OficinaArea({ initialSubTab = 'historia', onNavigateHome }: OficinaAreaProps) {
  const [activeTab, setActiveTab] = useState<'historia' | 'scooters' | 'servicos' | 'manutencao'>(initialSubTab);

  const whatsappOficinaUrl = "https://wa.me/558532332200?text=" + encodeURIComponent("Olá, equipe da Oficina Franklin Motos! Gostaria de tirar uma dúvida e solicitar informações sobre manutenção/revisão para minha moto/scooter.");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 border border-zinc-800 p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <img src="/logo.png" alt="Franklin Motos" className="h-7 md:h-8 w-auto object-contain" />
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-600/10 border border-orange-600/30 text-orange-500 text-xs font-black uppercase tracking-widest">
                <Wrench size={14} /> Centro Automotivo de 2 Rodas
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
              Área <span className="text-orange-600">Oficina</span> Franklin Motos
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Referência em manutenção preventiva e corretiva em Fortaleza. Especialistas apaixonados por scooters e motos urbanas, com transparência total e peças de alta qualidade.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('manutencao')}
              className="px-5 py-3.5 bg-zinc-900 border border-orange-500/40 hover:border-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-600/20 transition-all group"
            >
              <Construction size={16} className="text-orange-500 group-hover:rotate-12 transition-transform" />
              <span>Agendamento & Acompanhamento</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 text-[10px] font-extrabold ml-1">
                Em Manutenção
              </span>
            </button>
            <a
              href={whatsappOficinaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all"
            >
              <Phone size={16} />
              <span>Falar c/ Oficina WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-8 border-t border-zinc-800/80 mt-8 scrollbar-none">
          <button
            onClick={() => setActiveTab('historia')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'historia'
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
            }`}
          >
            <History size={16} />
            <span>Nossa História</span>
          </button>

          <button
            onClick={() => setActiveTab('scooters')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'scooters'
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
            }`}
          >
            <ScooterSilhouetteIcon size={18} />
            <span>Especialistas em Scooters</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'servicos'
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
            }`}
          >
            <Wrench size={16} />
            <span>Serviços & Revisões</span>
          </button>

          <button
            onClick={() => setActiveTab('manutencao')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap relative ${
              activeTab === 'manutencao'
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                : 'bg-zinc-900/80 text-orange-400 hover:text-white hover:bg-zinc-800 border border-orange-500/30'
            }`}
          >
            <Construction size={16} />
            <span>Agendamento & Acompanhamento</span>
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {/* TAB 1: HISTÓRIA DA FRANKLIN MOTOS */}
        {activeTab === 'historia' && (
          <motion.div
            key="tab-historia"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Story Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Story Narrative */}
              <div className="lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl border border-orange-600/20">
                    <Compass size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                      A Trajetória da Franklin Motos
                    </h2>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      De Fortaleza para os apaixonados por liberdade em duas rodas
                    </span>
                  </div>
                </div>

                <div className="space-y-4 text-zinc-300 text-sm md:text-base leading-relaxed">
                  <p>
                    A <strong className="text-white font-bold">Franklin Motos</strong> nasceu de um ideal muito claro: transformar a experiência de quem pilota em Fortaleza. Por muitos anos, comprar uma moto seminova ou levar para uma oficina mecânica tradicional era sinônimo de incerteza, orçamentos abusivos e surpresas desagradáveis com peças e documentação.
                  </p>
                  <p>
                    Iniciamos nossas operações com um rigoroso processo de seleção de veículos. Cada moto que entrava em nosso catálogo passava por uma revisão completa de motor, transmissão, suspensão e freios, além da garantia de procedência com <strong className="text-orange-400">DUT incluso e transferência imediata</strong>.
                  </p>
                  <p>
                    Com o tempo, os próprios clientes começaram a pedir: <em className="text-zinc-200">"Vocês não fazem a manutenção da minha moto também quando precisar?"</em>. A confiança era tão alta que a criação da nossa oficina própria foi o caminho natural.
                  </p>
                  <p>
                    Hoje, a <strong className="text-white">Oficina Franklin Motos</strong> é referência no Ceará, especialmente no segmento de <strong className="text-orange-500 font-bold">scooters automáticas</strong> — veículos modernos que exigem conhecimento técnico apurado, ferramentas de precisão e insumos específicos que oficinas comuns desconhecem.
                  </p>
                </div>

                {/* Direct Quote / Motto */}
                <div className="p-5 rounded-2xl bg-black/60 border border-zinc-800/80 flex items-start gap-4">
                  <div className="w-1.5 self-stretch bg-orange-600 rounded-full shrink-0" />
                  <p className="text-sm italic text-zinc-300">
                    "Aqui nós não trocamos peças que ainda estão boas e nunca empurramos serviços desnecessários. Tratamos cada scooter e moto como se fosse para nós mesmos colocarmos na rodovia."
                    <span className="block mt-2 font-bold not-italic text-xs uppercase tracking-wider text-orange-500">
                      — Franklin & Equipe Técnica
                    </span>
                  </p>
                </div>
              </div>

              {/* Pillars Sidebar */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={18} className="text-orange-500" />
                    Nossos 4 Pilares
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-black/40 rounded-xl border border-zinc-800/60 space-y-1">
                      <div className="text-xs font-black uppercase text-orange-500 flex items-center gap-1.5">
                        <Check size={14} /> 1. Transparência Total
                      </div>
                      <p className="text-xs text-zinc-400">
                        O cliente acompanha as peças antigas substituídas e recebe fotos detalhadas do serviço.
                      </p>
                    </div>

                    <div className="p-3.5 bg-black/40 rounded-xl border border-zinc-800/60 space-y-1">
                      <div className="text-xs font-black uppercase text-orange-500 flex items-center gap-1.5">
                        <Check size={14} /> 2. Ferramental Adequado
                      </div>
                      <p className="text-xs text-zinc-400">
                        Torquímetros e sacadores apropriados para não espanar porcas ou empenar polias do CVT.
                      </p>
                    </div>

                    <div className="p-3.5 bg-black/40 rounded-xl border border-zinc-800/60 space-y-1">
                      <div className="text-xs font-black uppercase text-orange-500 flex items-center gap-1.5">
                        <Check size={14} /> 3. Peças de 1ª Linha
                      </div>
                      <p className="text-xs text-zinc-400">
                        Apenas correias homologadas, roletes de alta durabilidade e lubrificantes com especificação exata.
                      </p>
                    </div>

                    <div className="p-3.5 bg-black/40 rounded-xl border border-zinc-800/60 space-y-1">
                      <div className="text-xs font-black uppercase text-orange-500 flex items-center gap-1.5">
                        <Check size={14} /> 4. Honestidade e Preço Justo
                      </div>
                      <p className="text-xs text-zinc-400">
                        Sem taxa surpresa. Você autoriza o orçamento antes de iniciarmos qualquer intervenção mecânica.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Card */}
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Localização & Atendimento</h4>
                      <p className="text-xs text-zinc-400">Fortaleza - CE</p>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1.5 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span>Segunda a Sexta:</span>
                      <strong className="text-zinc-200 font-bold">08:00 às 17:30</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sábado:</span>
                      <strong className="text-zinc-200 font-bold">08:00 às 12:00</strong>
                    </div>
                  </div>
                  <a
                    href={whatsappOficinaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-zinc-800 hover:bg-orange-600 hover:text-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Como Chegar / Informações</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EXPLICAÇÃO SOBRE SCOOTERS */}
        {activeTab === 'scooters' && (
          <motion.div
            key="tab-scooters"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Introductory Banner */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black text-orange-500 uppercase tracking-widest">
                    Guia Técnico & Curiosidades
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mt-1">
                    Por Que Scooters Exigem Mecânica Especializada?
                  </h2>
                </div>
                <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl border border-orange-600/20 self-start md:self-auto">
                  <ScooterSilhouetteIcon size={32} />
                </div>
              </div>
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                As scooters conquistaram as ruas pela praticidade: não têm pedal de marcha nem manete de embreagem, possuem porta-objetos sob o banco e proteção contra respingos. Porém, <strong className="text-white">por baixo das carenagens existe uma engenharia completamente diferente</strong> das motos comuns de marcha (CG, Factor, etc.).
              </p>
            </div>

            {/* Technical Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: CVT */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-orange-500/40 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-500 flex items-center justify-center border border-orange-600/20 group-hover:scale-110 transition-transform">
                  <Disc size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    1. A Transmissão CVT
                  </h3>
                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                    Sem corrente, coroa ou marcha manual
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  O CVT utiliza uma polia motora dianteira com <strong>roletes centrífugos</strong>, uma <strong>correia dentada em V</strong> e uma polia secundária com <strong>embreagem a seco</strong>. Conforme o motor acelera, a força centrífuga expande as polias continuamente, alterando a relação de forma imperceptível.
                </p>
                <div className="p-3 bg-black/40 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                  <strong className="text-orange-400 font-bold block">Ponto Crítico:</strong>
                  Roletes desgastados perdem a forma cilíndrica e ficam facetados, gerando perda brusca de arrancada e trepidação. Se a correia romper em movimento, a scooter para no mesmo segundo.
                </div>
              </div>

              {/* Card 2: Óleo Correto */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-orange-500/40 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-500 flex items-center justify-center border border-orange-600/20 group-hover:scale-110 transition-transform">
                  <Flame size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    2. O Óleo Correto (JASO MB)
                  </h3>
                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                    O erro mais perigoso das oficinas comuns
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Motos convencionais usam óleo JASO MA/MA2 (com atrito específico para banhar os discos de embreagem no mesmo cárter). Como a scooter possui embreagem separada a seco no CVT, o motor precisa de <strong>óleo JASO MB</strong> (com redutores de atrito), que diminui o calor interno e economiza combustível.
                </p>
                <div className="p-3 bg-black/40 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                  <strong className="text-orange-400 font-bold block">Óleo do Câmbio Traseiro:</strong>
                  Muitos pilotos esquecem de trocar o óleo da redução traseira (engrenagens da roda), o que pode condenar todo o cubo da transmissão final.
                </div>
              </div>

              {/* Card 3: Arrefecimento e Ciclística */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-orange-500/40 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-500 flex items-center justify-center border border-orange-600/20 group-hover:scale-110 transition-transform">
                  <Gauge size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    3. Arrefecimento & Rodas
                  </h3>
                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                    Motores confinados sob a carenagem
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Por ficarem totalmente cobertos por carenagens plásticas, os motores de scooters contam com radiadores laterais ou ventiladores forçados. O aditivo de arrefecimento deve ser orgânico e estar sempre no nível correto para evitar superaquecimento no trânsito pesado de Fortaleza.
                </p>
                <div className="p-3 bg-black/40 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                  <strong className="text-orange-400 font-bold block">Atenção com Buracos:</strong>
                  Rodas de 12" e 14" sofrem mais impacto. A suspensão dianteira precisa de óleo de bengala fresco e calibragem semanal precisa.
                </div>
              </div>
            </div>

            {/* Scooters We Specialize In */}
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl border border-orange-600/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Modelos de Scooters que Atendemos com Excelência
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Temos peças de reposição rápida e ferramental específico para todas as marcas líderes:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-center">
                {[
                  { name: "Honda PCX 150 / 160", tag: "Campeã de Vendas" },
                  { name: "Yamaha NMAX 160", tag: "ABS & Conectividade" },
                  { name: "Yamaha Fluo 125", tag: "Smart Key & Start/Stop" },
                  { name: "Honda Elite 125", tag: "Econômica Urbana" },
                  { name: "Honda ADV 150", tag: "Crossover Urbana" },
                  { name: "Yamaha Neo 125", tag: "Ágil & Leve" },
                  { name: "Yamaha XMAX 250", tag: "Maxi-Scooter Premium" },
                  { name: "Dafra Citycom 300i", tag: "Conforto em Rodovia" }
                ].map((scooter, idx) => (
                  <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-orange-500/50 transition-colors">
                    <span className="font-extrabold text-white text-xs md:text-sm">{scooter.name}</span>
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">{scooter.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: SERVIÇOS & REVISÕES */}
        {activeTab === 'servicos' && (
          <motion.div
            key="tab-servicos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-3">
              <span className="text-xs font-black text-orange-500 uppercase tracking-widest">
                Catálogo de Manutenção
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                Serviços Executados na Oficina Franklin Motos
              </h2>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Todos os serviços contam com garantia de execução, peças inspecionadas e apresentação das peças substituídas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Revisão Geral Preventiva",
                  badge: "Mais Procurado",
                  desc: "Checkup detalhado de mais de 35 itens: aperto de chassi, lubrificação de cabos e eixos, teste de carga de bateria, velas, filtros e alinhamento.",
                  interval: "Recomendado a cada 5.000km ou 6 meses"
                },
                {
                  title: "Limpeza & Ajuste do CVT",
                  badge: "Especialidade Scooter",
                  desc: "Desmontagem completa da tampa do variador, desengorduramento, lixamento da campana de embreagem, conferência dos roletes e estado da correia.",
                  interval: "A cada 3.000km a 5.000km"
                },
                {
                  title: "Troca do Kit Correia & Roletes",
                  badge: "Segurança Total",
                  desc: "Substituição da correia de transmissão, conjunto de roletes com gramatura original ou de arrancada, guias da polia e molas de contraste.",
                  interval: "Conforme manual (12.000km a 20.000km)"
                },
                {
                  title: "Troca de Óleo Motor + Redução",
                  badge: "Essencial",
                  desc: "Substituição do óleo com especificação exata (JASO MB para scooters) + óleo do câmbio traseiro + arruela de vedação e checagem do filtro de tela/papel.",
                  interval: "A cada 1.500km a 3.000km"
                },
                {
                  title: "Freios (Pastilhas, Lonas & Fluido)",
                  badge: "Segurança",
                  desc: "Revisão de pinças, troca de pastilhas dianteiras e traseiras, retífica de discos quando viável, troca de lonas e sangria do fluido de freio DOT 4/5.1.",
                  interval: "Inspeção a cada 3.000km"
                },
                {
                  title: "Injeção Eletrônica & Limpeza TBI",
                  badge: "Performance & Consumo",
                  desc: "Diagnóstico com scanner eletrônico, limpeza de bico injetor por ultrassom, descarbonização do corpo de borboleta (TBI) e calibração do sensor TPS.",
                  interval: "Quando houver falha ou a cada 10.000km"
                },
                {
                  title: "Suspensão & Bengala",
                  badge: "Conforto",
                  desc: "Troca de retentores de bengala que vazam óleo, substituição do fluido hidráulico na quantidade e viscosidade recomendadas, e troca da caixa de direção.",
                  interval: "Em caso de vazamentos ou folga no guidão"
                },
                {
                  title: "Pneus & Válvulas",
                  badge: "Aderência",
                  desc: "Montagem, troca de bicos com vedação reforçada, calibragem com nitrogênio/ar e verificação de desgaste da banda de rodagem.",
                  interval: "Sempre que atingir a marca TWI"
                },
                {
                  title: "Elétrica & Baterias",
                  badge: "Confiabilidade",
                  desc: "Teste de fuga de corrente, medição da capacidade de arranque (CCA) da bateria, teste de estator e retificador de voltagem, reparos em chicotes e faróis LED.",
                  interval: "Em qualquer sintoma de partida pesada"
                }
              ].map((serv, index) => (
                <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between hover:border-orange-500/30 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-orange-600/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-600/20">
                        {serv.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      {serv.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {serv.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center gap-1.5">
                    <Clock size={13} className="text-orange-500" />
                    <span>{serv.interval}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Box */}
            <div className="bg-gradient-to-r from-orange-600/20 via-black to-zinc-900 border border-orange-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Precisa de um orçamento para a sua moto?
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-xl">
                  Mande uma mensagem com o modelo, ano e sintomas da sua moto. Nossa equipe faz uma pré-avaliação rápida e sem compromisso!
                </p>
              </div>

              <a
                href={whatsappOficinaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-orange-600 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)] whitespace-nowrap"
              >
                Solicitar Orçamento no WhatsApp
              </a>
            </div>
          </motion.div>
        )}

        {/* TAB 4: AGENDAMENTO & ACOMPANHAMENTO (EM MANUTENÇÃO) */}
        {activeTab === 'manutencao' && (
          <motion.div
            key="tab-manutencao"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Maintenance Hero Display */}
            <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-dashed border-orange-500/40 rounded-3xl p-8 md:p-14 text-center shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
              
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Animated Icon */}
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-3xl bg-orange-600/10 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(234,88,12,0.2)]"
                >
                  <Construction size={48} />
                </motion.div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    Página em Manutenção / Em Desenvolvimento
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
                    Agendamento & Acompanhamento de Serviços
                  </h2>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                    Estamos construindo um sistema digital completo para que você possa agendar suas revisões e acompanhar cada etapa do serviço da sua moto em tempo real pelo celular.
                  </p>
                </div>

                {/* Sneak Peek of Future Features */}
                <div className="bg-black/60 border border-zinc-800 rounded-2xl p-6 text-left space-y-4">
                  <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} className="text-orange-500" />
                    O que estará disponível aqui em breve:
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-2.5">
                      <Calendar size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold">Agendamento Online</strong>
                        <span className="text-zinc-400 text-[11px]">Escolha o dia, horário e serviço sem esperar em fila telefônica.</span>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-2.5">
                      <Clock size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold">Status na Bancada</strong>
                        <span className="text-zinc-400 text-[11px]">Acompanhe: Na Bancada, Aguardando Peça, Teste de Rodagem, Pronta!</span>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-2.5">
                      <FileText size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold">Aprovação com Fotos</strong>
                        <span className="text-zinc-400 text-[11px]">Veja fotos das peças desgastadas antes de autorizar qualquer troca.</span>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-2.5">
                      <History size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold">Manual Digital de Revisões</strong>
                        <span className="text-zinc-400 text-[11px]">Histórico de tudo que foi feito, valorizando sua moto na revenda.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instant Action While Under Construction */}
                <div className="pt-4 space-y-4">
                  <div className="p-4 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-xs text-orange-300">
                    💡 <strong>Precisa agendar agora mesmo?</strong> Não se preocupe! Nossa equipe de atendimento está operando normalmente via WhatsApp para marcar sua vaga ou tirar dúvidas.
                  </div>

                  <a
                    href={whatsappOficinaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-green-950/40 hover:scale-105 transition-all"
                  >
                    <MessageSquare size={18} />
                    <span>Agendar pelo WhatsApp da Oficina</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
