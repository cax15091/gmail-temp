import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MessageSquareText } from 'lucide-react';
import SenderForm from './components/SenderForm';

const API_URL = 'https://gmail-temp-production.up.railway.app/api';
const SOCKET_URL = 'https://gmail-temp-production.up.railway.app';

function App() {
  const [socket, setSocket] = useState(null);
  const [activeEmail, setActiveEmail] = useState(null);
  const [messages, setMessages] = useState([]);

  // 1. Fetch the latest active email on load
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await axios.get(`${API_URL}/emails/latest`);
        setActiveEmail(response.data);
      } catch (err) {
        console.log('No active email found yet.');
      }
    };
    fetchLatest();
  }, []);

  // 2. Setup Socket.IO connection and listen for new active emails and new messages
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('new_active_email', (emailData) => {
      setActiveEmail(emailData);
      setMessages([]); // Clear chat for new email session
    });

    newSocket.on('new_message', (msg) => {
      setMessages(prev => {
        // Prevent duplicate appends
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => newSocket.close();
  }, []);

  // 3. Join Socket.IO room and fetch existing messages when active email changes
  useEffect(() => {
    if (socket && activeEmail) {
      // Join room to receive real-time messages
      socket.emit('join_email', activeEmail.email);

      // Fetch message history
      axios.get(`${API_URL}/emails/${activeEmail.email}`)
        .then(res => {
          // Message history from backend is usually sorted descending, let's reverse it to chronological order for chat
          const sortedMsgs = (res.data.messages || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          setMessages(sortedMsgs);
        })
        .catch(() => {
          setMessages([]);
        });
    } else {
      setMessages([]);
    }
  }, [socket, activeEmail]);

  return (
    <div className="min-h-screen bg-[slate-950] p-3 md:p-8 font-sans flex items-center justify-center text-[#e9edef]">
      <div className="max-w-4xl w-full space-y-6 md:space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-blue-700/10 rounded-full mb-1">
            <MessageSquareText className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-blue-400 text-transparent bg-clip-text">
            Chat Panel
          </h1>
          <p className="text-[#8696a0] text-xs md:text-sm">
            Panel de chat en tiempo real estilo WhatsApp. Conversa directamente con el receptor del correo temporal.
          </p>
        </div>

        {/* Status indicator */}
        <div className="bg-[slate-900] border border-[slate-800] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeEmail ? 'bg-[blue-600]' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${activeEmail ? 'bg-[blue-600]' : 'bg-red-500'}`}></span>
            </div>
            <span className="font-semibold text-slate-200 text-sm">
              {activeEmail ? 'Conexión Activa' : 'Esperando Generador'}
            </span>
          </div>
          <div className="text-xs md:text-sm px-4 py-2 bg-[#2a3942] rounded-lg text-slate-300 font-mono break-all max-w-full">
            Destinatario: {activeEmail ? activeEmail.email : 'Ninguno'}
          </div>
        </div>

        {/* Sender Form (Chat Interface) */}
        <div className="bg-[slate-900] border border-[slate-800] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <SenderForm activeEmail={activeEmail} messages={messages} setMessages={setMessages} />
        </div>
      </div>
    </div>
  );
}

export default App;
