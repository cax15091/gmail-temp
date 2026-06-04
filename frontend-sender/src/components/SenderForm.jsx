import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, Loader2, Paperclip, X, File, Image, 
  FileText, FileArchive, Download, Settings, 
  ChevronUp, ChevronDown, Check, Smile, MoreVertical 
} from 'lucide-react';
import clsx from 'clsx';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';
const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_MB = 15;

function FileIcon({ type, className }) {
  if (type?.startsWith('image/')) return <Image className={className} />;
  if (type?.includes('pdf') || type?.includes('text')) return <FileText className={className} />;
  if (type?.includes('zip') || type?.includes('rar') || type?.includes('compressed')) return <FileArchive className={className} />;
  return <File className={className} />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
          className="w-full max-h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
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

export default function SenderForm({ activeEmail, messages, setMessages }) {
  const [senderName, setSenderName] = useState(() => localStorage.getItem('sender_name') || 'Cliente');
  const [subject, setSubject] = useState(() => localStorage.getItem('sender_subject') || 'Contacto');
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Sync scroll to bottom when messages list changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Persist name and subject configuration
  useEffect(() => {
    localStorage.setItem('sender_name', senderName);
  }, [senderName]);

  useEffect(() => {
    localStorage.setItem('sender_subject', subject);
  }, [subject]);

  const addFiles = async (files) => {
    setError('');
    const newAttachments = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de ${MAX_FILE_SIZE_MB}MB.`);
        continue;
      }
      const data = await fileToBase64(file);
      newAttachments.push({ name: file.name, type: file.type, size: file.size, data });
    }

    const combined = [...attachments, ...newAttachments];
    const totalBytes = combined.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
      setError(`El total de archivos supera el límite de ${MAX_TOTAL_MB}MB.`);
      return;
    }

    setAttachments(combined);
  };

  const removeAttachment = (idx) =>
    setAttachments(attachments.filter((_, i) => i !== idx));

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (activeEmail) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEmail || !messageText.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Encode attachments if present
      let messagePayload = messageText;
      if (attachments.length > 0) {
        const attachmentData = attachments.map(({ name, type, size, data }) => ({
          name, type, size, data
        }));
        messagePayload += `\n\n---ATTACHMENTS_JSON---\n${JSON.stringify(attachmentData)}`;
      }

      const response = await axios.post(`${API_URL}/messages`, {
        sender: senderName,
        subject: subject,
        message: messagePayload,
        emailAddress: activeEmail.email,
      });

      // Optimistically/directly append the sent message to local state
      const newMsg = response.data;
      setMessages(prev => {
        if (prev.some(m => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      setMessageText('');
      setAttachments([]);
    } catch (err) {
      console.error('Failed to send message', err);
      setError('Error al enviar el mensaje. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !activeEmail || loading;
  const totalSize = attachments.reduce((s, f) => s + f.size, 0);

  return (
    <div 
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex flex-col h-[550px] relative bg-[#0b141a]"
    >
      
      {/* ── 1. Header (Recipient info & Config toggler) ── */}
      <div className="p-3 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-base shrink-0">
            R
          </div>
          <div>
            <p className="font-semibold text-slate-200 text-sm">Receptor Temporal</p>
            <p className="text-[10px] text-emerald-400 font-medium">
              {activeEmail ? 'En línea' : 'Desconectado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <button 
            type="button" 
            onClick={() => setShowConfig(c => !c)}
            title="Configurar datos de envío"
            className={clsx(
              "p-2 rounded-full hover:bg-slate-700/50 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium border",
              showConfig ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5" : "border-transparent"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* ── 2. Collapsible Settings Panel ── */}
      {showConfig && (
        <div className="bg-[#111b21] border-b border-[#222e35] p-4 space-y-3 shrink-0 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8696a0] tracking-wider mb-1">Mi Nombre (Remitente)</label>
              <input
                required
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-[#2a3942] border border-[#222e35] text-[#e9edef] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8696a0] tracking-wider mb-1">Asunto de Conversación</label>
              <input
                required
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej. Soporte Técnico"
                className="w-full bg-[#2a3942] border border-[#222e35] text-[#e9edef] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            * Estos datos se enviarán con tus mensajes en el chat para que el receptor los identifique.
          </p>
        </div>
      )}

      {/* ── 3. Chat History Scroll Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative bg-[#0b141a] WhatsApp-doodle-bg">
        
        {/* Error message banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs text-center shrink-0">
            {error}
          </div>
        )}

        {/* Empty chat state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 p-6 space-y-2 select-none">
            <Settings className="w-10 h-10 text-slate-500/30 animate-spin-slow" />
            <p className="text-xs text-slate-400 max-w-xs">
              No hay mensajes en este chat. Escribe un mensaje abajo para iniciar la conversación con el receptor.
            </p>
          </div>
        )}

        {/* Chat message bubbles */}
        {messages.map((msg) => {
          // Detect replies: messages coming from Mailbox (indicated by Re: subject or sender "Yo")
          const isIncoming = msg.subject?.startsWith('Re: ') || msg.sender === 'Yo';
          const isOutgoing = !isIncoming;
          const parsed = parseMessage(msg.message || '');

          return (
            <div key={msg._id} className={clsx(
              "flex w-full",
              isOutgoing ? "justify-end" : "justify-start"
            )}>
              <div className={clsx(
                "max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-md relative break-words flex flex-col gap-1.5",
                isOutgoing 
                  ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                  : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
              )}>
                {/* Bubble sender label */}
                <span className="text-[10px] text-emerald-400 font-bold leading-none select-none">
                  {isOutgoing ? 'Tú' : msg.sender}
                </span>

                {/* Message body */}
                <p className="whitespace-pre-wrap leading-relaxed text-sm pr-12">
                  {parsed.text}
                </p>

                {/* Bubble Attachments */}
                {parsed.attachments?.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-700/40 mt-1">
                    {parsed.attachments.map((file, idx) => (
                      <AttachmentCard key={idx} file={file} isOutgoing={isOutgoing} />
                    ))}
                  </div>
                )}

                {/* Timestamp & checks */}
                <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none text-[9px] text-[#8696a0]">
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

      {/* ── 4. Drag & drop overlay indicator ── */}
      {dragging && (
        <div className="absolute inset-0 bg-[#0b141a]/90 flex flex-col items-center justify-center border-4 border-dashed border-emerald-500 rounded-b-2xl z-20 m-1 pointer-events-none animate-fade-in">
          <Paperclip className="w-12 h-12 text-emerald-400 animate-bounce" />
          <p className="text-sm font-semibold text-slate-200 mt-2">Suelta tus archivos aquí</p>
          <p className="text-xs text-slate-500 mt-1">Cargar como adjuntos del mensaje</p>
        </div>
      )}

      {/* ── 5. Attachments Preview List (above input bar) ── */}
      {attachments.length > 0 && (
        <div className="p-2.5 bg-[#111b21] border-t border-[#222e35] flex items-center gap-3 overflow-x-auto shrink-0 select-none">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative bg-[#202c33] border border-slate-700/50 rounded-xl p-2 flex items-center gap-2 max-w-[160px] text-xs shrink-0">
              <FileIcon type={file.type} className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 font-medium truncate">{file.name}</p>
                <p className="text-slate-500 text-[10px]">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <span className="text-[10px] text-slate-500 shrink-0 font-medium ml-auto">
            {attachments.length} adjunto{attachments.length > 1 ? 's' : ''} ({formatBytes(totalSize)})
          </span>
        </div>
      )}

      {/* ── 6. Bottom Chat Input Bar ── */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#202c33] border-t border-[#222e35] flex items-center gap-2 shrink-0">
        
        {/* Attachments input triggers */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar archivos"
          className={clsx(
            "p-2.5 rounded-full text-slate-400 hover:text-white transition-colors shrink-0",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700/50"
          )}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={isDisabled}
        />

        {/* Text Input area */}
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={activeEmail ? "Escribe un mensaje aquí..." : "Esperando conexión del receptor..."}
          disabled={isDisabled}
          className="flex-1 bg-[#2a3942] border-none text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none placeholder-slate-400 w-full disabled:opacity-50"
        />

        {/* Circular Send Button */}
        <button
          type="submit"
          disabled={isDisabled || !messageText.trim()}
          className={clsx(
            "p-2.5 rounded-full text-white transition-all flex items-center justify-center shrink-0 shadow-md",
            isDisabled || !messageText.trim()
              ? "bg-[#202c33] text-slate-500 cursor-not-allowed"
              : "bg-[#00a884] hover:bg-[#008f72] hover:scale-105 active:scale-95"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

    </div>
  );
}
