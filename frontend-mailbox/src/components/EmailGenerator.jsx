import { Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function EmailGenerator({ currentEmail, onGenerate, loading }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!currentEmail) return;
    navigator.clipboard.writeText(currentEmail.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            readOnly
            value={currentEmail ? currentEmail.email : 'Genera un correo para empezar...'}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-lg rounded-xl px-4 py-4 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
          />
          {currentEmail && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-blue-400 transition-colors"
              title="Copiar correo"
            >
              {copied ? <Check className="w-5 h-5 text-blue-400" /> : <Copy className="w-5 h-5" />}
            </button>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className={clsx(
            "w-full md:w-auto px-8 py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2 shrink-0 border border-blue-400/50 shadow-lg",
            loading 
              ? "bg-slate-800 cursor-not-allowed border-slate-700 text-slate-500" 
              : "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25 active:scale-95"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Generar Nuevo</span>
          )}
        </button>
      </div>
    </div>
  );
}
