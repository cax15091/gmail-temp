import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Mail, Clock, RefreshCw } from 'lucide-react';
import EmailGenerator from './components/EmailGenerator';
import Countdown from './components/Countdown';
import MessageList from './components/MessageList';

const API_URL = 'https://wise-jars-shine.loca.lt/api';
const SOCKET_URL = 'https://wise-jars-shine.loca.lt';

function App() {
  const [socket, setSocket] = useState(null);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('new_message', (msg) => {
      setMessages((prev) => [msg, ...prev]);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && currentEmail) {
      socket.emit('join_email', currentEmail.email);
    }
  }, [socket, currentEmail]);

  const generateEmail = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/emails`);
      setCurrentEmail(response.data);
      setMessages([]);
      setRefreshKey(prev => prev + 1); // Reset countdown
    } catch (error) {
      console.error('Failed to generate email', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!currentEmail) return;
    try {
      const response = await axios.get(`${API_URL}/emails/${currentEmail.email}`);
      setMessages(response.data.messages);
      setRefreshKey(prev => prev + 1); // Reset countdown
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-2">
            <Mail className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
            TempMail Pro
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Your premium, real-time disposable email service. Protect your privacy and avoid spam.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <EmailGenerator 
            currentEmail={currentEmail} 
            onGenerate={generateEmail} 
            loading={loading} 
          />

          {currentEmail && (
            <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Auto-refreshing in:</span>
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-200">Inbox</h2>
              <button 
                onClick={fetchMessages}
                className="flex items-center space-x-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Now</span>
              </button>
            </div>
            
            <MessageList messages={messages} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
