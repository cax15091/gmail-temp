import { formatDistanceToNow } from 'date-fns';
import { MailOpen, Inbox } from 'lucide-react';
import { useState } from 'react';

export default function MessageList({ messages }) {
  const [selectedMessage, setSelectedMessage] = useState(null);

  if (!messages || messages.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-full">
          <Inbox className="w-8 h-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-slate-300">Your inbox is empty</h3>
          <p className="text-slate-500">Waiting for incoming messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* List */}
      <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h3 className="font-medium text-slate-200">Messages ({messages.length})</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {messages.map((msg) => (
            <button
              key={msg._id}
              onClick={() => setSelectedMessage(msg)}
              className={`w-full text-left p-4 rounded-xl transition-all ${
                selectedMessage?._id === msg._id 
                  ? 'bg-indigo-600/20 border border-indigo-500/30' 
                  : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/80'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-200 truncate pr-2">{msg.sender}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-400 truncate">{msg.subject}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl h-[600px] flex flex-col overflow-hidden">
        {selectedMessage ? (
          <>
            <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-900/80">
              <h2 className="text-2xl font-bold text-slate-100">{selectedMessage.subject}</h2>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                  {selectedMessage.sender.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-200">{selectedMessage.sender}</p>
                  <p className="text-slate-500">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedMessage.message}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <MailOpen className="w-12 h-12 opacity-20" />
            <p>Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
}
