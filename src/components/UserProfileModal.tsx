import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, CreditCard, X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { db, doc, setDoc, getDoc } from '../firebase';

interface UserProfileModalProps {
  user: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function UserProfileModal({ user, onClose, onSave }: UserProfileModalProps) {
  const [formData, setFormData] = useState({
    nome: user?.displayName || '',
    cpf: '',
    cep: '',
    telefone: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(prev => ({
            ...prev,
            nome: data.nome || prev.nome,
            cpf: data.cpf || '',
            cep: data.cep || '',
            telefone: data.telefone || ''
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="bg-black p-6 border-b border-orange-600 flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Completar <span className="text-orange-600">Perfil</span></h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-zinc-400 text-sm">
            Preencha seus dados para agilizar futuras simulações e compras.
          </p>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Nome Completo
              </label>
              <input
                required
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={12} /> CPF
              </label>
              <input
                required
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> Telefone / WhatsApp
              </label>
              <input
                required
                type="text"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> CEP
              </label>
              <input
                required
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                placeholder="00000-000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
            ) : (
              <>
                <Save size={16} /> Salvar Dados
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
