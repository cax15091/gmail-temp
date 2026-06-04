import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MailOpen, Inbox, Paperclip, Download,
  Image, FileText, FileArchive, File,
  Reply, Send, X, Loader2, CheckCircle
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';

// ─── Parse message: split text from base64 attachments ────────────────────────
function parseMessage(raw) {
  const SEPARATOR = '\n\n---ATTACHMENTS_JSON---\n';
  const idx = raw.indexOf(SEPARATOR);
  if (idx === -1) return { text: raw, attachments: [] };
  const text = raw.slice(0, idx);
  try {
    return { text, attachments: JSON.parse(raw.slice(idx + SEPARATOR.length)) };
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
      {isImage && (
        <img src={file.data} alt={file.name}
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
        <button onClick={handleDownload} title="Descargar"
          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors shrink-0">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline Reply Form ─────────────────────────────────────────────────────────
function ReplyForm({ originalMsg, currentEmail, onClose, onSent }) {
  const [replyText, setReplyText] = useState('');
  const [senderName, setSenderName] = useState('Yo');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentEmail) return;
    setLoading(true);

    // Quote the original message in the reply body
    const quotedBody =
      replyText +
      `\n\n— El ${new Date(originalMsg.createdAt).toLocaleString('es-MX')}, ${originalMsg.sender} escribió:\n` +
      originalMsg.message.split('\n\n---ATTACHMENTS_JSON---\n')[0]
        .split('\n').map(l => `> ${l}`).join('\n');

    try {
      await axios.post(`${API_URL}/messages`, {
        emailAddress: currentEmail.email,
        sender: senderName,
        subject: `Re: ${originalMsg.subject}`,
        message: quotedBody,
      });
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); onSent(); }, 1800);
    } catch (err) {
      console.error('Reply failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSend}
      className="mt-4 border border-indigo-500/30 rounded-xl bg-indigo-500/5 p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <Reply className="w-3.5 h-3.5" /> Responder a {originalMsg.sender}
        </span>
        <button type="button" onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sender name */}
      <input
        type="text"
        value={senderName}
        onChange={e => setSenderName(e.target.value)}
        placeholder="Tu nombre"
        required
        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      />

      {/* Reply body */}
      <textarea
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        placeholder={`Escribe tu respuesta a ${originalMsg.sender}...`}
        required
        rows={4}
        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
      />

      {/* Subject preview */}
      <p className="text-xs text-slate-500">
        Asunto: <span className="text-slate-400">Re: {originalMsg.subject}</span>
      </p>

      <button type="submit" disabled={loading || sent}
        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
        {sent
          ? <><CheckCircle className="w-4 h-4" /> ¡Enviado!</>
          : loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Send className="w-4 h-4" /> Enviar respuesta</>
        }
      </button>
    </form>
  );
}

// ─── Main MessageList ─────────────────────────────────────────────────────────
export default function MessageList({ messages, currentEmail }) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReply, setShowReply] = useState(false);

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

  const selected = selectedMessage ? parseMessage(selectedMessage.message || '') : null;

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    setShowReply(false);
  };

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
            const isReply = msg.subject?.startsWith('Re: ');
            return (
              <button key={msg._id} onClick={() => handleSelectMessage(msg)}
                className={`w-full text-left p-3.5 rounded-xl transition-all ${
                  selectedMessage?._id === msg._id
                    ? 'bg-indigo-600/20 border border-indigo-500/30'
                    : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/80'
                }`}>
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="font-semibold text-slate-200 truncate text-sm flex items-center gap-1.5">
                    {isReply && <Reply className="w-3 h-3 text-indigo-400 shrink-0" />}
                    {msg.sender}
                  </span>
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
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0">
                  {selectedMessage.sender?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-200">{selectedMessage.sender}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(selectedMessage.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {selected?.attachments?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                      <Paperclip className="w-3 h-3" />
                      {selected.attachments.length} adjunto{selected.attachments.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {/* Reply button */}
                  <button
                    onClick={() => setShowReply(r => !r)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      showReply
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Responder
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-5">
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

              {/* Inline reply form */}
              {showReply && (
                <ReplyForm
                  originalMsg={selectedMessage}
                  currentEmail={currentEmail}
                  onClose={() => setShowReply(false)}
                  onSent={() => {}}
                />
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
