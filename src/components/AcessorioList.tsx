import React, { useState, useMemo } from 'react';
import { Acessorio } from '../types';
import { Plus, Edit, Trash2, Tag, ChevronLeft, ChevronRight, PackageOpen, ShoppingCart, Search, Filter, ArrowUpDown, ChevronDown, Archive, ArchiveRestore, X } from 'lucide-react';

interface AcessorioListProps {
  acessorios: Acessorio[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (acessorio: Acessorio) => void;
  onDelete: (id: string) => void;
  onAddToCart: (acessorio: Acessorio) => void;
  onToggleArchive?: (acessorio: Acessorio) => void;
  onAddStock?: (acessorio: Acessorio) => void;
}

export default function AcessorioList({ acessorios, isAdmin, onAdd, onEdit, onDelete, onAddToCart, onToggleArchive, onAddStock }: AcessorioListProps) {
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
  const [acessorioToDelete, setAcessorioToDelete] = useState<string | null>(null);
  const [acessorioToAddStock, setAcessorioToAddStock] = useState<Acessorio | null>(null);
  const [acessorioDetails, setAcessorioDetails] = useState<Acessorio | null>(null);
  const [stockToAdd, setStockToAdd] = useState<string>('');
  
  // Filters and Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAplicacao, setFilterAplicacao] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [adminTab, setAdminTab] = useState<'ativos' | 'arquivados' | 'zerados'>('ativos');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const nextImage = (e: React.MouseEvent, acessorioId: string, maxImages: number) => {
    e.stopPropagation();
    setCurrentImageIndices(prev => ({
      ...prev,
      [acessorioId]: ((prev[acessorioId] || 0) + 1) % maxImages
    }));
  };

  const prevImage = (e: React.MouseEvent, acessorioId: string, maxImages: number) => {
    e.stopPropagation();
    setCurrentImageIndices(prev => ({
      ...prev,
      [acessorioId]: ((prev[acessorioId] || 0) - 1 + maxImages) % maxImages
    }));
  };

  const confirmDelete = () => {
    if (acessorioToDelete) {
      onDelete(acessorioToDelete);
      setAcessorioToDelete(null);
    }
  };

  const confirmAddStock = () => {
    if (acessorioToAddStock && onAddStock) {
      const quantity = parseInt(stockToAdd, 10);
      if (!isNaN(quantity) && quantity > 0) {
        onAddStock({ ...acessorioToAddStock, estoque: quantity }); // We pass the quantity in the estoque field temporarily for the handler
        setAcessorioToAddStock(null);
        setStockToAdd('');
      }
    }
  };

  // Extract unique applications for the filter dropdown
  const aplicacoes = useMemo(() => {
    const apps = new Set(acessorios.filter(a => !a.isArchived).map(a => a.aplicacao).filter(Boolean));
    return Array.from(apps).sort();
  }, [acessorios]);

  // Filter and Sort Logic
  const filteredAndSortedAcessorios = useMemo(() => {
    let result = [...acessorios];

    if (isAdmin) {
      if (adminTab === 'ativos') {
        result = result.filter(a => !a.isArchived && a.estoque > 0);
      } else if (adminTab === 'arquivados') {
        result = result.filter(a => a.isArchived);
      } else if (adminTab === 'zerados') {
        result = result.filter(a => !a.isArchived && a.estoque === 0);
      }
    } else {
      result = result.filter(a => !a.isArchived && a.estoque > 0);
    }

    // Search Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.nome.toLowerCase().includes(lowerSearch) || 
        a.descricao.toLowerCase().includes(lowerSearch) ||
        a.aplicacao.toLowerCase().includes(lowerSearch) ||
        (a.tags && a.tags.some(tag => tag.toLowerCase().includes(lowerSearch)))
      );
    }

    // Application Filter
    if (filterAplicacao !== 'all') {
      result = result.filter(a => a.aplicacao === filterAplicacao);
    }

