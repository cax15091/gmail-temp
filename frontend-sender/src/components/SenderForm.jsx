import { useState } from 'react';
import axios from 'axios';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';

export default function SenderForm({ activeEmail }) {
  const [formData, setFormData] = useState({
    sender: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEmail) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/messages`, {
        ...formData,
        emailAddress: activeEmail.email
      });
      setSuccess(true);
      setFormData({ sender: '', subject: '', message: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send message', error);
      alert('Failed to send message. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !activeEmail || loading;

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl flex items-center space-x-3 mb-6 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span>Message sent successfully!</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Sender Name</label>
          <input
            required
            type="text"
            name="sender"
            value={formData.sender}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={isDisabled}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
          <input
            required
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Hello there!"
            disabled={isDisabled}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
          <textarea
            required
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Type your message here..."
            disabled={isDisabled}
            rows={5}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className={clsx(
          "w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center space-x-2",
          isDisabled ? "bg-emerald-600/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25"
        )}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span>Send Message</span>
            <Send className="w-5 h-5 ml-1" />
          </>
        )}
      </button>
    </form>
  );
}
