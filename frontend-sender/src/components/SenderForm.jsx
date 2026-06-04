import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, Loader2, Paperclip, X, File, Image, 
  FileText, FileArchive, Download, Settings, 
  ChevronUp, ChevronDown, Check, Smile, MoreVertical,
  User, MessageSquare
} from 'lucide-react';
import clsx from 'clsx';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';
const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_MB = 25;

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
        ? "border-blue-400/30 bg-blue-500/20 hover:bg-blue-600/40" 
        : "border-slate-600/60 bg-slate-700/40 hover:bg-slate-700/70"
    )}>
      {isImage && (
        <img src={file.data} alt={file.name}
          className="w-full max-h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleDownload}
        />
      )}
      <div className="flex items-center gap-2 p-2">
        <FileIcon type={file.type} className="w-4 h-4 text-blue-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-100 truncate font-medium">{file.name}</p>
          <p className="text-slate-400 text-[10px]">{formatBytes(file.size)}</p>
        </div>
        <button onClick={handleDownload} title="Descargar"
          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-600/40 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function SenderForm({ activeEmail, messages, setMessages }) {
  const [senderName, setSenderName] = useState(() => localStorage.getItem('sender_name') || '');
  const [subject, setSubject] = useState(() => localStorage.getItem('sender_subject') || '');
  const [setupComplete, setSetupComplete] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current && setupComplete) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, setupComplete]);

  // Reset setup when activeEmail changes
  useEffect(() => {
    if (activeEmail) {
      setSetupComplete(false);
      // Optional: Clear subject when email changes to force a new subject
      setSubject('');
    }
  }, [activeEmail]);

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    if (senderName.trim() && subject.trim()) {
      localStorage.setItem('sender_name', senderName);
      localStorage.setItem('sender_subject', subject);
      setSetupComplete(true);
    }
  };

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
    if (activeEmail && setupComplete) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEmail || !messageText.trim()) return;
    setLoading(true);
    setError('');

    try {
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

  // ─── PANTALLA DE CONFIGURACIÓN INICIAL ───
  if (!setupComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-[550px] bg-slate-950 p-6 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative z-10">
          <div className="text-center mb-8 space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Iniciar Chat</h2>
            <p className="text-sm text-slate-400">Configura tu perfil para contactar al receptor temporal.</p>
          </div>

          <form onSubmit={handleSetupSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Tu Nombre
              </label>
              <input
                required
                autoFocus
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Asunto
              </label>
              <input
                required
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej. Soporte Técnico"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 shadow-inner"
              />
            </div>
            
            <button
              type="submit"
              disabled={!senderName.trim() || !subject.trim()}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:active:scale-100 border border-blue-400 mt-2"
            >
              Comenzar Conversación
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── INTERFAZ DE CHAT ───
  const isDisabled = !activeEmail || loading;
  const totalSize = attachments.reduce((s, f) => s + f.size, 0);

  return (
    <div 
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex flex-col h-[550px] relative bg-slate-950"
    >
      
      {/* ── 1. Header (Recipient info & Config toggler) ── */}
      <div className="p-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 font-bold text-base shrink-0 shadow-inner">
            R
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm">Receptor Temporal</p>
            <div className="flex items-center gap-1.5">
              <span className={clsx("w-2 h-2 rounded-full", activeEmail ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-500")}></span>
              <p className="text-[10px] text-slate-400 font-medium">
                {activeEmail ? 'Conectado y listo' : 'Desconectado'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <button 
            type="button" 
            onClick={() => setShowConfig(c => !c)}
            title="Ajustes de Perfil"
            className={clsx(
              "p-2 rounded-full hover:bg-slate-800 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium border",
              showConfig ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-transparent"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── 2. Collapsible Settings Panel ── */}
      {showConfig && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-3 shrink-0 z-10 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Mi Nombre</label>
              <input
                required
                type="text"
                value={senderName}
                onChange={e => {
                  setSenderName(e.target.value);
                  localStorage.setItem('sender_name', e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Asunto</label>
              <input
                required
                type="text"
                value={subject}
                onChange={e => {
                  setSubject(e.target.value);
                  localStorage.setItem('sender_subject', e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Chat History Scroll Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative bg-gradient-to-b from-slate-950 to-slate-900">
        
        {/* Error message banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs text-center shrink-0 shadow-lg">
            {error}
          </div>
        )}

        {/* Empty chat state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 p-6 space-y-3 select-none">
            <div className="p-4 bg-slate-800 rounded-full shadow-inner border border-slate-700">
              <MessageSquare className="w-8 h-8 text-blue-500/50" />
            </div>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              La conexión está establecida. Escribe un mensaje abajo para comenzar a chatear.
            </p>
          </div>
        )}

        {/* Chat message bubbles */}
        {messages.map((msg) => {
          const isIncoming = msg.subject?.startsWith('Re: ') || msg.sender === 'Yo';
          const isOutgoing = !isIncoming;
          const parsed = parseMessage(msg.message || '');

          return (
            <div key={msg._id} className={clsx(
              "flex w-full",
              isOutgoing ? "justify-end" : "justify-start"
            )}>
              <div className={clsx(
                "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-xl relative break-words flex flex-col gap-1.5",
                isOutgoing 
                  ? "bg-blue-700 text-white rounded-br-sm border border-blue-500" 
                  : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
              )}>
                {/* Bubble sender label */}
                <span className="text-[10px] text-cyan-400 font-bold leading-none select-none">
                  {isOutgoing ? 'Tú' : msg.sender}
                </span>

                {/* Message body with padding bottom to prevent overlap */}
                <p className="whitespace-pre-wrap leading-relaxed text-sm pr-8 pb-5">
                  {parsed.text}
                </p>

                {/* Bubble Attachments */}
                {parsed.attachments?.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/10 mt-1 pb-4">
                    {parsed.attachments.map((file, idx) => (
                      <AttachmentCard key={idx} file={file} isOutgoing={isOutgoing} />
                    ))}
                  </div>
                )}

                {/* Timestamp & checks */}
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

      {/* ── 4. Drag & drop overlay indicator ── */}
      {dragging && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-blue-500 rounded-2xl z-20 m-4 pointer-events-none transition-all">
          <div className="p-6 bg-blue-500/20 rounded-full mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <Paperclip className="w-12 h-12 text-blue-400 animate-bounce" />
          </div>
          <p className="text-lg font-bold text-white tracking-wide">Suelta archivos para adjuntar</p>
          <p className="text-sm text-blue-300 mt-1">Límite de 25MB total</p>
        </div>
      )}

      {/* ── 5. Attachments Preview List (above input bar) ── */}
      {attachments.length > 0 && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-3 overflow-x-auto shrink-0 select-none shadow-inner">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative bg-slate-800 border border-slate-700 rounded-xl p-2.5 flex items-center gap-2.5 max-w-[180px] text-xs shrink-0 shadow-md">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <FileIcon type={file.type} className="w-4 h-4 text-blue-400 shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 font-medium truncate">{file.name}</p>
                <p className="text-slate-500 text-[10px]">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute -top-2 -right-2 bg-slate-700 hover:bg-red-500 text-white rounded-full p-1 transition-colors shadow-lg border border-slate-600 hover:border-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <span className="text-[10px] text-slate-500 shrink-0 font-medium ml-auto px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">
            {attachments.length} adjunto{attachments.length > 1 ? 's' : ''} ({formatBytes(totalSize)})
          </span>
        </div>
      )}

      {/* ── 6. Bottom Chat Input Bar ── */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 flex items-center gap-2 shrink-0 z-10">
        
        {/* Attachments input triggers */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar archivos"
          className={clsx(
            "p-3 rounded-xl text-slate-400 hover:text-white transition-all shrink-0",
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800 hover:shadow-inner"
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
          placeholder={activeEmail ? "Escribe un mensaje..." : "Esperando conexión..."}
          disabled={isDisabled}
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-500 w-full disabled:opacity-50 shadow-inner transition-all"
        />

        {/* Circular Send Button */}
        <button
          type="submit"
          disabled={isDisabled || !messageText.trim()}
          className={clsx(
            "p-3.5 rounded-xl text-white transition-all flex items-center justify-center shrink-0 shadow-lg",
            isDisabled || !messageText.trim()
              ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
              : "bg-blue-700 hover:bg-blue-600 hover:scale-105 active:scale-95 border border-blue-400"
          )}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>

    </div>
  );
}
