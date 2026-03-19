import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Character } from '@/lib/characters';
import logoButterfly from '@/assets/logo-butterfly.png';

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
      onDoubleClick={onClose}
    >
      <div className="w-full wa-pattern py-3">
        <div className={`flex gap-2 px-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
          {!message.isUser && character && (
            <Avatar className="w-9 h-9 mt-1 shrink-0">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="text-xs">{character.emoji}</AvatarFallback>
            </Avatar>
          )}

          <div
            className={`relative rounded-lg px-3 py-2 ${
              message.isUser
                ? 'bg-wa-bubble-out rounded-tr-none max-w-[80%]'
                : 'bg-wa-bubble-in rounded-tl-none max-w-[80%]'
            }`}
          >
            {!message.isUser && character && (
              <p className="text-sm font-semibold mb-0.5" style={{ color: `hsl(${character.color})` }}>
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

            <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">{message.text}</p>

            <p className="text-[11px] text-muted-foreground text-right mt-0.5 -mb-0.5 flex items-center justify-end gap-1">
              <span>{timeStr}</span>
              <img src={logoButterfly} alt="" className="w-7 h-7 object-contain inline-block" />
              {message.isUser && <span className="text-primary">✓✓</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotModal;
