import { useState, useRef } from 'react';
import axios from 'axios';
import { Send, Loader2, CheckCircle, Paperclip, X, File, Image, FileText, FileArchive } from 'lucide-react';
import clsx from 'clsx';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';

const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_MB = 15;

// Returns a Lucide icon based on file MIME type
function FileIcon({ type, className }) {
  if (type.startsWith('image/')) return <Image className={className} />;
  if (type.includes('pdf') || type.includes('text')) return <FileText className={className} />;
  if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return <FileArchive className={className} />;
  return <File className={className} />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Encode a File object to a base64 data URL
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // result is "data:mime;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SenderForm({ activeEmail }) {
  const [formData, setFormData] = useState({ sender: '', subject: '', message: '' });
  const [attachments, setAttachments] = useState([]); // [{name, type, size, data}]
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Add files after validating size limits
  const addFiles = async (files) => {
    setError('');
    const newAttachments = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de ${MAX_FILE_SIZE_MB}MB por archivo.`);
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

  // Drag & Drop handlers
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEmail) return;
    setLoading(true);
    setError('');

    try {
      // Build the message payload: text + base64 attachments encoded in a special block
      let messagePayload = formData.message;
      if (attachments.length > 0) {
        const attachmentData = attachments.map(({ name, type, size, data }) => ({
          name, type, size, data
        }));
        messagePayload += `\n\n---ATTACHMENTS_JSON---\n${JSON.stringify(attachmentData)}`;
      }

      await axios.post(`${API_URL}/messages`, {
        sender: formData.sender,
        subject: formData.subject,
        message: messagePayload,
        emailAddress: activeEmail.email,
      });

      setSuccess(true);
      setFormData({ sender: '', subject: '', message: '' });
      setAttachments([]);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to send message', err);
      setError('Error al enviar el mensaje. ¿Está activo el backend?');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !activeEmail || loading;
  const totalSize = attachments.reduce((s, f) => s + f.size, 0);

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
      {/* Success banner */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>¡Mensaje enviado correctamente!</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Sender name */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre del remitente</label>
        <input
          required
          type="text"
          name="sender"
          value={formData.sender}
          onChange={handleChange}
          placeholder="Juan Pérez"
          disabled={isDisabled}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Asunto</label>
        <input
          required
          type="text"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="¡Hola!"
          disabled={isDisabled}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Mensaje</label>
        <textarea
          required
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Escribe tu mensaje aquí..."
          disabled={isDisabled}
          rows={4}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50"
        />
      </div>

      {/* Drag & Drop / File upload zone */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4" /> Archivos adjuntos
          <span className="text-slate-600 font-normal">(máx. {MAX_FILE_SIZE_MB}MB por archivo · {MAX_TOTAL_MB}MB total)</span>
        </label>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isDisabled && fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            dragging
              ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]'
              : 'border-slate-700 hover:border-emerald-600/50 hover:bg-slate-800/30',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Paperclip className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            {dragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o haz clic para seleccionar'}
          </p>
          <p className="text-slate-600 text-xs mt-1">Imágenes, PDFs, documentos, etc.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={isDisabled}
        />
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{attachments.length} archivo{attachments.length > 1 ? 's' : ''} seleccionado{attachments.length > 1 ? 's' : ''}</span>
            <span>{formatBytes(totalSize)} en total</span>
          </div>
          {attachments.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
              <FileIcon type={file.type} className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className={clsx(
          'w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2',
          isDisabled
            ? 'bg-emerald-600/50 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]'
        )}
      >
        {loading
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : (<><span>Enviar mensaje</span><Send className="w-4 h-4" /></>)
        }
      </button>
    </form>
  );
}
