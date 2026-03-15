import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Phone, Video, Settings } from 'lucide-react';
import { Character } from '@/lib/characters';

interface ChatHeaderProps {
  groupName: string;
  characters: Character[];
  onSettingsClick: () => void;
  isSingleChat?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ groupName, characters, onSettingsClick, isSingleChat }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-popover border-b border-border">
      <ArrowLeft className="w-5 h-5 text-muted-foreground shrink-0" />
      
      {isSingleChat ? (
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={characters[0]?.avatar} alt={characters[0]?.name} />
          <AvatarFallback className="text-xs">{characters[0]?.emoji}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex -space-x-2 shrink-0">
          {characters.slice(0, 3).map((char) => (
            <Avatar key={char.id} className="w-8 h-8 border-2 border-popover">
              <AvatarImage src={char.avatar} alt={char.name} />
              <AvatarFallback className="text-xs">{char.emoji}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{groupName}</h1>
        <p className="text-xs text-muted-foreground truncate">
          {isSingleChat ? 'online' : `${characters.map(c => `${c.name} ${c.emoji}`).join(', ')}, Tu`}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Video className="w-5 h-5 text-muted-foreground" />
        <Phone className="w-5 h-5 text-muted-foreground" />
        <button onClick={onSettingsClick} className="hover:opacity-80 transition-opacity">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
