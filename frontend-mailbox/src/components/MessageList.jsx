import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MailOpen, Inbox, Paperclip, Download, Image, FileText, FileArchive, File } from 'lucide-react';
import { useState } from 'react';

// ─── Parse message: split text from base64 attachments ────────────────────────
function parseMessage(raw) {
  const SEPARATOR = '\n\n---ATTACHMENTS_JSON---\n';
  const idx = raw.indexOf(SEPARATOR);
  if (idx === -1) return { text: raw, attachments: [] };

  const text = raw.slice(0, idx);
  try {
    const attachments = JSON.parse(raw.slice(idx + SEPARATOR.length));
    return { text, attachments };
  } catch {
    return { text: raw, attachments: [] };
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type, className }) {
  if (type?.startsWith('image/')) return <Image className={className} />;
  if (type?.includes('pdf') || type?.includes('text')) return <FileText className={className} />;
  if (type?.includes('zip') || type?.includes('rar')) return <FileArchive className={className} />;
  return <File className={className} />;
}

// ─── Attachment viewer / downloader ───────────────────────────────────────────
function AttachmentCard({ file }) {
  const isImage = file.type?.startsWith('image/');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.data;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/30">
      {/* Image preview */}
      {isImage && (
        <img
          src={file.data}
          alt={file.name}
          className="w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleDownload}
        />
      )}
      <div className="flex items-center gap-3 p-3">
        <FileIcon type={file.type} className="w-5 h-5 text-indigo-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate font-medium">{file.name}</p>
          <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={handleDownload}
          title="Descargar"
          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main MessageList ─────────────────────────────────────────────────────────
export default function MessageList({ messages }) {
  const [selectedMessage, setSelectedMessage] = useState(null);

  if (!messages || messages.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-full">
          <Inbox className="w-8 h-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-slate-300">Bandeja vacía</h3>
          <p className="text-slate-500 text-sm">Esperando mensajes entrantes...</p>
        </div>
      </div>
    );
  }

  const selected = selectedMessage
    ? parseMessage(selectedMessage.message || '')
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

      {/* ── Message list ── */}
      <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80">
          <h3 className="font-medium text-slate-200">Mensajes ({messages.length})</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
          {messages.map((msg) => {
            const { attachments } = parseMessage(msg.message || '');
            return (
              <button
                key={msg._id}
                onClick={() => setSelectedMessage(msg)}
                className={`w-full text-left p-3.5 rounded-xl transition-all ${
                  selectedMessage?._id === msg._id
                    ? 'bg-indigo-600/20 border border-indigo-500/30'
                    : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/80'
                }`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="font-semibold text-slate-200 truncate text-sm">{msg.sender}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{msg.subject}</p>
                {attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-indigo-400">
                    <Paperclip className="w-3 h-3" />
                    <span>{attachments.length} adjunto{attachments.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Message detail ── */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl h-[600px] flex flex-col overflow-hidden">
        {selectedMessage ? (
          <>
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-slate-800 space-y-3 bg-slate-900/80 shrink-0">
              <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight">
                {selectedMessage.subject}
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0">
                  {selectedMessage.sender?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-200">{selectedMessage.sender}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(selectedMessage.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                {selected?.attachments?.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                    <Paperclip className="w-3 h-3" />
                    {selected.attachments.length} adjunto{selected.attachments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-6">
              {/* Message text */}
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {selected?.text || ''}
              </p>

              {/* Attachments */}
              {selected?.attachments?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Archivos adjuntos</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selected.attachments.map((file, idx) => (
                      <AttachmentCard key={idx} file={file} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <MailOpen className="w-12 h-12 opacity-20" />
            <p className="text-sm">Selecciona un mensaje para leerlo</p>
          </div>
        )}
      </div>
    </div>
  );
}
