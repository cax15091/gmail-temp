import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { SendHorizontal } from 'lucide-react';
import SenderForm from './components/SenderForm';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [activeEmail, setActiveEmail] = useState(null);

  // Fetch the latest active email on load
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

  // Listen for new active emails being generated in real-time
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('new_active_email', (emailData) => {
      setActiveEmail(emailData);
    });

    return () => newSocket.close();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full mb-2">
            <SendHorizontal className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text">
            Sender Panel
          </h1>
          <p className="text-slate-400">
            Send messages directly to the active temporary email.
          </p>
        </div>

        {/* Status indicator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeEmail ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${activeEmail ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </div>
            <span className="font-medium text-slate-300">
              {activeEmail ? 'Active Connection' : 'Waiting for Receiver'}
            </span>
          </div>
          <div className="text-sm px-4 py-2 bg-slate-800 rounded-lg text-slate-300 font-mono">
            Target: {activeEmail ? activeEmail.email : 'None'}
          </div>
        </div>

        {/* Sender Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <SenderForm activeEmail={activeEmail} />
        </div>
      </div>
    </div>
  );
}

export default App;
