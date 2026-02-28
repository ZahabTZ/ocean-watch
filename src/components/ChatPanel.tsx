import { useState, useRef, useEffect, useMemo } from 'react';
import { queryKnowledgeBase } from '@/lib/complianceChat';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnboarding } from '@/hooks/use-onboarding';
import { buildUserProfile } from '@/lib/userProfile';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DEFAULT_QUESTIONS = [
  "What changed this week that affects my tuna fleet?",
  "Am I compliant in Zone 4 right now?",
  "What do I need to do before March?",
  "Show me my fleet status",
];

function formatMarkdown(text: string): JSX.Element {
  // Simple markdown renderer for bold, headers, bullets
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-xs font-bold text-foreground mt-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('---')) {
          return <hr key={i} className="border-border my-2" />;
        }
        // Bold
        const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <p key={i} className="text-[11px] text-muted-foreground leading-relaxed pl-2" dangerouslySetInnerHTML={{ __html: formatted }} />
          );
        }
        if (line.trim() === '') return <br key={i} />;
        return (
          <p key={i} className="text-[11px] text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      })}
    </div>
  );
}

export function ChatPanel() {
  const { data: onboardingData } = useOnboarding();
  const profile = useMemo(() => onboardingData ? buildUserProfile(onboardingData) : null, [onboardingData]);

  const suggestedQuestions = useMemo(() => {
    if (!profile || !profile.zones.length) return DEFAULT_QUESTIONS;
    const zone = profile.zones[0];
    const species = profile.species.length > 0 ? profile.species[0] : 'tuna';
    return [
      `What changed this week that affects my ${species.toLowerCase()} fleet?`,
      `Am I compliant in ${zone} right now?`,
      "What do I need to do before March?",
      "Show me my fleet status",
    ];
  }, [profile]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm your compliance intelligence assistant. I've already read and structured all recent RFMO updates for your fleet. Ask me anything — quotas, closures, deadlines, vessel status.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate brief processing time
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));

    const result = queryKnowledgeBase(text, profile ?? undefined);

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: result.answer,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMsg]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 border border-primary/20">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Compliance Assistant</h2>
            <p className="text-[9px] font-mono text-muted-foreground">Querying structured RFMO knowledge base</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary/20 border border-primary/30'
                  : 'bg-card border border-border'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-xs text-foreground">{msg.content}</p>
              ) : (
                formatMarkdown(msg.content)
              )}
              <span className="text-[9px] font-mono text-muted-foreground mt-1 block">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 h-6 w-6 rounded-md bg-secondary border border-border flex items-center justify-center mt-0.5">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggested questions — only show at start */}
        {messages.length === 1 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Try asking:</span>
            {suggestedQuestions.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="block w-full text-left text-[11px] text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-md px-3 py-2 transition-colors font-mono"
              >
                "{q}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card/50 p-3">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about quotas, closures, deadlines, compliance..."
            className="flex-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-30 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
