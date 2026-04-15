import React, { useState } from 'react';
import { Moto } from '../types';
import { Camera, X, Check, Sparkles, Loader2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortablePhotoProps {
  foto: string;
  index: number;
  onRemove: (index: number) => void;
  key?: string | number;
}

function SortablePhoto({ foto, index, onRemove }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: foto });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700 group bg-zinc-950"
    >
      <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
      
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={16} />
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <X size={16} />
      </button>
      
      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
        #{index + 1}
      </div>
    </div>
  );
}

interface MotoFormProps {
  onSave: (moto: Omit<Moto, 'id'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Moto;
}

export default function MotoForm({ onSave, onCancel, initialData }: MotoFormProps) {
  const [formData, setFormData] = useState<Omit<Moto, 'id'>>({
    placa: initialData?.placa || '',
    marcaModelo: initialData?.marcaModelo || '',
    anoFabricacao: initialData?.anoFabricacao || new Date().getFullYear(),
    anoModelo: initialData?.anoModelo || new Date().getFullYear(),
    quilometragem: initialData?.quilometragem || '',
    precoAVista: initialData?.precoAVista || 0,
    precoAntigo: initialData?.precoAntigo || undefined,
    statusRevisao: initialData?.statusRevisao || 'REVISADA',
    statusDut: initialData?.statusDut || 'DUT INCLUSO',
    fotos: initialData?.fotos || [],
    cambio: initialData?.cambio || 'MANUAL',
    combustivel: initialData?.combustivel || 'FLEX',
    descricao: initialData?.descricao || '',
    equipamentos: initialData?.equipamentos || []
  });

  const [equipamentoInput, setEquipamentoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.fotos.indexOf(active.id as string);
        const newIndex = prev.fotos.indexOf(over.id as string);
        return {
          ...prev,
          fotos: arrayMove(prev.fotos, oldIndex, newIndex),
        };
      });
    }
  };

  const enhanceImagesWithAI = async () => {
    if (!formData.fotos || formData.fotos.length === 0) return;
    
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    };

    await checkApiKey();
    setIsEnhancing(true);

    try {
      // V-02 (API Key Exposta): Chamada migrada para o backend seguro
      const response = await fetch('/api/enhance-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          images: formData.fotos.map(fotoBase64 => {
            const base64Data = fotoBase64.split(',')[1];
            const mimeType = fotoBase64.split(';')[0].split(':')[1];
            return { mimeType, data: base64Data };
          })
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        fotos: data.enhancedPhotos
      }));
    } catch (error) {
      console.error("AI Enhancement error:", error);
      alert("Erro ao aprimorar imagens com IA. Verifique sua conexão e tente novamente.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateDescriptionWithAI = async () => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    };

    await checkApiKey();
    setIsGeneratingDescription(true);

    try {
      // V-02 (API Key Exposta): Chamada migrada para o backend seguro
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptData: {
            marcaModelo: formData.marcaModelo,
            anoFabricacao: formData.anoFabricacao,
            anoModelo: formData.anoModelo,
            quilometragem: formData.quilometragem,
            precoAVista: formData.precoAVista,
            statusRevisao: formData.statusRevisao,
            statusDut: formData.statusDut,
            cambio: formData.cambio,
            combustivel: formData.combustivel,
            equipamentos: formData.equipamentos
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.description) {
        setFormData(prev => ({
          ...prev,
          descricao: data.description
        }));
      }
    } catch (error) {
      console.error("AI Description error:", error);
      alert("Erro ao gerar descrição com IA. Verifique sua conexão e tente novamente.");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'anoFabricacao' || name === 'anoModelo' || name === 'precoAVista' || name === 'precoAntigo' ? Number(value) : value
    }));
  };

  const addEquipamento = () => {
    if (equipamentoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        equipamentos: [...(prev.equipamentos || []), equipamentoInput.trim()]
      }));
      setEquipamentoInput('');
    }
  };

  const removeEquipamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipamentos: prev.equipamentos?.filter((_, i) => i !== index)
    }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if ((formData.fotos?.length || 0) + files.length > 4) {
        alert("Você pode adicionar no máximo 4 fotos por moto.");
        return;
      }

      const compressedImages = await Promise.all(
        Array.from(files).map((file: File) => compressImage(file))
      );

      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...compressedImages]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.precoAntigo === undefined || dataToSave.precoAntigo === 0 || isNaN(dataToSave.precoAntigo)) {
        delete dataToSave.precoAntigo;
      }
      await onSave(dataToSave as Omit<Moto, 'id'>);
      setSaveSuccess(true);
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800">
      <div className="bg-black p-8 text-white border-b border-orange-600">
        <h2 className="text-3xl font-black uppercase tracking-tight">
          {initialData ? 'Editar' : 'Adicionar'} <span className="text-orange-600">Moto</span>
        </h2>
        <p className="text-zinc-400 text-sm mt-2 font-medium">
          {initialData ? 'Atualize os dados da motocicleta.' : 'Preencha os dados da motocicleta para o estoque.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Marca/Modelo</label>
            <input
              type="text"
              name="marcaModelo"
              required
              placeholder="Ex: HONDA/FAN 160"
              value={formData.marcaModelo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white uppercase"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Placa</label>
            <input
              type="text"
              name="placa"
              required
              placeholder="Ex: PMD-2H93"
              value={formData.placa}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white uppercase font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Ano de Fabricação</label>
            <input
              type="number"
              name="anoFabricacao"
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.anoFabricacao}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Ano do Modelo</label>
            <input
              type="number"
              name="anoModelo"
              required
              min="1900"
              max={new Date().getFullYear() + 2}
              value={formData.anoModelo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Quilometragem</label>
            <input
              type="text"
              name="quilometragem"
              required
              placeholder="Ex: 53.352km"
              value={formData.quilometragem}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Preço à Vista (Atual) (R$)</label>
            <input
              type="number"
              name="precoAVista"
              required
              min="0"
              step="0.01"
              placeholder="Ex: 13000"
              value={formData.precoAVista || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all font-black text-orange-500 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Preço Antigo (Opcional) (R$)</label>
            <input
              type="number"
              name="precoAntigo"
              min="0"
              step="0.01"
              placeholder="Ex: 15000"
              value={formData.precoAntigo || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all font-black text-zinc-500 text-lg"
            />
            {formData.precoAntigo && formData.precoAVista && formData.precoAntigo > formData.precoAVista && (
              <p className="text-xs text-green-500 font-bold">
                Desconto de {Math.round(((formData.precoAntigo - formData.precoAVista) / formData.precoAntigo) * 100)}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Status de Revisão</label>
            <select
              name="statusRevisao"
              value={formData.statusRevisao}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            >
              <option value="REVISADA">REVISADA</option>
              <option value="A REVISAR">A REVISAR</option>
              <option value="NOVA">NOVA</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Status do DUT</label>
            <select
              name="statusDut"
              value={formData.statusDut}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            >
              <option value="DUT INCLUSO">DUT INCLUSO</option>
              <option value="DUT NÃO INCLUSO">DUT NÃO INCLUSO</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Câmbio</label>
            <select
              name="cambio"
              value={formData.cambio}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            >
              <option value="MANUAL">MANUAL</option>
              <option value="AUTOMÁTICO">AUTOMÁTICO</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Combustível</label>
            <select
              name="combustivel"
              value={formData.combustivel}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            >
              <option value="GASOLINA">GASOLINA</option>
              <option value="ÁLCOOL">ÁLCOOL</option>
              <option value="FLEX">FLEX</option>
              <option value="ELÉTRICO">ELÉTRICO</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
            <button
              type="button"
              onClick={generateDescriptionWithAI}
              disabled={isGeneratingDescription}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-black hover:bg-blue-600/20 transition-all border border-blue-600/20 disabled:opacity-50"
            >
              {isGeneratingDescription ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Auxílio IA
                </>
              )}
            </button>
          </div>
          <textarea
            name="descricao"
            rows={6}
            value={formData.descricao}
            onChange={handleChange}
            placeholder="Descreva os detalhes da moto, histórico, revisões, etc."
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white resize-none"
          />
        </div>

        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Equipamentos e Opcionais</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={equipamentoInput}
              onChange={(e) => setEquipamentoInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipamento())}
              placeholder="Ex: ABS, Partida Elétrica, Alarme..."
              className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white"
            />
            <button
              type="button"
              onClick={addEquipamento}
              className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
            >
              Adicionar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.equipamentos?.map((eq, index) => (
              <span key={index} className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-sm font-bold border border-zinc-700">
                {eq}
                <button type="button" onClick={() => removeEquipamento(index)} className="text-zinc-500 hover:text-red-500">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Fotos da Moto</label>
            {formData.fotos && formData.fotos.length > 0 && (
              <button
                type="button"
                onClick={enhanceImagesWithAI}
                disabled={isEnhancing}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 text-orange-500 rounded-lg text-xs font-black hover:bg-orange-600/20 transition-all border border-orange-600/20 disabled:opacity-50"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Aprimorando...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Aprimoramento IA
                  </>
                )}
              </button>
            )}
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SortableContext
                items={formData.fotos || []}
                strategy={rectSortingStrategy}
              >
                {formData.fotos?.map((foto, index) => (
                  <SortablePhoto
                    key={foto}
                    foto={foto}
                    index={index}
                    onRemove={removeImage}
                  />
                ))}
              </SortableContext>
              
              {!isEnhancing && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-orange-500 hover:border-orange-500 transition-colors cursor-pointer bg-zinc-950/50">
                  <Camera size={32} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Adicionar Foto</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </DndContext>
          
          {isEnhancing && (
            <div className="bg-orange-600/5 border border-orange-600/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <Loader2 size={20} className="text-orange-500 animate-spin" />
              <p className="text-xs text-orange-200 font-medium">
                A IA está processando suas fotos. Isso pode levar alguns segundos...
              </p>
            </div>
          )}
          
          <p className="text-[10px] text-zinc-500 font-medium italic">
            * Arraste as fotos para reordenar. A primeira foto será a capa.
          </p>
        </div>

        <div className="flex justify-end gap-4 pt-8 mt-8 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || saveSuccess || isEnhancing}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] uppercase tracking-wider text-sm ${
              saveSuccess 
                ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                : 'bg-orange-600 text-black hover:bg-orange-500'
            } disabled:opacity-70`}
          >
            {saveSuccess ? (
              <>
                <Check size={20} className="animate-bounce" />
                Salvo com Sucesso!
              </>
            ) : isSaving ? (
              <>
                <span className="animate-pulse">Salvando...</span>
              </>
            ) : (
              <>
                <Check size={20} />
                Salvar Moto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
