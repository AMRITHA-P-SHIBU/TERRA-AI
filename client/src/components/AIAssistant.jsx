import BackButton from "./BackButton";
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Leaf, 
  Lightbulb, 
  RotateCcw,
  User,
  CheckCircle,
  Copy,
  Zap
} from 'lucide-react';

export default function AIAssistant({ initialSuggestions = [] }) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! I am your **Terra AI Eco Assistant** 🌿.\n\nI can help you with:\n- 🪴 Composting guides & odor-free balcony setups\n- ♻️ Zero-waste alternatives & plastic swaps\n- 🥥 Upcycling crafts & circular DIY ideas\n- ⚡ Energy efficiency & renewable options\n- 📉 Lowering your personal carbon footprint\n\nWhat sustainable habit or question are you exploring today?",
      timestamp: 'Just now',
      source: 'gemini-api'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isTyping) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Build conversation history for context
      const history = messages.slice(-8).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: query,
          history
        }),
      });

      if (response.ok) {
        const text = await response.text();
        let data = {};
        try {
          data = JSON.parse(text);
        } catch {
          data = { reply: text };
        }

        const reply = data.reply || data.response || "I apologize, but I couldn't generate a response. Please try again.";
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source || 'gemini-api'
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      } else {
        const text = await response.text();
        let errData = {};
        try { errData = JSON.parse(text); } catch {}
        console.error('AI chat endpoint returned status:', response.status, errData);
      }
    } catch (err) {
      console.warn('Network issue reaching server AI:', err);
    }

    // Fallback if network or server failed completely
    const fallbackMsg = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: "### 🌱 Sustainability Advice\n\nI'm having trouble connecting to the live AI engine at this exact moment.\n\nHere is a quick eco tip for **\"" + query + "\"**:\n- **Every small effort counts**: Whether reducing energy use, cutting down plastic, or composting at home.\n- **Check our Eco Exchange**: Find tools, seeds, or upcycled materials in your community.\n- **Log on GreenFeed**: Share your sustainable progress with fellow eco-citizens!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'offline-fallback'
    };
    setMessages(prev => [...prev, fallbackMsg]);
    setIsTyping(false);
  };

  const defaultSuggestions = [
    'How can I start a zero-smell compost bin on an apartment balcony?',
    'What are some practical replacements for single-use plastic in the kitchen?',
    'How do I calculate if installing residential solar panels is worth it?',
    'Suggest 5 creative ways to upcycle discarded plastic bottles or coconut shells.'
  ];

  const suggestionsToShow = (initialSuggestions && initialSuggestions.length > 0) 
    ? initialSuggestions 
    : defaultSuggestions;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton fallback="/dashboard/individual" label="Back to Dashboard" />
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-emerald-400/20">
            <Bot className="w-3.5 h-3.5 text-emerald-300" />
            <span>AI Eco Assistant • Powered by Gemini AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Your 24/7 AI Sustainability Advisor
          </h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Real-time, intelligent guidance on composting, zero-waste alternatives, circular upcycling, renewable energy, and personal carbon footprint reduction.
          </p>
        </div>
      </div>

      {/* Quick Prompt Starters */}
      <div className="mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Popular Questions & Prompts:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestionsToShow.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 transition-all text-left shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed relative group ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-slate-800 space-y-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-emerald-900 [&>h3]:mt-2 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-2 [&>strong]:text-emerald-950">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-black/5">
                    <span
                      className={`text-[10px] font-medium ${
                        isUser ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                      {msg.source && !isUser && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 font-medium">
                          {msg.source === 'gemini-api' ? '⚡ Gemini AI' : '🌿 Eco Knowledge'}
                        </span>
                      )}
                    </span>

                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-emerald-600 text-xs p-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 rounded-tl-none text-slate-600 text-xs flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px] font-medium text-emerald-700">Terra AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything (e.g. How to recycle tetra paks or compost citrus peels?)"
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
