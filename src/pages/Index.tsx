import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from '@/components/ChatHeader';
import ChatBubble from '@/components/ChatBubble';
import ScreenshotModal from '@/components/ScreenshotModal';
import TypingIndicator from '@/components/TypingIndicator';
import ChatInput from '@/components/ChatInput';
import SettingsDialog from '@/components/SettingsDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  GroupType, RoastLevel, ChatMode, Character, ChatMessage,
  defaultFemaleCharacters, defaultMaleCharacters, defaultVipCharacters, defaultGroupNames,
} from '@/lib/characters';
import { useChatStorage, CharacterPreset } from '@/hooks/use-chat-storage';
import { toast } from 'sonner';

const Index = () => {
  const [groupType, setGroupType] = useState<GroupType>('female');
  const [chatMode, setChatMode] = useState<ChatMode>('group');
  const [groupName, setGroupName] = useState(defaultGroupNames.female);
  const [interactive, setInteractive] = useState(true);
  const [roastLevel, setRoastLevel] = useState<RoastLevel>('savage');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingChar, setTypingChar] = useState<Character | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [selectedSingleCharIndex, setSelectedSingleCharIndex] = useState(0);
  const [femaleChars, setFemaleChars] = useState<Character[]>(() =>
    defaultFemaleCharacters.map((c, i) => ({ ...c, order: i + 1 }))
  );
  const [maleChars, setMaleChars] = useState<Character[]>(() =>
    defaultMaleCharacters.map((c, i) => ({ ...c, order: i + 1 }))
  );
  const [vipChars, setVipChars] = useState<Character[]>(() =>
    defaultVipCharacters.map((c, i) => ({ ...c, order: i + 1 }))
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [importedUserMessages, setImportedUserMessages] = useState<{ order: number; text: string; time?: string }[]>([]);
  const [screenshotMsg, setScreenshotMsg] = useState<ChatMessage | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions, presets,
    saveSession, loadSessionMessages, deleteSession,
    savePreset, deletePreset,
  } = useChatStorage();

  const allCharacters = groupType === 'female' ? femaleChars : groupType === 'male' ? maleChars : vipChars;
  const setCharacters = groupType === 'female' ? setFemaleChars : groupType === 'male' ? setMaleChars : setVipChars;

  // In single mode, only use the selected character
  const characters = chatMode === 'single' ? [allCharacters[selectedSingleCharIndex] || allCharacters[0]] : allCharacters;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingChar, scrollToBottom]);

  // Auto-load first saved preset for each group type on mount
  useEffect(() => {
    if (presets.length === 0) return;
    const types: { type: GroupType; setChars: typeof setFemaleChars; defaults: Character[] }[] = [
      { type: 'female', setChars: setFemaleChars, defaults: defaultFemaleCharacters },
      { type: 'male', setChars: setMaleChars, defaults: defaultMaleCharacters },
      { type: 'vip', setChars: setVipChars, defaults: defaultVipCharacters },
    ];
    for (const { type, setChars, defaults } of types) {
      const preset = presets.find(p => p.group_type === type);
      if (preset) {
        const merged = preset.characters.map((pc, i) => {
          const def = defaults.find(d => d.id === pc.id) || defaults[i];
          return {
            ...pc,
            avatar: pc.avatar || def?.avatar || '',
            color: pc.color || def?.color || '',
            colorClass: pc.colorClass || def?.colorClass || '',
          };
        });
        setChars(merged);
      }
    }
  }, [presets]);

  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => {
        saveSession(groupType, groupName, roastLevel, messages, currentSessionId || undefined)
          .then(id => { if (id && !currentSessionId) setCurrentSessionId(id); });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [messages, groupType, groupName, roastLevel, currentSessionId, saveSession]);

  const handleGroupTypeChange = useCallback((type: GroupType) => {
    setGroupType(type);
    setGroupName(defaultGroupNames[type]);
    setMessages([]);
    setTypingChar(null);
    setIsRoasting(false);
    setCurrentSessionId(null);
    setSelectedSingleCharIndex(0);

    // Auto-load first saved preset for this group type
    const matchingPreset = presets.find(p => p.group_type === type);
    if (matchingPreset) {
      const defaults = type === 'female' ? defaultFemaleCharacters : type === 'male' ? defaultMaleCharacters : defaultVipCharacters;
      const setChars = type === 'female' ? setFemaleChars : type === 'male' ? setMaleChars : setVipChars;
      const merged = matchingPreset.characters.map((pc, i) => {
        const def = defaults.find(d => d.id === pc.id) || defaults[i];
        return {
          ...pc,
          avatar: pc.avatar || def?.avatar || '',
          color: pc.color || def?.color || '',
          colorClass: pc.colorClass || def?.colorClass || '',
        };
      });
      setChars(merged);
    }
  }, [presets]);

  const handleChatModeChange = (mode: ChatMode) => {
    setChatMode(mode);
    setMessages([]);
    setTypingChar(null);
    setIsRoasting(false);
    setCurrentSessionId(null);
  };

  const handleCharacterUpdate = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getCharById = (id: string) => allCharacters.find(c => c.id === id);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const sortCharactersByOrder = useCallback((chars: Character[]) => {
    const sorted = [...chars].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const groups: Character[][] = [];
    let currentOrder = -1;
    for (const char of sorted) {
      const ord = char.order ?? 99;
      if (ord !== currentOrder) {
        groups.push([char]);
        currentOrder = ord;
      } else {
        groups[groups.length - 1].push(char);
      }
    }
    return groups.flatMap(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
      return group;
    });
  }, []);

  const startRoastSequence = useCallback(async (imageBase64?: string, textDescription?: string) => {
    setIsRoasting(true);

    try {
      const orderedChars = sortCharactersByOrder(characters);

      // Build message slots: each character can have multiple messages
      const messageSlots: { charId: string; order: number; text?: string; image?: string; time?: string; isUser?: boolean }[] = [];
      
      for (const c of orderedChars) {
        if (c.customMessages && c.customMessages.length > 0) {
          // Use custom messages array - use each message's own order for correct sequencing
          const sorted = [...c.customMessages].sort((a, b) => a.order - b.order);
          sorted.forEach((cm) => {
            messageSlots.push({
              charId: c.id,
              order: cm.order,
              text: cm.text || undefined,
              image: cm.image || undefined,
              time: cm.time || undefined,
            });
          });
        } else if (c.customMessage) {
          // Legacy single message
          messageSlots.push({
            charId: c.id,
            order: (c.order ?? 99) * 100,
            text: c.customMessage,
            image: c.customImage || undefined,
          });
        } else {
          // AI-generated single message
          messageSlots.push({
            charId: c.id,
            order: (c.order ?? 99) * 100,
            text: undefined,
            image: c.customImage || undefined,
          });
        }
      }

      // Add imported user messages ("TU")
      for (const um of importedUserMessages) {
        messageSlots.push({
          charId: 'user',
          order: um.order * 100 - 50, // interleave with char orders
          text: um.text,
          time: um.time,
          isUser: true,
        });
      }

      messageSlots.sort((a, b) => a.order - b.order);

      // Separate: slots with custom text vs slots needing AI
      const needsAI = messageSlots.filter(s => !s.text);
      
      let aiRoasts: Record<string, string[]> = {};

      if (needsAI.length > 0) {
        // Count how many AI messages each character needs
        const aiCounts: Record<string, number> = {};
        needsAI.forEach(s => {
          aiCounts[s.charId] = (aiCounts[s.charId] || 0) + 1;
        });

        const { data, error } = await supabase.functions.invoke('generate-roast', {
          body: {
            imageBase64,
            textDescription,
            characters: orderedChars.map((c, i) => ({
              id: c.id,
              name: c.name,
              emoji: c.emoji,
              role: c.role,
              customMessage: c.customMessage,
              order: i + 1,
              messageCount: aiCounts[c.id] || 0,
            })),
            roastLevel,
            groupType,
            chatMode,
          },
        });

        if (error) throw error;

        const roasts = data?.roasts || [];
        // Group AI responses by charId
        roasts.forEach((r: any) => {
          if (!aiRoasts[r.charId]) aiRoasts[r.charId] = [];
          aiRoasts[r.charId].push(r.text);
        });
      }

      // Track AI message index per character
      const aiIndexes: Record<string, number> = {};

      for (let i = 0; i < messageSlots.length; i++) {
        const slot = messageSlots[i];
        
        // Handle user messages ("TU")
        if (slot.isUser) {
          await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
          let msgTimestamp = new Date();
          if (slot.time) {
            const [h, m] = slot.time.split(':').map(Number);
            msgTimestamp = new Date();
            msgTimestamp.setHours(h, m, Math.floor(Math.random() * 60), 0);
          }
          setMessages(prev => [
            ...prev,
            {
              id: `user-imported-${Date.now()}-${i}`,
              characterId: 'user',
              text: slot.text!,
              timestamp: msgTimestamp,
              isUser: true,
            },
          ]);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        const char = getCharById(slot.charId);
        if (!char) continue;

        let msgText = slot.text;
        if (!msgText) {
          if (!aiIndexes[slot.charId]) aiIndexes[slot.charId] = 0;
          const idx = aiIndexes[slot.charId];
          msgText = aiRoasts[slot.charId]?.[idx] || `${char.emoji} ...`;
          aiIndexes[slot.charId] = idx + 1;
        }

        setTypingChar(char);
        await new Promise(r => setTimeout(r, 1800 + Math.random() * 800));
        setTypingChar(null);

        let msgTimestamp = new Date();
        if (slot.time) {
          const [h, m] = slot.time.split(':').map(Number);
          msgTimestamp = new Date();
          msgTimestamp.setHours(h, m, Math.floor(Math.random() * 60), 0);
        }

        setMessages(prev => [
          ...prev,
          {
            id: `roast-${Date.now()}-${i}`,
            characterId: slot.charId,
            text: msgText!,
            timestamp: msgTimestamp,
            isUser: false,
            imageUrl: slot.image || undefined,
          },
        ]);

        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err: any) {
      console.error('Roast generation error:', err);
      toast.error('Errore nella generazione dei roast. Riprova!');
    }

    setIsRoasting(false);
  }, [characters, roastLevel, groupType, chatMode, sortCharactersByOrder, importedUserMessages]);

  const handleUploadPhoto = useCallback(async (file: File, text?: string) => {
    const url = URL.createObjectURL(file);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      characterId: 'user',
      text: text || 'Raga guardate questo/a... che ne pensate? 👀',
      timestamp: new Date(),
      isUser: true,
      imageUrl: url,
    };
    setMessages(prev => [...prev, userMsg]);

    const base64 = await fileToBase64(file);
    setTimeout(() => startRoastSequence(base64, text), 800);
  }, [startRoastSequence]);

  const handleSendMessage = useCallback((text: string) => {
    if (!interactive) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      characterId: 'user',
      text,
      timestamp: new Date(),
      isUser: true,
    };
    setMessages(prev => [...prev, userMsg]);

    if (!isRoasting) {
      setTimeout(() => startRoastSequence(undefined, text), 500);
    }
  }, [interactive, isRoasting, startRoastSequence]);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const msgs = await loadSessionMessages(sessionId);
    setMessages(msgs);
    setCurrentSessionId(sessionId);
    setGroupName(session.group_name);
    setGroupType(session.group_type as GroupType);
    setRoastLevel(session.roast_level as RoastLevel);
    toast.success('Chat caricata!');
  }, [sessions, loadSessionMessages]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    toast.success('Chat eliminata');
  }, [deleteSession, currentSessionId]);

  const handleSavePreset = useCallback((name: string) => {
    if (!name.trim()) return;
    savePreset(groupType, name.trim(), allCharacters);
  }, [groupType, allCharacters, savePreset]);

  const handleSettingsClose = useCallback((open: boolean) => {
    setSettingsOpen(open);
  }, []);

  const handleLoadPreset = useCallback((preset: CharacterPreset) => {
    const defaults = groupType === 'female' ? defaultFemaleCharacters : groupType === 'male' ? defaultMaleCharacters : defaultVipCharacters;
    const merged = preset.characters.map((pc, i) => {
      const def = defaults.find(d => d.id === pc.id) || defaults[i];
      return {
        ...pc,
        avatar: pc.avatar || def?.avatar || '',
        color: pc.color || def?.color || '',
        colorClass: pc.colorClass || def?.colorClass || '',
      };
    });
    setCharacters(merged);
    toast.success(`Preset "${preset.preset_name}" caricato!`);
  }, [groupType, setCharacters]);

  const handleDeletePreset = useCallback(async (presetId: string) => {
    await deletePreset(presetId);
    toast.success('Preset eliminato');
  }, [deletePreset]);

  const handleExport = useCallback(() => {
    if (messages.length === 0) return;
    const exportData = {
      groupName,
      groupType,
      messages: messages.map(msg => {
        const char = getCharById(msg.characterId);
        const avatarFile = char?.avatar ? char.avatar.split('/').pop() || '' : '';
        return {
          id: msg.id,
          characterId: msg.isUser ? 'user' : msg.characterId,
          characterName: msg.isUser ? 'Tu' : (char?.name || msg.characterId),
          emoji: msg.isUser ? '👤' : (char?.emoji || ''),
          color: msg.isUser ? '' : (char?.color || ''),
          avatar: msg.isUser ? '' : avatarFile,
          text: msg.text,
          timestamp: msg.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          isUser: msg.isUser,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export scaricato!');
  }, [messages, groupName, groupType, allCharacters]);

  const headerChars = chatMode === 'single' ? characters : allCharacters;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      <ChatHeader
        groupName={chatMode === 'single' ? characters[0]?.name || '' : groupName}
        characters={headerChars}
        onSettingsClick={() => setSettingsOpen(true)}
        isSingleChat={chatMode === 'single'}
      />

      <div className="flex-1 overflow-y-auto chat-scroll wa-pattern py-3">
        {messages.length === 0 && chatMode === 'group' && (
          <div className="flex items-center justify-center h-full px-8">
            <div className="text-center space-y-3">
              <div className="text-5xl">
                {groupType === 'female' ? '🐍' : groupType === 'male' ? '🔥' : '👑'}
              </div>
              <h2 className="text-lg font-bold text-foreground">{groupName}</h2>
              <p className="text-sm text-muted-foreground">
                Carica una foto o scrivi un messaggio per iniziare il roast!
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {characters.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{ backgroundColor: `hsl(${c.color} / 0.15)`, color: `hsl(${c.color})` }}
                  >
                    <img src={c.avatar} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                    {c.name} {c.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 && chatMode === 'single' && (
          <div className="flex items-center justify-center h-full px-8">
            <p className="text-sm text-muted-foreground">
              Scrivi un messaggio per iniziare...
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            text={msg.text}
            character={getCharById(msg.characterId)}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
            imageUrl={msg.imageUrl}
            replyTo={msg.replyTo}
            animationDelay={0}
            onDoubleClick={() => setScreenshotMsg(msg)}
          />
        ))}

        {typingChar && <TypingIndicator character={typingChar} />}
        <div ref={chatEndRef} />
      </div>

      <div className="text-center py-1 text-[10px] text-muted-foreground bg-popover/80 border-t border-border">
        🤖 Contenuto satirico generato da AI • AI Roast Mode: ON
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onUploadPhoto={handleUploadPhoto}
        onExport={handleExport}
        disabled={isRoasting}
        interactive={interactive}
        hasMessages={messages.length > 0}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={handleSettingsClose}
        groupType={groupType}
        onGroupTypeChange={handleGroupTypeChange}
        chatMode={chatMode}
        onChatModeChange={handleChatModeChange}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        interactive={interactive}
        onInteractiveChange={setInteractive}
        roastLevel={roastLevel}
        onRoastLevelChange={setRoastLevel}
        characters={allCharacters}
        onCharacterUpdate={handleCharacterUpdate}
        sessions={sessions}
        presets={presets}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        selectedSingleCharIndex={selectedSingleCharIndex}
        onSelectedSingleCharChange={setSelectedSingleCharIndex}
        onImportUserMessages={setImportedUserMessages}
      />

      {screenshotMsg && (
        <ScreenshotModal
          message={screenshotMsg}
          character={getCharById(screenshotMsg.characterId)}
          onClose={() => setScreenshotMsg(null)}
        />
      )}
    </div>
  );
};

export default Index;
