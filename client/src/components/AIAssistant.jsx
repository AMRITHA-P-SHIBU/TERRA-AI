import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Leaf, 
  Lightbulb, 
  RotateCcw,
  User,
  CheckCircle,
  Copy
} from 'lucide-react';

export default function AIAssistant({ initialSuggestions }) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! I am your Terra AI Eco Assistant 🌿. I can help you with composting guides, zero-waste alternatives, circular recycling, upcycling crafts (like coconut shells!), and lowering your personal carbon footprint. What sustainable habit are you exploring today?",
      timestamp: 'Just now'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateAIResponse = (userPrompt) => {
    const lower = userPrompt.toLowerCase();

    if (lower.includes('compost') || lower.includes('smell') || lower.includes('balcony')) {
      return `### How to maintain an odor-free balcony compost bin 🪴:

1. **The 3:1 Brown to Green Ratio**: Always add 3 handfuls of "browns" (dry leaves, cocopeat, crushed egg cartons, or cardboard shreds) for every 1 handful of "greens" (vegetable peels, tea dregs, fruit scraps). Browns absorb moisture and eliminate odors.
2. **Avoid Cooked Food & Dairy**: Never put oily curries, bones, meat, or milk products in a basic apartment bin. These attract pests and smell.
3. **Aeration (Oxygen)**: Stir your compost pile once a week. Anaerobic bacteria (which thrive without air) produce bad odors; aerating brings good aerobic microbes!
4. **Use Microbial Inoculant / Buttermilk**: A splash of sour buttermilk or bio-inoculant powder accelerates decomposition without odor.

*Pro-tip: Check our **Eco Exchange Hub** to find pre-loved terracotta Khamba compost pots in your area!*`;
    }

    if (lower.includes('plastic') || lower.includes('alternative') || lower.includes('kitchen')) {
      return `### Practical plastic-free swaps for home & kitchen 🍶:

1. **Beeswax or Plant-Wax Food Wraps**: Replaces cling wrap for covering bowls and wrapping cut fruits. Washable and lasts over a year.
2. **Stainless Steel or Glass Storage**: Ditch plastic containers for pantry pulses and refrigerated leftovers to avoid microplastic leaching.
3. **Natural Loofah & Coconut Coir Scrubbers**: Replace synthetic plastic dish sponges with dried ridge gourd loofah or coconut husk scrubbers. They biodegrade 100% in your compost bin!
4. **Cotton / Jute Produce Bags**: Keep 4-5 lightweight cloth bags in your vehicle or backpack for weekly vegetable market trips.`;
    }

    if (lower.includes('coconut') || lower.includes('upcycle') || lower.includes('craft')) {
      return `### 4 Creative ways to upcycle coconut shells 🥥:

1. **Balcony Succulent & Hanging Planter**: Sand down the outer fibers with sandpaper, drill 2 drainage holes at the bottom and 3 on the rim for jute ropes. Rub with coconut oil for a water-resistant polish.
2. **Natural Soy Candle Cups**: Secure a wooden or cotton wick to the shell base and pour melted soy wax with lemongrass or lavender essential oils.
3. **Zero-Waste Soap Dish**: Cut shell in half and drill small drainage holes so soap never sits in soggy water.
4. **Organic Seed Starter Bowls**: Use directly as biodegradable seedling pots. When roots sprout, you can plant the entire shell into soil!

*Share your finished craft on **GreenFeed** to earn +25 EcoPoints!*`;
    }

    if (lower.includes('electricity') || lower.includes('energy') || lower.includes('solar') || lower.includes('ac')) {
      return `### Smart ways to cut electricity emissions & bills ⚡:

1. **The 24°C Rule for Air Conditioners**: Setting your AC at 24°C instead of 18°C consumes 20-30% less electricity while providing optimal cooling.
2. **Switch to 5-Star Inverter Appliances**: Replacing old non-inverter refrigerators or fans with BLDC motor fans cuts ceiling fan power draw from 75W to 28W.
3. **Phantom Load Elimination**: Electronics on standby (TV boxes, microwave clocks, laptop chargers) consume up to 8% of residential power. Switch off plug sockets when idle.
4. **Rooftop Solar Feasibility**: Even a 2kW grid-tied rooftop solar array offsets ~240 units/month, eliminating almost 2 tons of CO₂ annually.`;
    }

    return `### Personalized Sustainability Advice 🌿:

Thank you for your question regarding **"${userPrompt}"**!

Here is how you can take meaningful eco-friendly action:
- **Small Everyday Habits**: Sustainable living isn't about perfection by a few people; it's about millions practicing small, conscious choices daily.
- **Circular Mindset**: Before buying new, check if you can borrow, repair, or find it on the **Eco Exchange Hub**.
- **Community Impact**: Log your activity on **GreenFeed** to inspire friends and neighbors to join the green transition.

Would you like specific step-by-step guidance on composting, zero-waste products, or calculating your emission footprint?`;
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.reply,
          timestamp: 'Just now',
          source: data.source
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fallback to local sustainability engine if backend is offline
    }

    setTimeout(() => {
      const replyText = generateAIResponse(query);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: 'Just now'
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-emerald-400/20">
            <Bot className="w-3.5 h-3.5 text-emerald-300" />
            <span>AI Eco Assistant (Powered by LLM)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Your 24/7 AI Sustainability Advisor
          </h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Instant guidance on composting, zero-waste living, upcycling waste items, home energy efficiency, and eco-friendly shopping alternatives.
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
          {initialSuggestions.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 transition-all text-left shadow-xs cursor-pointer"
            >
              🌿 {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[540px] overflow-hidden">
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[10px] mt-2 font-medium ${
                      isUser ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 rounded-tl-none text-slate-500 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px] font-medium">Terra AI is generating guidance...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
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
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
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
