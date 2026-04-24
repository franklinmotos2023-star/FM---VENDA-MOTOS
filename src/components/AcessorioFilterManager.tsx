import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Plus, Trash2, Filter, GripVertical, Phone, Save } from 'lucide-react';
import { useAcessoriosConfig } from '../hooks/useAcessoriosConfig';

export default function AcessorioFilterManager() {
  const config = useAcessoriosConfig();
  const [newCategoria, setNewCategoria] = useState('');
  
  const [whatsapp, setWhatsapp] = useState(config.whatsappNumber || '');
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);

  React.useEffect(() => {
    if (config.whatsappNumber !== undefined && whatsapp === '') {
      setWhatsapp(config.whatsappNumber);
    }
  }, [config.whatsappNumber]);

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsapp(true);
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, whatsappNumber: whatsapp.replace(/\D/g, '') }, { merge: true });
    setIsSavingWhatsapp(false);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const categorias = config.categorias?.length ? config.categorias : ['Kit Transmissão', 'Peças Elétricas', 'Carenagem', 'Acessórios', 'Capacetes', 'Outros'];

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoria.trim()) return;
    const updatedCategorias = [...new Set([...categorias, newCategoria.trim()])];
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, categorias: updatedCategorias }, { merge: true });
    setNewCategoria('');
  };

  const handleRemoveCategoria = async (categoria: string) => {
    const updatedCategorias = categorias.filter(c => c !== categoria);
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, categorias: updatedCategorias }, { merge: true });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updatedCategorias = [...categorias];
      const draggedItem = updatedCategorias[draggedIndex];
      
      // Remove item and insert at new position
      updatedCategorias.splice(draggedIndex, 1);
      updatedCategorias.splice(dragOverIndex, 0, draggedItem);

      await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, categorias: updatedCategorias }, { merge: true });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">WhatsApp Comercial</h3>
                <p className="text-xs text-zinc-500 font-medium">Número para recebimento de pedidos</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveWhatsapp} className="flex gap-2">
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ex: 85999999999"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors font-medium text-sm"
            />
            <button
              type="submit"
              disabled={isSavingWhatsapp}
              className="px-6 bg-green-600 text-white font-black rounded-xl hover:bg-green-500 disabled:opacity-50 transition-all uppercase tracking-wider text-sm flex items-center justify-center"
            >
              {isSavingWhatsapp ? 'Salvando...' : <Save size={20} />}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/10 text-orange-500 rounded-xl flex items-center justify-center">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Categorias (Filtros)</h3>
              <p className="text-xs text-zinc-500 font-medium">Personalize e ordene arrastando</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddCategoria} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCategoria}
            onChange={(e) => setNewCategoria(e.target.value)}
            placeholder="Nova Categoria..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium"
          />
          <button
            type="submit"
            disabled={!newCategoria.trim()}
            className="px-6 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 transition-all uppercase tracking-wider text-sm flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-2">
          {categorias.map((cat, index) => (
            <div 
              key={cat} 
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center justify-between bg-zinc-950 border p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index ? 'opacity-50 scale-[0.98] border-orange-500' : 
                dragOverIndex === index ? 'border-orange-500 relative before:absolute before:-top-1 before:left-0 before:right-0 before:h-0.5 before:bg-orange-500' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-zinc-600" />
                <span className="text-zinc-300 font-bold uppercase tracking-wider text-xs select-none">{cat}</span>
              </div>
              <button
                onClick={() => handleRemoveCategoria(cat)}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {categorias.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm font-medium">
              Nenhuma categoria cadastrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
