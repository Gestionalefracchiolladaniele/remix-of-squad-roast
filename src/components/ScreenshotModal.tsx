import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Character } from '@/lib/characters';
import { X } from 'lucide-react';

interface ScreenshotModalProps {
  message: {
    text: string;
    timestamp: Date;
    isUser: boolean;
    imageUrl?: string;
    replyTo?: string;
  };
  character?: Character;
  onClose: () => void;
}

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ message, character, onClose }) => {
  const timeStr = message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Message bubble */}
      <div
        className="max-w-[85%] w-full max-w-md px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
          {!message.isUser && character && (
            <Avatar className="w-8 h-8 mt-1 shrink-0">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="text-xs">{character.emoji}</AvatarFallback>
            </Avatar>
          )}

          <div
            className={`relative max-w-[85%] rounded-lg px-3 py-2 ${
              message.isUser
                ? 'bg-wa-bubble-out rounded-tr-none'
                : 'bg-wa-bubble-in rounded-tl-none'
            }`}
          >
            {!message.isUser && character && (
              <p className="text-xs font-semibold mb-0.5" style={{ color: `hsl(${character.color})` }}>
                {character.name} {character.emoji}
              </p>
            )}

            {message.replyTo && (
              <div className="border-l-2 border-primary pl-2 mb-1 py-1 bg-secondary/30 rounded-r text-xs text-muted-foreground truncate">
                {message.replyTo}
              </div>
            )}

            {message.imageUrl && (
              <img src={message.imageUrl} alt="" className="rounded-md mb-1 max-w-full max-h-72 object-cover" />
            )}

            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.text}</p>

            <p className="text-[10px] text-muted-foreground text-right mt-0.5 -mb-0.5">
              {timeStr}
              {message.isUser && <span className="ml-1 text-primary">✓✓</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotModal;
