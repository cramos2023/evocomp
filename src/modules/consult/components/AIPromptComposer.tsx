import React, { useState, KeyboardEvent } from 'react';
import { InteractionMode } from '../types/evidence';
import { Send, Paperclip, Eraser, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIPromptComposerProps {
  mode: InteractionMode;
  onSend: (value: string) => void;
  disabled?: boolean;
}

const AIPromptComposer: React.FC<AIPromptComposerProps> = ({ mode, onSend, disabled }) => {
  const [value, setValue] = useState('');
  const { t } = useTranslation();

  const getPlaceholder = () => {
    switch (mode) {
      case 'ASK': return t('consult.composer.placeholder_ask');
      case 'EXPLAIN': return t('consult.composer.placeholder_explain');
      case 'RECOMMEND': return t('consult.composer.placeholder_recommend');
      default: return t('consult.composer.placeholder_default');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full group">
       <div className="relative bg-[rgba(var(--surface-card),0.9)] backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 group-focus-within:border-[rgba(var(--accent-emerald),0.3)] group-focus-within:shadow-[0_48px_80px_-24px_rgba(0,0,0,0.6)]">
          
          <div className="flex items-center gap-2 absolute left-6 top-5">
             <Sparkles className={`w-4 h-4 ${disabled ? 'text-gray-500' : 'text-[rgb(var(--accent-emerald))] animate-pulse'}`} />
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={getPlaceholder()}
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 p-5 pl-14 pr-32 text-sm text-[rgb(var(--text-primary))] placeholder-[rgba(var(--text-secondary),0.4)] resize-none min-h-[64px] max-h-[200px] overflow-y-auto font-medium"
            style={{ height: 'auto' }}
          />

          <div className="absolute right-4 bottom-3.5 flex items-center gap-2">
             <button 
               onClick={() => setValue('')} 
               className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(var(--text-secondary),0.5)] transition-colors"
               title="Clear"
             >
                <Eraser className="w-4 h-4" />
             </button>
             
             <button
               disabled={!value.trim() || disabled}
               onClick={handleSend}
               className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                 value.trim() && !disabled
                   ? 'bg-[rgb(var(--accent-emerald))] text-black shadow-[0_0_20px_rgba(var(--accent-emerald),0.4)] hover:scale-105 active:scale-95'
                   : 'bg-[rgba(255,255,255,0.05)] text-[rgba(var(--text-secondary),0.2)]'
               }`}
             >
                <Send className="w-4 h-4 ml-0.5" />
             </button>
          </div>
       </div>
       
       <div className="flex items-center justify-center gap-6 mt-4 opacity-40 hover:opacity-100 transition-opacity">
          <button className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">
             <Paperclip className="w-3 h-3" /> {t('consult.composer.attach_context')}
          </button>
          <div className="w-1 h-1 rounded-full bg-gray-700" />
          <p className="text-[10px] text-[rgb(var(--text-secondary))] uppercase tracking-widest font-mono">
            {t('consult.composer.mode')}: <span className="text-[rgb(var(--accent-emerald))]">{mode}</span>
          </p>
       </div>
    </div>
  );
};

export default AIPromptComposer;
