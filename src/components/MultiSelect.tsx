import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0] 
      : `${selected.length} selecionados`;

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium cursor-pointer flex justify-between items-center"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 scrollbar-thin scrollbar-thumb-zinc-700">
          <div className="space-y-1">
            {options.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-orange-600/20 text-orange-500' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500 text-black' : 'border-zinc-600'}`}>
                    {isSelected && <Check size={12} strokeWidth={4} />}
                  </div>
                  <span className="text-sm font-medium truncate">{opt}</span>
                </div>
              );
            })}
            {options.length === 0 && (
              <div className="text-zinc-500 text-xs p-2 text-center">Vazio</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
