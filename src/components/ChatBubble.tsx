import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Character } from '@/lib/characters';
import logoButterfly from '@/assets/logo-butterfly.png';

interface ChatBubbleProps {
  text: string;
  character?: Character;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  replyTo?: string;
  animationDelay?: number;
  onDoubleClick?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  character,
  isUser,
  timestamp,
  imageUrl,
  replyTo,
  animationDelay = 0,
  onDoubleClick,
}) => {
  const timeStr = timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`flex gap-2 px-4 py-1 animate-bubble-in cursor-pointer select-none ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onDoubleClick={onDoubleClick}
    >
      {!isUser && character && (
        <Avatar className="w-7 h-7 mt-1 shrink-0">
          <AvatarImage src={character.avatar} alt={character.name} />
          <AvatarFallback className="text-xs">{character.emoji}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={`relative max-w-[75%] rounded-lg px-3 py-1.5 ${
          isUser
            ? 'bg-wa-bubble-out rounded-tr-none'
            : 'bg-wa-bubble-in rounded-tl-none'
        }`}
      >
        {/* Character name */}
        {!isUser && character && (
          <p className="text-xs font-semibold mb-0.5" style={{ color: `hsl(${character.color})` }}>
            {character.name} {character.emoji}
          </p>
        )}

        {/* Reply bar */}
        {replyTo && (
          <div className="border-l-2 border-primary pl-2 mb-1 py-1 bg-secondary/30 rounded-r text-xs text-muted-foreground truncate">
            {replyTo}
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <img src={imageUrl} alt="Uploaded" className="rounded-md mb-1 max-w-full max-h-64 object-cover" />
        )}

        {/* Text */}
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>

        {/* Time + Logo */}
        <p className="text-[10px] text-muted-foreground text-right mt-0.5 -mb-0.5 flex items-center justify-end gap-1">
          <span>{timeStr}</span>
          <img src={logoButterfly} alt="" className="w-7 h-7 object-contain inline-block" />
          {isUser && <span className="text-primary">✓✓</span>}
        </p>
      </div>
    </div>
  );
};

export default ChatBubble;
