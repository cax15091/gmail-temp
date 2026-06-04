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
        ? "border-emerald-600/30 bg-[#004d3e]/50 hover:bg-[#004d3e]/80" 
        : "border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/70"
    )}>
      {isImage && (
        <img src={file.data} alt={file.name}
          className="w-full max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleDownload}
        />
      )}
      <div className="flex items-center gap-2 p-2">
        <FileIcon type={file.type} className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 truncate font-medium">{file.name}</p>
          <p className="text-slate-400 text-[10px]">{formatBytes(file.size)}</p>
        </div>
        <button onClick={handleDownload} title="Descargar"
          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors shrink-0">
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

  // Automatically scroll chat to bottom when message list or selected message changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedMessage]);

  // Filter messages based on search query (by sender name or subject)
  const filteredAllMessages = messages.filter(msg => 
    msg.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // In WhatsApp, the left sidebar list displays the original received emails (incoming threads)
  const originalMessages = filteredAllMessages.filter(msg => !msg.subject?.startsWith('Re: '));

  // Determine the thread messages for the currently selected original message
  const threadMessages = selectedMessage
    ? messages
        .filter(m => m._id === selectedMessage._id || m.subject === `Re: ${selectedMessage.subject}`)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentEmail || !selectedMessage) return;
    setLoadingReply(true);

    // Quote the original or last message
    const quotedBody =
      replyText +
      `\n\n— El ${new Date(selectedMessage.createdAt).toLocaleString('es-MX')}, ${selectedMessage.sender} escribió:\n` +
      selectedMessage.message.split('\n\n---ATTACHMENTS_JSON---\n')[0]
        .split('\n').map(l => `> ${l}`).join('\n');

    try {
      await axios.post(`${API_URL}/messages`, {
        emailAddress: currentEmail.email,
        sender: senderName,
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
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[500px]">
        <div className="p-4 bg-[#202c33] rounded-full">
          <Inbox className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-slate-200">Bandeja de entrada vacía</h3>
          <p className="text-slate-400 text-sm">Esperando mensajes entrantes en tiempo real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-2xl overflow-hidden border border-[#222e35] bg-[#0b141a] h-[650px]">
      
      {/* ── 1. Left Sidebar (Chats list) ── */}
      <div className={clsx(
        "md:col-span-1 bg-[#111b21] border-r border-[#222e35] flex flex-col h-full",
        selectedMessage ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-3 bg-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-slate-200 text-sm">Mensajes</span>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#00a884] text-white">
            {originalMessages.length} hilos
          </span>
        </div>

        {/* Sidebar Search */}
        <div className="p-2 bg-[#111b21] border-b border-[#222e35]">
          <div className="relative bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar remitente o asunto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs w-full focus:outline-none placeholder-slate-500"
            />
          </div>
        </div>

        {/* Chat Threads list */}
        <div className="overflow-y-auto flex-1 divide-y divide-[#222e35]">
          {originalMessages.map((msg) => {
            const isSelected = selectedMessage?._id === msg._id;
            const parsed = parseMessage(msg.message || '');
            
            // Find replies count for this thread
            const threadReplies = messages.filter(m => m.subject === `Re: ${msg.subject}`);
            const lastMsg = threadReplies.length > 0 ? threadReplies[threadReplies.length - 1] : msg;

            return (
              <button key={msg._id} onClick={() => setSelectedMessage(msg)}
                className={clsx(
                  "w-full text-left p-3 flex gap-3 transition-colors",
                  isSelected 
                    ? "bg-[#2a3942]" 
                    : "hover:bg-[#202c33]/50 bg-transparent"
                )}>
                <div className="w-11 h-11 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-200 font-bold shrink-0 text-base">
                  {msg.sender?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-slate-200 text-sm truncate">{msg.sender}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-emerald-400 truncate mb-0.5">{msg.subject}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {threadReplies.length > 0 && <span className="text-emerald-500 font-semibold">Tú: </span>}
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
        "md:col-span-2 flex flex-col h-full bg-[#0b141a] relative",
        !selectedMessage ? "hidden md:flex" : "flex"
      )}>
        {selectedMessage ? (
          <>
            {/* Chat Window Header */}
            <div className="p-3 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button visible only on mobile */}
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1 -ml-1 text-slate-400 hover:text-white transition-colors md:hidden shrink-0"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
                  {selectedMessage.sender?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 text-sm truncate">{selectedMessage.sender}</p>
                  <p className="text-[10px] text-emerald-400 font-medium">Asunto: {selectedMessage.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Smile className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              </div>
            </div>

            {/* Chat Bubbles Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] WhatsApp-doodle-bg relative">
              {threadMessages.map((msg) => {
                const isOutgoing = msg.subject?.startsWith('Re: ') || msg.sender === 'Yo' || msg.sender === senderName;
                const parsed = parseMessage(msg.message || '');
                return (
                  <div key={msg._id} className={clsx(
                    "flex w-full",
                    isOutgoing ? "justify-end" : "justify-start"
                  )}>
                    <div className={clsx(
                      "max-w-[70%] rounded-xl px-3 py-2 text-sm shadow-md relative break-words flex flex-col gap-1.5",
                      isOutgoing 
                        ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                        : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                    )}>
                      {/* Sender label in bubble if not outgoing */}
                      {!isOutgoing && (
                        <span className="text-[10px] text-emerald-400 font-bold leading-none select-none">
                          {msg.sender}
                        </span>
                      )}

                      {/* Message Content */}
                      <p className="whitespace-pre-wrap leading-relaxed text-sm pr-12">
                        {parsed.text}
                      </p>

                      {/* Render attachments if present */}
                      {parsed.attachments?.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-700/40 mt-1">
                          {parsed.attachments.map((file, idx) => (
                            <AttachmentCard key={idx} file={file} isOutgoing={isOutgoing} />
                          ))}
                        </div>
                      )}

                      {/* Timestamp & check icon */}
                      <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none text-[9px] text-slate-400">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutgoing && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Bottom Bar (Reply Form) */}
            <form onSubmit={handleSendReply} className="p-3 bg-[#202c33] border-t border-[#222e35] flex items-center gap-2 shrink-0">
              
              {/* Optional: Compact sender name config, toggle or input */}
              <div className="flex flex-col gap-1 shrink-0 w-24">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Remitente:</span>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Nombre"
                  required
                  className="bg-[#111b21] border border-[#222e35] text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 w-full"
                />
              </div>

              {/* Message Input field */}
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Responder a ${selectedMessage.sender}...`}
                required
                disabled={loadingReply}
                className="flex-1 bg-[#2a3942] border-none text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none placeholder-slate-400 w-full"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!replyText.trim() || loadingReply}
                className={clsx(
                  "p-2.5 rounded-full text-white transition-all flex items-center justify-center shrink-0",
                  !replyText.trim() || loadingReply
                    ? "bg-[#202c33] text-slate-500 cursor-not-allowed"
                    : "bg-[#00a884] hover:bg-[#008f72] hover:scale-105 active:scale-95"
                )}
              >
                {loadingReply ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </>
        ) : (
          /* Empty/No message selected state */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35]/10 text-slate-500 space-y-4 p-8">
            <div className="p-5 bg-[#202c33] rounded-full border border-[#222e35]">
              <MailOpen className="w-16 h-16 text-slate-500/40" />
            </div>
            <div className="text-center space-y-1 max-w-sm">
              <h3 className="text-lg font-medium text-slate-300">TempMail Web</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona un correo de la lista de la izquierda para ver su conversación. Puedes recibir múltiples correos y chatear con ellos de forma segura.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
