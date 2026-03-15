import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Character } from '@/lib/characters';

interface TypingIndicatorProps {
  character: Character;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ character }) => {
  return (
    <div className="flex gap-2 px-4 py-1 animate-bubble-in">
      <Avatar className="w-7 h-7 mt-1 shrink-0">
        <AvatarImage src={character.avatar} alt={character.name} />
        <AvatarFallback className="text-xs">{character.emoji}</AvatarFallback>
      </Avatar>
      <div className="bg-wa-bubble-in rounded-lg rounded-tl-none px-4 py-3">
        <div className="flex gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground inline-block" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
