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
            value={currentEmail ? currentEmail.email : 'Click generate to get an email...'}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-lg rounded-xl px-4 py-4 pr-12 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {currentEmail && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-400 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className={clsx(
            "w-full md:w-auto px-8 py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2",
            loading ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Generate New</span>
          )}
        </button>
      </div>
    </div>
  );
}
