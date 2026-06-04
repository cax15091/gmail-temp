import { Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function EmailGenerator({ currentEmail, onGenerate, onReset, loading }) {
  const [copied, setCopied] = useState(false);
  const [alias, setAlias] = useState('');

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    onGenerate(alias.trim() || undefined);
  };

  const inviteLink = currentEmail 
    ? `https://frontend-sender.vercel.app/?to=${currentEmail.email}`
    : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="relative flex-1 w-full flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 shadow-inner focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
          <input
            type="text"
            value={currentEmail ? currentEmail.email : alias}
            onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="Escribe tu nombre o alias (ej. carlos)"
            className="w-full bg-transparent text-slate-200 text-base md:text-lg focus:outline-none"
            readOnly={!!currentEmail}
          />
          {!currentEmail && <span className="text-slate-500 ml-2 whitespace-nowrap">@tempmail.local</span>}
        </div>
        {!currentEmail ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={clsx(
              "w-full md:w-auto px-8 py-3 md:py-0 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2 shrink-0 border border-blue-400/50 shadow-lg",
              loading 
                ? "bg-slate-800 cursor-not-allowed border-slate-700 text-slate-500" 
                : "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25 active:scale-95"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Crear Bandeja</span>}
          </button>
        ) : (
          <button
            onClick={onReset}
            className="w-full md:w-auto px-6 py-3 md:py-0 rounded-xl font-medium text-slate-300 transition-all flex items-center justify-center space-x-2 shrink-0 border border-slate-700 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 bg-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cambiar</span>
          </button>
        )}
      </div>

      {currentEmail && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm text-blue-300 font-medium">🔗 Enlace de invitación — compártelo para que te escriban:</p>
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
            <input 
              type="text" 
              readOnly 
              value={inviteLink} 
              className="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none"
            />
            <button
              onClick={() => handleCopy(inviteLink)}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1 text-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
