import React, { useState, useEffect, useRef } from 'react';
import { generateInventoryInsights } from '../services/geminiService';
import { getInventory } from '../services/storageService';
import { ChatMessage, InventoryItem } from '../types';
import { Send, Bot, User, Sparkles } from 'lucide-react';

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Olá! Sou a Nutri IA. Posso ajudar com sugestões de cardápio baseadas no seu estoque atual ou tirar dúvidas sobre o PNAE. O que precisa hoje?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const inventory: InventoryItem[] = getInventory();
    const responseText = await generateInventoryInsights(inventory, userMsg.text);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen bg-slate-100">
      <header className="bg-white border-b px-4 py-3 flex items-center shadow-sm">
        <div className="p-2 bg-purple-100 rounded-lg mr-3">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800">Nutri IA</h1>
          <p className="text-xs text-slate-500">Assistente Inteligente (Gemini)</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl shadow-sm text-sm md:text-base ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-75 text-xs">
                 {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                 <span>{msg.role === 'user' ? 'Você' : 'Nutri IA'}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Sugira uma receita com o feijão disponível..."
            className="flex-1 p-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiAssistant;
