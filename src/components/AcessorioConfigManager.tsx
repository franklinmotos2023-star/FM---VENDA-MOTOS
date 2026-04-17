import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Plus, Trash2, Tag, Bike } from 'lucide-react';
import { useAcessoriosConfig } from '../hooks/useAcessoriosConfig';

export default function AcessorioConfigManager() {
  const config = useAcessoriosConfig();
  const [newMarca, setNewMarca] = useState('');
  const [newMoto, setNewMoto] = useState('');

  const handleAddMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarca.trim()) return;
    const updatedMarcas = [...new Set([...(config.marcas || []), newMarca.trim()])].sort();
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, marcas: updatedMarcas });
    setNewMarca('');
  };

  const handleRemoveMarca = async (marca: string) => {
    const updatedMarcas = (config.marcas || []).filter(m => m !== marca);
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, marcas: updatedMarcas });
  };

  const handleAddMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoto.trim()) return;
    const updatedMotos = [...new Set([...(config.motos || []), newMoto.trim()])].sort();
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, motos: updatedMotos });
    setNewMoto('');
  };

  const handleRemoveMoto = async (moto: string) => {
    const updatedMotos = (config.motos || []).filter(m => m !== moto);
    await setDoc(doc(db, 'settings', 'acessoriosConfig'), { ...config, motos: updatedMotos });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="text-orange-500" size={24} />
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Marcas Permitidas</h3>
        </div>
        
        <form onSubmit={handleAddMarca} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newMarca}
            onChange={(e) => setNewMarca(e.target.value)}
            placeholder="Nova marca (Ex: Honda)"
            className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm uppercase"
          />
          <button type="submit" className="px-4 bg-orange-600 text-black font-bold rounded-xl hover:bg-orange-500 transition-colors">
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          {(config.marcas || []).map(marca => (
            <div key={marca} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
              <span className="text-white font-bold text-sm uppercase">{marca}</span>
              <button 
                onClick={() => handleRemoveMarca(marca)}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!config.marcas || config.marcas.length === 0) && (
             <p className="text-zinc-500 text-sm text-center py-4">Nenhuma marca cadastrada.</p>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bike className="text-orange-500" size={24} />
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Modelos de Moto</h3>
        </div>
        
        <form onSubmit={handleAddMoto} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newMoto}
            onChange={(e) => setNewMoto(e.target.value)}
            placeholder="Novo modelo (Ex: Titan 160)"
            className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none text-white text-sm uppercase"
          />
          <button type="submit" className="px-4 bg-orange-600 text-black font-bold rounded-xl hover:bg-orange-500 transition-colors">
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          {(config.motos || []).map(moto => (
            <div key={moto} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
              <span className="text-white font-bold text-sm uppercase">{moto}</span>
              <button 
                onClick={() => handleRemoveMoto(moto)}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!config.motos || config.motos.length === 0) && (
             <p className="text-zinc-500 text-sm text-center py-4">Nenhum modelo cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
