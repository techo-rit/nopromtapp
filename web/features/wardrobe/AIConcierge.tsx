import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WardrobeOutfit, WardrobeGarment, RefinementButton } from '../../types';
import { sendChatMessage } from './wardrobeService';
import { OutfitCard } from './OutfitCard';

interface AIConciergeProps {
  user: any;
  onLoginRequired?: () => void;
  onTryOn?: (outfit: WardrobeOutfit) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  outfits?: (WardrobeOutfit & { garments: WardrobeGarment[] })[];
  refinement_buttons?: RefinementButton[];
}

export const AIConcierge: React.FC<AIConciergeProps> = ({ user, onLoginRequired, onTryOn }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "What's the vibe today? Tell me the occasion and I'll pull looks from your wardrobe.",
      refinement_buttons: [
        { label: 'Date Night', emoji: '💕', filter_patch: { occasion: ['date'] } },
        { label: 'Office Ready', emoji: '💼', filter_patch: { occasion: ['office'] } },
        { label: 'Party Mode', emoji: '🎉', filter_patch: { occasion: ['party'] } },
        { label: 'Casual Day', emoji: '☀️', filter_patch: { occasion: ['casual'] } },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (text?: string, buttonFilter?: Record<string, any>) => {
    if (loading) return;
    if (!text && !buttonFilter) return;

    if (text) {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setInput('');
    }

    setLoading(true);
    try {
      const resp = await sendChatMessage({
        message: text,
        session_id: sessionId || undefined,
        button_filter: buttonFilter,
      });

      setSessionId(resp.session_id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: resp.message,
          outfits: resp.outfits as any,
          refinement_buttons: resp.refinement_buttons,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) send(input.trim());
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="text-5xl mb-6">✨</div>
        <h2 className="font-['Playfair_Display'] text-2xl text-white mb-3">Style Concierge</h2>
        <p className="text-[14px] text-[#777] max-w-[300px] mb-8 leading-relaxed">
          Sign in to chat with your AI stylist and discover outfits from your wardrobe.
        </p>
        <button
          onClick={onLoginRequired}
          className="px-8 py-3 rounded-xl text-[13px] uppercase tracking-[0.15em] font-semibold
            bg-gradient-to-r from-[#c9a962] to-[#d4b872] text-[#0a0a0a]
            hover:from-[#d4b872] hover:to-[#c9a962] active:scale-[0.98] transition-all"
        >
          Sign In to Start
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#1e1e1e] shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#222] transition-colors mr-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c9a962] to-[#d4b872] flex items-center justify-center">
            <span className="text-[12px]">✨</span>
          </div>
          <span className="font-['Playfair_Display'] text-[15px] text-white">Style Concierge</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? '' : ''}`}>
              {/* Message bubble */}
              <div
                className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#c9a962]/15 text-[#c9a962] rounded-br-sm'
                    : 'bg-[#141414] text-[#ccc] border border-[#1e1e1e] rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>

              {/* Outfit results */}
              {msg.outfits && msg.outfits.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {msg.outfits.slice(0, 4).map(outfit => (
                    <OutfitCard key={outfit.id} outfit={outfit} onTryOn={onTryOn} />
                  ))}
                </div>
              )}

              {/* Refinement buttons */}
              {msg.refinement_buttons && msg.refinement_buttons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.refinement_buttons.map((btn, j) => (
                    <button
                      key={j}
                      onClick={() => send(undefined, btn.filter_patch)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                        bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c9a962]/40
                        text-[12px] text-[#aaa] hover:text-[#c9a962] transition-all
                        disabled:opacity-50"
                    >
                      {btn.emoji && <span>{btn.emoji}</span>}
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#c9a962] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#c9a962] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#c9a962] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[#1e1e1e] px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe the vibe you want..."
          className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-2.5
            text-[13px] text-white placeholder-[#555]
            focus:border-[#c9a962]/40 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#d4b872]
            flex items-center justify-center shrink-0
            disabled:opacity-30 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </form>
    </div>
  );
};