    // Category Filter
    if (filterCategoria !== 'all') {
      result = result.filter(a => a.categoria === filterCategoria);
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = a.emPromocao && a.precoPromocional ? a.precoPromocional : a.preco;
      const priceB = b.emPromocao && b.precoPromocional ? b.precoPromocional : b.preco;

      if (sortBy === 'price_asc') {
        return priceA - priceB;
      } else if (sortBy === 'price_desc') {
        return priceB - priceA;
      } else {
        // relevance: promoções primeiro, depois por nome
        if (a.emPromocao && !b.emPromocao) return -1;
        if (!a.emPromocao && b.emPromocao) return 1;
        return a.nome.localeCompare(b.nome);
      }
    });

    return result;
  }, [acessorios, searchTerm, filterAplicacao, filterCategoria, sortBy, adminTab, isAdmin]);

  if (acessorios.length === 0 && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-orange-600/10 rounded-full flex items-center justify-center mb-6">
          <PackageOpen size={48} className="text-orange-500" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
          Nenhum Acessório
        </h2>
        <p className="text-zinc-400 text-lg max-w-md">
          A nossa seção de acessórios estará disponível em breve. Fique ligado!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Tag className="text-orange-500" size={32} />
            Acessórios
          </h2>
          <p className="text-zinc-400 text-sm mt-1 font-bold">Equipe sua moto com os melhores acessórios</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={onAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-black px-6 py-3 rounded-xl font-black transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(234,88,12,0.3)]"
          >
            <Plus size={20} />
            Novo Acessório
          </button>
        )}
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategoria('all')}
          className={`px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs transition-all ${
            filterCategoria === 'all'
              ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
          }`}
        >
          Todos
        </button>
        {['Peças Motor', 'Peças Elétricas', 'Carenagem', 'Acessórios', 'Capacetes'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategoria(cat)}
            className={`px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs transition-all ${
              filterCategoria === cat
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setAdminTab('ativos')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-all ${
              adminTab === 'ativos' 
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setAdminTab('arquivados')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-all ${
              adminTab === 'arquivados' 
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            Arquivados
          </button>
          <button
            onClick={() => setAdminTab('zerados')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-all ${
              adminTab === 'zerados' 
                ? 'bg-orange-600 text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            Zerados
          </button>
        </div>
      )}

      {/* Filters and Sorting Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Buscar acessórios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <select
              value={filterAplicacao}
              onChange={(e) => setFilterAplicacao(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium appearance-none"
            >
              <option value="all">Todas as Aplicações</option>
              {aplicacoes.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
          </div>

          <div className="relative min-w-[200px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium appearance-none"
            >
              <option value="relevance">Relevância</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedAcessorios.map((acessorio) => {
          const currentImageIndex = currentImageIndices[acessorio.id] || 0;
          
          return (
            <div 
              key={acessorio.id} 
              className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-orange-500/50 transition-all group flex flex-col h-full cursor-pointer"
              onClick={() => setAcessorioDetails(acessorio)}
            >
              {/* Image Gallery */}
              <div className="relative aspect-square bg-zinc-950 overflow-hidden">
                {acessorio.emPromocao && (
                  <div className="absolute top-4 left-4 z-10 bg-orange-600 text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Promoção
                  </div>
                )}
                
                {acessorio.fotos.length > 0 ? (
                  <>
                    <img 
                      src={acessorio.fotos[currentImageIndex]} 
                      alt={acessorio.nome}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {acessorio.fotos.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => prevImage(e, acessorio.id, acessorio.fotos.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={(e) => nextImage(e, acessorio.id, acessorio.fotos.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {acessorio.fotos.map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-orange-500 w-3' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Tag size={48} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1 line-clamp-2">{acessorio.nome}</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">Para: {acessorio.aplicacao}</p>
                
                <p className="text-sm text-zinc-400 line-clamp-3 mb-4 flex-1">{acessorio.descricao}</p>
                
                <div className="mt-auto pt-4 border-t border-zinc-800">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Valor</span>
                      {acessorio.emPromocao && acessorio.precoPromocional ? (
                        <>
                          <span className="block text-zinc-500 line-through text-xs font-bold mb-0.5">
                            {formatCurrency(acessorio.preco)}
                          </span>
                          <span className="text-2xl font-black text-orange-500">
                            {formatCurrency(acessorio.precoPromocional)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-black text-white">
                          {formatCurrency(acessorio.preco)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="block text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Estoque</span>
                      <span className={`text-sm font-bold ${acessorio.estoque > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {acessorio.estoque > 0 ? `${acessorio.estoque} un.` : 'Esgotado'}
                      </span>
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAddStock && onAddStock(acessorio)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider"
                        >
                          <Plus size={14} /> Estoque
                        </button>
                        <button
                          onClick={() => onEdit(acessorio)}
                          className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider"
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onToggleArchive && onToggleArchive(acessorio)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider ${
                            acessorio.isArchived 
                              ? 'bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white' 
                              : 'bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white'
                          }`}
                        >
                          {acessorio.isArchived ? <><ArchiveRestore size={14} /> Reativar</> : <><Archive size={14} /> Arquivar</>}
                        </button>
                        <button
                          onClick={() => setAcessorioToDelete(acessorio.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAddToCart(acessorio)}
                        disabled={acessorio.estoque === 0}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black py-3 rounded-xl font-black transition-colors uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                      >
                        <ShoppingCart size={16} />
                        {acessorio.estoque > 0 ? 'Adicionar ao Carrinho' : 'Esgotado'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredAndSortedAcessorios.length === 0 && acessorios.length > 0 && (
        <div className="py-12 text-center text-zinc-500">
          Nenhum acessório encontrado com os filtros atuais.
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {acessorioToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Excluir Acessório</h3>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja excluir este acessório? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAcessorioToDelete(null)}
                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {acessorioToAddStock && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Adicionar Estoque</h3>
            <p className="text-zinc-400 mb-4">
              Quantas unidades deseja adicionar ao estoque de <strong>{acessorioToAddStock.nome}</strong>?
            </p>
            <input
              type="number"
              min="1"
              value={stockToAdd}
              onChange={(e) => setStockToAdd(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors mb-6 font-bold"
              placeholder="Ex: 5"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAcessorioToAddStock(null);
                  setStockToAdd('');
                }}
                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAddStock}
                disabled={!stockToAdd || parseInt(stockToAdd, 10) <= 0}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {acessorioDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-200 my-8 flex flex-col md:flex-row overflow-hidden relative">
            <button 
              onClick={() => setAcessorioDetails(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X size={20} />
            </button>
            
            {/* Image Section */}
            <div className="w-full md:w-1/2 bg-zinc-950 relative aspect-square md:aspect-auto flex items-center justify-center">
              {acessorioDetails.emPromocao && (
                <div className="absolute top-4 left-4 z-10 bg-orange-600 text-black text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                  Promoção
                </div>
              )}
              {acessorioDetails.fotos.length > 0 ? (
                <>
                  <img 
                    src={acessorioDetails.fotos[currentImageIndices[acessorioDetails.id] || 0]} 
                    alt={acessorioDetails.nome}
                    className="w-full h-full object-cover"
                  />
                  {acessorioDetails.fotos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => prevImage(e, acessorioDetails.id, acessorioDetails.fotos.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-sm transition-all"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={(e) => nextImage(e, acessorioDetails.id, acessorioDetails.fotos.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-sm transition-all"
                      >
                        <ChevronRight size={24} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {acessorioDetails.fotos.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`w-2 h-2 rounded-full transition-all ${idx === (currentImageIndices[acessorioDetails.id] || 0) ? 'bg-orange-500 w-4' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Tag size={64} className="text-zinc-700" />
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
              {acessorioDetails.categoria && (
                <span className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2 block">
                  {acessorioDetails.categoria}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
                {acessorioDetails.nome}
              </h2>
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-wider mb-6 pb-6 border-b border-zinc-800">
                Compatível com: <span className="text-white">{acessorioDetails.aplicacao}</span>
              </p>

              <div className="prose prose-invert prose-sm max-w-none mb-8">
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{acessorioDetails.descricao}</p>
              </div>

              {acessorioDetails.tags && acessorioDetails.tags.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {acessorioDetails.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-zinc-800">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="block text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Valor Unitário</span>
                    {acessorioDetails.emPromocao && acessorioDetails.precoPromocional ? (
                      <>
                        <span className="block text-zinc-500 line-through text-sm font-bold mb-1">
                          {formatCurrency(acessorioDetails.preco)}
                        </span>
                        <span className="text-4xl font-black text-orange-500">
                          {formatCurrency(acessorioDetails.precoPromocional)}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-black text-white">
                        {formatCurrency(acessorioDetails.preco)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Disponibilidade</span>
                    <span className={`text-lg font-bold ${acessorioDetails.estoque > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {acessorioDetails.estoque > 0 ? `${acessorioDetails.estoque} em estoque` : 'Esgotado'}
                    </span>
                  </div>
                </div>

                {!isAdmin && (
                  <button
                    onClick={() => {
                      onAddToCart(acessorioDetails);
                      setAcessorioDetails(null);
                    }}
                    disabled={acessorioDetails.estoque === 0}
                    className="w-full flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black py-4 rounded-xl font-black transition-all uppercase tracking-wider shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] disabled:shadow-none"
                  >
                    <ShoppingCart size={20} />
                    {acessorioDetails.estoque > 0 ? 'Adicionar ao Carrinho' : 'Produto Esgotado'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
