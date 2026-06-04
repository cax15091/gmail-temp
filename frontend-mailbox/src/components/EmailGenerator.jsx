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
            className="w-full bg-[#2a3942] border border-[#222e35] text-[#e9edef] text-lg rounded-xl px-4 py-4 pr-12 focus:outline-none focus:border-[#00a884] transition-colors"
          />
          {currentEmail && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Copiar correo"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className={clsx(
            "w-full md:w-auto px-8 py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2 shrink-0",
            loading 
              ? "bg-emerald-600/50 cursor-not-allowed" 
              : "bg-[#00a884] hover:bg-[#008f72] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
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
