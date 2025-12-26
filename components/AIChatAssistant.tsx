
import React, { useState, useRef, useEffect } from 'react';
import { DataRow, ChatMessage } from '../types';
import { chatWithData } from '../services/geminiService';
import { BotIcon, SendIcon, XCircleIcon, MinimizeIcon, ExpandIcon } from './icons';

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow[];
  headers: string[];
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ isOpen, onClose, data, headers }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'أهلاً بك! أنا مساعدك الذكي لتحليل البيانات. يمكنك أن تسألني أي شيء عن البيانات المعروضة حاليًا.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
        scrollToBottom();
    }
  }, [messages, isLoading, isMinimized]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: trimmedInput };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await chatWithData(headers, data, currentMessages, trimmedInput);
      const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error in AI Chat Assistant:", error);
      const errorMessage: ChatMessage = {
        sender: 'ai',
        text: 'عذرًا، حدث خطأ أثناء محاولة الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };
  
  // Focus input when chat is opened or restored from minimized state
  useEffect(() => {
    if (isOpen && !isMinimized) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);


  if (!isOpen) return null;

  if (isMinimized) {
      return (
        <div
            className="fixed bottom-8 right-24 bg-white rounded-t-lg shadow-xl w-80 flex flex-col z-40"
        >
            <header className="flex justify-between items-center p-3 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center space-x-2 space-x-reverse cursor-pointer" onClick={() => setIsMinimized(false)}>
                <BotIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-md font-bold text-gray-800">المساعد الذكي للبيانات</h3>
              </div>
              <div className="flex items-center space-x-1">
                 <button onClick={() => setIsMinimized(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full" title="استعادة">
                    <ExpandIcon className="w-5 h-5" />
                 </button>
                 <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full" title="إغلاق">
                    <XCircleIcon className="w-5 h-5" />
                 </button>
              </div>
            </header>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2 space-x-reverse">
            <BotIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">المساعد الذكي للبيانات</h3>
          </div>
          <div className="flex items-center space-x-1">
             <button onClick={() => setIsMinimized(true)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full" title="تصغير">
                <MinimizeIcon className="w-6 h-6" />
             </button>
             <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full" title="إغلاق">
                <XCircleIcon className="w-6 h-6" />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><BotIcon className="w-5 h-5 text-blue-600" /></div>}
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-600 text-white rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><BotIcon className="w-5 h-5 text-blue-600" /></div>
               <div className="max-w-[80%] p-3 rounded-2xl bg-gray-600 rounded-bl-none text-white">
                   <div className="flex items-center space-x-1 space-x-reverse">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                   </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 border-t">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اسأل عن البيانات..."
              className="w-full p-3 pl-4 pr-12 border rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-400"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AIChatAssistant;
