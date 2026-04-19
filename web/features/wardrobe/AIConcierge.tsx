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
        { label: 'Date Night', filter_patch: { occasion: ['date'] } },
        { label: 'Office Ready', filter_patch: { occasion: ['office'] } },
        { label: 'Party Mode', filter_patch: { occasion: ['party'] } },
        { label: 'Casual Day', filter_patch: { occasion: ['casual'] } },
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
        <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-gold)"><path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
        </div>
        <h2 className="font-display text-2xl text-primary mb-3">Style Concierge</h2>
        <p className="text-[14px] text-secondary max-w-[300px] mb-8 leading-relaxed">
          Sign in to chat with your AI stylist and discover outfits from your wardrobe.
        </p>
        <button
          onClick={onLoginRequired}
          className="px-8 py-3 rounded-[var(--radius-pill)] text-[13px] uppercase tracking-[0.15em] font-semibold
            bg-gold text-base hover:bg-gold-hover active:scale-[0.97] transition-all
            shadow-[0_0_24px_-4px_rgba(232,195,125,0.25)]"
          style={{ transitionTimingFunction: 'var(--ease-spring)' }}
        >
          Sign In to Start
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex flex-col pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:bg-elevated transition-colors mr-1 min-w-[44px] min-h-[44px]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-base)"><path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
          </div>
          <span className="font-display text-[15px] text-primary">Style Concierge</span>
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
                    ? 'bg-gold-subtle text-gold rounded-br-sm'
                    : 'bg-surface text-secondary border border-border rounded-bl-sm'
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
                        bg-surface border border-border hover:border-gold/40
                        text-[12px] text-secondary hover:text-gold transition-all
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
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe the vibe you want..."
          className="flex-1 bg-surface border border-border rounded-[var(--radius-input)] px-4 py-2.5
            text-[13px] text-primary placeholder-tertiary
            focus:border-gold/40 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-[var(--radius-input)] bg-gold
            flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]
            disabled:opacity-30 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </form>
    </div>
  );
};
