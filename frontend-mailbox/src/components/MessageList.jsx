import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MailOpen, Inbox, Paperclip, Download,
  Image, FileText, FileArchive, File,
  Send, X, Loader2, Check, ArrowLeft,
  MoreVertical, Search, Smile
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import clsx from 'clsx';

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

function AttachmentCard({ file, isOutgoing }) {
  const isImage = file.type?.startsWith('image/');
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.data;
    a.download = file.name;
    a.click();
  };
  return (
    <div className={clsx(
      "border rounded-xl overflow-hidden text-xs max-w-xs transition-all",
      isOutgoing 
        ? "border-indigo-400/30 bg-indigo-500/20 hover:bg-indigo-500/40" 
        : "border-slate-600/60 bg-slate-700/40 hover:bg-slate-700/70"
    )}>
      {isImage && (
        <img src={file.data} alt={file.name}
          className="w-full max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleDownload}
        />
      )}
      <div className="flex items-center gap-2 p-2">
        <FileIcon type={file.type} className="w-4 h-4 text-indigo-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-100 truncate font-medium">{file.name}</p>
          <p className="text-slate-400 text-[10px]">{formatBytes(file.size)}</p>
        </div>
        <button onClick={handleDownload} title="Descargar"
          className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main MessageList ─────────────────────────────────────────────────────────
export default function MessageList({ messages, currentEmail }) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [senderName, setSenderName] = useState('Yo');
  const [loadingReply, setLoadingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedMessage]);

  const filteredAllMessages = messages.filter(msg => 
    msg.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const originalMessages = filteredAllMessages.filter(msg => !msg.subject?.startsWith('Re: '));

  const threadMessages = selectedMessage
    ? messages
        .filter(m => m._id === selectedMessage._id || m.subject === `Re: ${selectedMessage.subject}`)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentEmail || !selectedMessage) return;
    setLoadingReply(true);

    const quotedBody =
      replyText +
      `\n\n— El ${new Date(selectedMessage.createdAt).toLocaleString('es-MX')}, ${selectedMessage.sender} escribió:\n` +
      selectedMessage.message.split('\n\n---ATTACHMENTS_JSON---\n')[0]
        .split('\n').map(l => `> ${l}`).join('\n');

    try {
      await axios.post(`${API_URL}/messages`, {
        emailAddress: currentEmail.email,
        sender: senderName.trim() || 'Yo',
        subject: `Re: ${selectedMessage.subject}`,
        message: quotedBody,
      });
      setReplyText('');
    } catch (err) {
      console.error('Reply failed', err);
    } finally {
      setLoadingReply(false);
    }
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <div className="p-4 bg-slate-800 rounded-full shadow-inner shadow-indigo-500/10">
          <Inbox className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-slate-100">Bandeja de entrada vacía</h3>
          <p className="text-slate-400 text-sm">Esperando mensajes entrantes en tiempo real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-[calc(100dvh-280px)] min-h-[500px] shadow-2xl">
      
      {/* ── 1. Left Sidebar (Chats list) ── */}
      <div className={clsx(
        "md:col-span-1 bg-slate-900 border-r border-slate-800 flex flex-col h-full",
        selectedMessage ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 bg-slate-800/80 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              M
            </div>
            <span className="font-semibold text-slate-100 text-sm">Mensajes</span>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {originalMessages.length} hilos
          </span>
        </div>

        <div className="p-2 bg-slate-900 border-b border-slate-800">
          <div className="relative bg-slate-950 rounded-lg flex items-center px-3 py-1.5 gap-2 border border-slate-800 focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs w-full focus:outline-none placeholder-slate-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/50">
          {originalMessages.map((msg) => {
            const isSelected = selectedMessage?._id === msg._id;
            const threadReplies = messages.filter(m => m.subject === `Re: ${msg.subject}`);
            const lastMsg = threadReplies.length > 0 ? threadReplies[threadReplies.length - 1] : msg;

            return (
              <button key={msg._id} onClick={() => setSelectedMessage(msg)}
                className={clsx(
                  "w-full text-left p-3 flex gap-3 transition-colors",
                  isSelected ? "bg-slate-800/80 border-l-2 border-indigo-500" : "hover:bg-slate-800/40 bg-transparent border-l-2 border-transparent"
                )}>
                <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-indigo-300 font-bold shrink-0 text-base shadow-inner border border-slate-700">
                  {msg.sender?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-slate-100 text-sm truncate">{msg.sender}</span>
                    <span className="text-[10px] text-indigo-300/70 shrink-0">
                      {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-cyan-400 truncate mb-0.5">{msg.subject}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {threadReplies.length > 0 && <span className="text-indigo-400 font-semibold">Tú: </span>}
                    {parseMessage(lastMsg.message || '').text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Right Pane (Chat conversation thread) ── */}
      <div className={clsx(
        "md:col-span-2 flex flex-col h-full bg-slate-950 relative",
        !selectedMessage ? "hidden md:flex" : "flex"
      )}>
        {selectedMessage ? (
          <>
            <div className="p-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1 -ml-1 text-slate-400 hover:text-white transition-colors md:hidden shrink-0"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0 border border-indigo-500/20">
                  {selectedMessage.sender?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100 text-sm truncate">{selectedMessage.sender}</p>
                  <p className="text-[10px] text-cyan-400 font-medium truncate">Asunto: {selectedMessage.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 to-slate-900 relative">
              {threadMessages.map((msg) => {
                const isOutgoing = msg.subject?.startsWith('Re: ') || msg.sender === 'Yo' || msg.sender === senderName;
                const parsed = parseMessage(msg.message || '');
                return (
                  <div key={msg._id} className={clsx(
                    "flex w-full",
                    isOutgoing ? "justify-end" : "justify-start"
                  )}>
                    <div className={clsx(
                      "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-xl relative break-words flex flex-col gap-1.5",
                      isOutgoing 
                        ? "bg-indigo-600 text-white rounded-br-sm border border-indigo-500" 
                        : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
                    )}>
                      {!isOutgoing && (
                        <span className="text-[10px] text-cyan-400 font-bold leading-none select-none">
                          {msg.sender}
                        </span>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed text-sm pr-8 pb-5">
                        {parsed.text}
                      </p>

                      {parsed.attachments?.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/10 mt-1 pb-4">
                          {parsed.attachments.map((file, idx) => (
                            <AttachmentCard key={idx} file={file} isOutgoing={isOutgoing} />
                          ))}
                        </div>
                      )}

                      <div className="absolute bottom-2 right-3 flex items-center gap-1 select-none text-[9px] opacity-70">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutgoing && <Check className="w-3 h-3 text-white shrink-0" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendReply} className="p-3 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 flex items-center gap-2 shrink-0">
              <div className="flex flex-col gap-1 shrink-0 w-20 md:w-24">
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Tu Nombre"
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-[10px] md:text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
                />
              </div>

              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Escribe tu mensaje..."
                required
                disabled={loadingReply}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-500 w-full shadow-inner"
              />

              <button
                type="submit"
                disabled={!replyText.trim() || loadingReply}
                className={clsx(
                  "p-3 rounded-xl text-white transition-all flex items-center justify-center shrink-0 shadow-lg",
                  !replyText.trim() || loadingReply
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                    : "bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 hover:scale-105 active:scale-95"
                )}
              >
                {loadingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 space-y-4 p-8">
            <div className="p-6 bg-slate-900 rounded-full border border-slate-800 shadow-xl shadow-indigo-500/5">
              <MailOpen className="w-16 h-16 text-indigo-500/30" />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <h3 className="text-xl font-medium text-slate-200">TempMail Chat</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Selecciona un correo para iniciar la conversación. Diseño premium personalizado inspirado en tus apps de chat favoritas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
