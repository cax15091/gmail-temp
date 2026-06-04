import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Mail, Clock, RefreshCw, Bell, BellOff } from 'lucide-react';
import EmailGenerator from './components/EmailGenerator';
import Countdown from './components/Countdown';
import MessageList from './components/MessageList';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';
const SOCKET_URL = 'https://gmail-temp-production.up.railway.app';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function App() {
  const [socket, setSocket] = useState(null);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifAllowed, setNotifAllowed] = useState(Notification.permission === 'granted');
  const [newMsgCount, setNewMsgCount] = useState(0);

  // ─── Restore email from localStorage on mount ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('tempmail_email');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCurrentEmail(parsed);
      // Fetch existing messages from backend for the saved email
      axios.get(`${API_URL}/emails/${parsed.email}`)
        .then(res => setMessages(res.data.messages || []))
        .catch(() => {});
    }
  }, []);

  // ─── Socket.IO setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('new_message', (msg) => {
      setMessages(prev => [msg, ...prev]);
      setNewMsgCount(n => n + 1);

      // Use SW-based notification so it works in both browser AND installed PWA mode
      if (Notification.permission === 'granted') {
        const notifPayload = {
          body: `De: ${msg.sender}\nAsunto: ${msg.subject}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'new-message',
          renotify: true,
          vibrate: [200, 100, 200],
        };

        // Installed PWA / standalone: must go through Service Worker
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('📬 TempMail Pro — Nuevo mensaje', notifPayload);
          }).catch(() => {
            // Fallback to regular notification if SW fails
            new Notification('📬 TempMail Pro — Nuevo mensaje', notifPayload);
          });
        } else {
          // Browser tab (not installed): regular Notification works fine
          new Notification('📬 TempMail Pro — Nuevo mensaje', notifPayload);
        }
      }
    });

    return () => newSocket.close();
  }, []);

  // ─── Join socket room when email changes ───────────────────────────────────
  useEffect(() => {
    if (socket && currentEmail) {
      socket.emit('join_email', currentEmail.email);
    }
  }, [socket, currentEmail]);

  // ─── Generate new email ────────────────────────────────────────────────────
  const generateEmail = async () => {
    setLoading(true);
    try {
      // Request notification permission on first email generation
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        setNotifAllowed(perm === 'granted');
      }
      const response = await axios.post(`${API_URL}/emails`);
      const email = response.data;
      setCurrentEmail(email);
      setMessages([]);
      setNewMsgCount(0);
      localStorage.setItem('tempmail_email', JSON.stringify(email));
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to generate email', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch messages (auto-refresh) ─────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    const saved = localStorage.getItem('tempmail_email');
    if (!saved) return;
    const email = JSON.parse(saved);
    try {
      const response = await axios.get(`${API_URL}/emails/${email.email}`);
      setMessages(response.data.messages || []);
      setNewMsgCount(0);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
    setRefreshKey(prev => prev + 1); // reset countdown
  }, []);

  const handleRefreshNow = () => {
    fetchMessages();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-3 md:p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fade-in">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-1">
            <Mail className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
            TempMail Pro
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-xs md:text-sm">
            Tu servicio de correo temporal premium en tiempo real estilo chat. Mantén tu bandeja limpia y tu privacidad a salvo.
          </p>

          {/* Notification toggle */}
          <button
            onClick={async () => {
              const perm = await Notification.requestPermission();
              setNotifAllowed(perm === 'granted');
            }}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all bg-slate-900"
          >
            {notifAllowed
              ? <><Bell className="w-3 h-3 text-indigo-400" /> Notificaciones activas</>
              : <><BellOff className="w-3 h-3 text-slate-500" /> Activar notificaciones</>
            }
          </button>
        </div>

        {/* Main Card (Generator) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl space-y-4">
          <EmailGenerator
            currentEmail={currentEmail}
            onGenerate={generateEmail}
            loading={loading}
          />

          {currentEmail && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs md:text-sm">Expiración y refresco en:</span>
              </div>
              <Countdown
                key={refreshKey}
                minutes={6}
                onExpire={fetchMessages}
              />
            </div>
          )}
        </div>

        {/* Inbox Section */}
        {currentEmail && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-slate-100">Bandeja de Entrada</h2>
                {newMsgCount > 0 && (
                  <span className="px-2.5 py-0.5 text-[10px] bg-indigo-500 text-white rounded-full animate-pulse font-bold">
                    +{newMsgCount} nuevo{newMsgCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={handleRefreshNow}
                className="flex items-center space-x-2 text-xs md:text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refrescar ahora</span>
              </button>
            </div>

            <MessageList messages={messages} currentEmail={currentEmail} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
