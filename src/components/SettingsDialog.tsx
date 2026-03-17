import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Camera, ChevronDown, ChevronUp, Save, Trash2, History, RotateCcw, Image, X, Plus, MessageSquare, Clock, Smile, FileText } from 'lucide-react';
import { GroupType, RoastLevel, ChatMode, Character, CharacterMessage } from '@/lib/characters';
import { ChatSession, CharacterPreset } from '@/hooks/use-chat-storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationImportProps {
  characters: Character[];
  onCharacterUpdate: (id: string, updates: Partial<Character>) => void;
  onImportUserMessages: (messages: { order: number; text: string; time?: string }[]) => void;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupType: GroupType;
  onGroupTypeChange: (type: GroupType) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  groupName: string;
  onGroupNameChange: (name: string) => void;
  interactive: boolean;
  onInteractiveChange: (v: boolean) => void;
  roastLevel: RoastLevel;
  onRoastLevelChange: (level: RoastLevel) => void;
  characters: Character[];
  onCharacterUpdate: (id: string, updates: Partial<Character>) => void;
  sessions: ChatSession[];
  presets: CharacterPreset[];
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: CharacterPreset) => void;
  onDeletePreset: (presetId: string) => void;
  selectedSingleCharIndex: number;
  onSelectedSingleCharChange: (index: number) => void;
  onImportUserMessages?: (messages: { order: number; text: string; time?: string }[]) => void;
}

const uploadAvatarToStorage = async (charId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${charId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};

const parseConversationText = (text: string, characters: Character[]): { 
  charMessages: Record<string, { texts: string[]; orders: number[] }>;
  userMessages: { order: number; text: string }[];
  unmatched: string[];
} => {
  const lines = text.split('\n').filter(l => l.trim());
  const charMessages: Record<string, { texts: string[]; orders: number[] }> = {};
  const userMessages: { order: number; text: string }[] = [];
  const unmatched: string[] = [];
  
  // Parse each line: formats like "1. NAME: message", "1 NAME: message", "NAME: message"
  const lineRegex = /^(?:(\d+)[.\s]\s*)?([^:]+?):\s*(.+)$/;
  
  let globalOrder = 1;
  
  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (!match) continue;
    
    const explicitOrder = match[1] ? parseInt(match[1], 10) : null;
    const rawName = match[2].trim();
    const message = match[3].trim();
    const order = explicitOrder ?? globalOrder;
    
    // Check if it's a user message (TU)
    if (rawName.toUpperCase() === 'TU') {
      userMessages.push({ order: globalOrder, text: message });
      globalOrder++;
      continue;
    }
    
    // Find matching character (case-insensitive, partial match)
    const matchedChar = characters.find(c => {
      const charName = c.name.toLowerCase().trim();
      const inputName = rawName.toLowerCase().trim();
      return charName === inputName || 
             charName.includes(inputName) || 
             inputName.includes(charName) ||
             // Also check without special chars
             charName.replace(/[^a-zà-ú\s]/gi, '').trim() === inputName.replace(/[^a-zà-ú\s]/gi, '').trim();
    });
    
    if (matchedChar) {
      if (!charMessages[matchedChar.id]) {
        charMessages[matchedChar.id] = { texts: [], orders: [] };
      }
      charMessages[matchedChar.id].texts.push(message);
      charMessages[matchedChar.id].orders.push(globalOrder);
      globalOrder++;
    } else {
      unmatched.push(rawName);
      globalOrder++;
    }
  }
  
  return { charMessages, userMessages, unmatched };
};

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open, onOpenChange, groupType, onGroupTypeChange, chatMode, onChatModeChange,
  groupName, onGroupNameChange, interactive, onInteractiveChange,
  roastLevel, onRoastLevelChange, characters, onCharacterUpdate,
  sessions, presets, onLoadSession, onDeleteSession,
  onSavePreset, onLoadPreset, onDeletePreset,
  selectedSingleCharIndex, onSelectedSingleCharChange,
  onImportUserMessages,
}) => {
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'presets'>('settings');
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [globalTime, setGlobalTime] = useState('');
  const [showConversationImport, setShowConversationImport] = useState(false);
  const [conversationText, setConversationText] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const charImageRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleAvatarChange = async (charId: string, file: File) => {
    // Show preview immediately
    const blobUrl = URL.createObjectURL(file);
    onCharacterUpdate(charId, { avatar: blobUrl });
    // Upload to storage
    try {
      const publicUrl = await uploadAvatarToStorage(charId, file);
      onCharacterUpdate(charId, { avatar: publicUrl });
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Errore nel caricare la foto');
    }
  };

  const handleCharImageChange = async (charId: string, file: File) => {
    const blobUrl = URL.createObjectURL(file);
    onCharacterUpdate(charId, { customImage: blobUrl });
    try {
      const publicUrl = await uploadAvatarToStorage(`msg-${charId}`, file);
      onCharacterUpdate(charId, { customImage: publicUrl });
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Errore nel caricare la foto');
    }
  };

  const handleMessageImageUpload = async (charId: string, msgIndex: number, file: File, currentMessages: CharacterMessage[]) => {
    const blobUrl = URL.createObjectURL(file);
    const updated = [...currentMessages];
    updated[msgIndex] = { ...updated[msgIndex], image: blobUrl };
    onCharacterUpdate(charId, { customMessages: updated });
    try {
      const publicUrl = await uploadAvatarToStorage(`msg-${charId}-${msgIndex}`, file);
      const updated2 = [...currentMessages];
      updated2[msgIndex] = { ...updated2[msgIndex], image: publicUrl };
      onCharacterUpdate(charId, { customMessages: updated2 });
    } catch (err) {
      console.error('Message image upload error:', err);
      toast.error('Errore nel caricare la foto');
    }
  };

  const handleImportConversation = () => {
    if (!conversationText.trim()) return;
    
    const { charMessages, userMessages, unmatched } = parseConversationText(conversationText, characters);
    
    // Assign messages to characters
    let assignedCount = 0;
    for (const [charId, data] of Object.entries(charMessages)) {
      const msgs: CharacterMessage[] = data.texts.map((text, i) => ({
        text,
        order: data.orders[i],
        time: globalTime || undefined,
      }));
      onCharacterUpdate(charId, { customMessages: msgs, order: Math.min(...data.orders) });
      assignedCount += msgs.length;
    }
    
    // Handle user messages
    if (userMessages.length > 0 && onImportUserMessages) {
      onImportUserMessages(userMessages.map(m => ({ ...m, time: globalTime || undefined })));
    }
    
    if (unmatched.length > 0) {
      const uniqueUnmatched = [...new Set(unmatched)];
      toast.warning(`Nomi non trovati: ${uniqueUnmatched.join(', ')}. Rinomina i personaggi e riprova.`);
    }
    
    toast.success(`${assignedCount} messaggi assegnati + ${userMessages.length} messaggi "TU" importati!`);
    setShowConversationImport(false);
    setConversationText('');
  };

  const filteredPresets = presets.filter(p => p.group_type === groupType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-foreground max-w-sm max-h-[85vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-lg">⚙️ Impostazioni</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {[
            { key: 'settings' as const, label: '⚙️ Opzioni' },
            { key: 'history' as const, label: '💬 Chat' },
            { key: 'presets' as const, label: '👥 Preset' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ScrollArea className="px-4 pb-4 max-h-[65vh]">
          {activeTab === 'settings' && (
            <div className="space-y-5 pr-2">
              {/* Chat Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Modalità Chat</Label>
                <RadioGroup value={chatMode} onValueChange={(v) => onChatModeChange(v as ChatMode)} className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="group" id="mode-group" />
                    <Label htmlFor="mode-group" className="text-sm cursor-pointer">👥 Gruppo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="single" id="mode-single" />
                    <Label htmlFor="mode-single" className="text-sm cursor-pointer">💬 Chat Singola</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Group Type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Seleziona Gruppo</Label>
                <RadioGroup value={groupType} onValueChange={(v) => onGroupTypeChange(v as GroupType)} className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="text-sm cursor-pointer">🐍 Femmine</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="text-sm cursor-pointer">🔥 Maschi</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="vip" id="vip" />
                    <Label htmlFor="vip" className="text-sm cursor-pointer">👑 VIP</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Single chat: select character */}
              {chatMode === 'single' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Scegli Personaggio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {characters.map((char, idx) => (
                      <button
                        key={char.id}
                        onClick={() => onSelectedSingleCharChange(idx)}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                          selectedSingleCharIndex === idx
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/50 hover:bg-secondary'
                        }`}
                      >
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={char.avatar} alt={char.name} />
                          <AvatarFallback className="text-xs">{char.emoji}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground truncate">{char.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Name */}
              {chatMode === 'group' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Nome del Gruppo</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => onGroupNameChange(e.target.value)}
                    placeholder="Es: Le Vipere 🐍"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              )}

              {/* Interactive Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-foreground">Risposte Interattive</Label>
                  <p className="text-xs text-muted-foreground">Rispondi ai messaggi nella chat</p>
                </div>
                <Switch checked={interactive} onCheckedChange={onInteractiveChange} />
              </div>

              {/* Roast Level */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Livello di Cattiveria</Label>
                <RadioGroup value={roastLevel} onValueChange={(v) => onRoastLevelChange(v as RoastLevel)} className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="soft" id="soft" />
                    <Label htmlFor="soft" className="text-sm cursor-pointer">😏 Soft</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="text-sm cursor-pointer">😈 Medio</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="savage" id="savage" />
                    <Label htmlFor="savage" className="text-sm cursor-pointer">💀 Senza Pietà</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Global Time + Import Conversation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Orario Globale
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowConversationImport(true)}
                  >
                    <FileText className="w-3 h-3" /> Importa Chat
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Imposta lo stesso orario per tutti i messaggi</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={globalTime}
                    onChange={(e) => setGlobalTime(e.target.value)}
                    className="bg-secondary border-border text-foreground h-8 text-sm w-36"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    disabled={!globalTime}
                    onClick={() => {
                      characters.forEach(char => {
                        if (char.customMessages && char.customMessages.length > 0) {
                          const updated = char.customMessages.map(cm => ({ ...cm, time: globalTime }));
                          onCharacterUpdate(char.id, { customMessages: updated });
                        } else {
                          const msg: CharacterMessage = {
                            text: char.customMessage || '',
                            order: 1,
                            time: globalTime,
                          };
                          onCharacterUpdate(char.id, { customMessages: [msg] });
                        }
                      });
                      toast.success(`Orario ${globalTime} applicato a tutti i messaggi!`);
                    }}
                  >
                    Applica a tutti
                  </Button>
                </div>
              </div>

              {/* Conversation Import Popup */}
              {showConversationImport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShowConversationImport(false)}>
                  <div className="bg-popover border border-border rounded-xl shadow-xl w-[90vw] max-w-md p-4 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Importa Conversazione
                      </h3>
                      <button onClick={() => setShowConversationImport(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Incolla il testo della conversazione. Formato: <code className="bg-secondary px-1 rounded">NOME: messaggio</code>. 
                      Usa <code className="bg-secondary px-1 rounded">TU:</code> per i tuoi messaggi.
                    </p>
                    <div className="text-[10px] text-muted-foreground/70 bg-secondary/50 rounded-md p-2">
                      <p className="font-medium mb-1">Personaggi attuali:</p>
                      <div className="flex flex-wrap gap-1">
                        {characters.map(c => (
                          <span key={c.id} className="bg-background px-1.5 py-0.5 rounded text-foreground">{c.name}</span>
                        ))}
                        <span className="bg-primary/20 px-1.5 py-0.5 rounded text-primary font-medium">TU</span>
                      </div>
                    </div>
                    <Textarea
                      value={conversationText}
                      onChange={(e) => setConversationText(e.target.value)}
                      placeholder={`Es:\nSere: Raga, sveglia!\nMARTY: AHAHAH!\nTU: Ma dai!\nBEA: Nooo!`}
                      className="bg-background border-border text-foreground text-sm min-h-[200px] resize-none font-mono"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => { setShowConversationImport(false); setConversationText(''); }}
                      >
                        Annulla
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1"
                        disabled={!conversationText.trim()}
                        onClick={handleImportConversation}
                      >
                        <FileText className="w-3 h-3" /> Importa
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Preset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">Personaggi</Label>
                  {showPresetInput ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Nome preset..."
                        className="bg-background border-border text-foreground h-7 text-xs w-28"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && presetName.trim()) {
                            onSavePreset(presetName.trim());
                            setPresetName('');
                            setShowPresetInput(false);
                          }
                        }}
                      />
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={!presetName.trim()}
                        onClick={() => {
                          onSavePreset(presetName.trim());
                          setPresetName('');
                          setShowPresetInput(false);
                        }}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-1.5"
                        onClick={() => { setShowPresetInput(false); setPresetName(''); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowPresetInput(true)} className="h-7 text-xs gap-1">
                      <Save className="w-3 h-3" /> Salva Preset
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {characters.map((char, idx) => (
                    <CharacterItem
                      key={char.id}
                      char={char}
                      idx={idx}
                      totalChars={characters.length}
                      expanded={expandedChar === char.id}
                      onToggle={() => setExpandedChar(expandedChar === char.id ? null : char.id)}
                      onUpdate={onCharacterUpdate}
                      fileRefs={fileRefs}
                      charImageRefs={charImageRefs}
                      onAvatarChange={handleAvatarChange}
                      onCharImageChange={handleCharImageChange}
                      onMessageImageUpload={handleMessageImageUpload}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 pr-2 pt-2">
              <p className="text-xs text-muted-foreground">Chat salvate – clicca per continuare</p>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessuna chat salvata</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <History className="w-4 h-4 text-muted-foreground shrink-0" />
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => { onLoadSession(s.id); onOpenChange(false); }}
                    >
                      <p className="text-sm font-medium text-foreground truncate">{s.group_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString('it-IT')} • {s.messageCount} msg • {s.roast_level}
                      </p>
                    </button>
                    <button
                      onClick={() => onDeleteSession(s.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3 pr-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Preset personaggi salvati per "{groupType === 'female' ? 'Femmine' : groupType === 'male' ? 'Maschi' : 'VIP'}"
              </p>
              {filteredPresets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessun preset salvato</p>
              ) : (
                filteredPresets.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => { onLoadPreset(p); onOpenChange(false); }}
                    >
                      <p className="text-sm font-medium text-foreground">{p.preset_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('it-IT')} • {p.characters.length} personaggi
                      </p>
                      <div className="flex gap-1 mt-1">
                        {p.characters.map(c => (
                          <span key={c.id} className="text-xs">{c.emoji}</span>
                        ))}
                      </div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { onLoadPreset(p); onOpenChange(false); }}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Carica"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePreset(p.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Extracted character item component
interface CharacterItemProps {
  char: Character;
  idx: number;
  totalChars: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  fileRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  charImageRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onAvatarChange: (charId: string, file: File) => void;
  onCharImageChange: (charId: string, file: File) => void;
  onMessageImageUpload: (charId: string, msgIndex: number, file: File, currentMessages: CharacterMessage[]) => void;
}

const CharacterItem: React.FC<CharacterItemProps> = ({
  char, idx, totalChars, expanded, onToggle, onUpdate,
  fileRefs, charImageRefs, onAvatarChange, onCharImageChange, onMessageImageUpload,
}) => {
  return (
    <div className="rounded-lg bg-secondary/50 border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/80 transition-colors"
        onClick={onToggle}
      >
        <span className="text-xs text-muted-foreground font-mono w-4">{char.order ?? idx + 1}</span>
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={char.avatar} alt={char.name} />
          <AvatarFallback>{char.emoji}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {char.name} {char.emoji}
          </p>
          <p className="text-xs text-muted-foreground">{char.role}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Avatar change */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRefs.current[char.id]?.click()}
              className="relative group"
            >
              <Avatar className="w-14 h-14">
                <AvatarImage src={char.avatar} alt={char.name} />
                <AvatarFallback>{char.emoji}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <input
              ref={(el) => { fileRefs.current[char.id] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarChange(char.id, file);
                e.target.value = '';
              }}
            />
            <p className="text-xs text-muted-foreground">Clicca per cambiare foto profilo</p>
          </div>

          {/* Name + Emoji */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={char.name}
                onChange={(e) => onUpdate(char.id, { name: e.target.value })}
                className="bg-background border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Smile className="w-3 h-3" /> Emoji
              </Label>
              <Input
                value={char.emoji}
                onChange={(e) => onUpdate(char.id, { emoji: e.target.value })}
                placeholder="😎"
                className="bg-background border-border text-foreground h-8 text-sm text-center"
                maxLength={4}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ruolo</Label>
            <Input
              value={char.role}
              onChange={(e) => onUpdate(char.id, { role: e.target.value })}
              className="bg-background border-border text-foreground h-8 text-sm"
            />
          </div>

          {/* Order */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ordine messaggio (1 = primo)</Label>
            <Input
              type="number"
              min={1}
              max={totalChars}
              value={char.order ?? idx + 1}
              onChange={(e) => onUpdate(char.id, { order: parseInt(e.target.value) || idx + 1 })}
              className="bg-background border-border text-foreground h-8 text-sm w-20"
            />
          </div>

          {/* Messages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Messaggi <span className="text-muted-foreground/60">({(char.customMessages || []).length || (char.customMessage ? 1 : 0)} configurati)</span>
              </Label>
              <button
                onClick={() => {
                  const existing = char.customMessages || [];
                  const newMsg: CharacterMessage = { text: '', order: existing.length + 1 };
                  onUpdate(char.id, { customMessages: [...existing, newMsg] });
                }}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3 h-3" /> Aggiungi
              </button>
            </div>

            {(char.customMessages && char.customMessages.length > 0) ? (
              <div className="space-y-2">
                {char.customMessages.map((cm, mi) => (
                  <div key={mi} className="rounded-md border border-border bg-background p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        <MessageSquare className="w-3 h-3 inline mr-1" />Msg #{mi + 1}
                      </span>
                      <button
                        onClick={() => {
                          const updated = char.customMessages!.filter((_, idx) => idx !== mi);
                          onUpdate(char.id, { customMessages: updated.length > 0 ? updated : undefined });
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <Textarea
                      value={cm.text}
                      onChange={(e) => {
                        const updated = [...char.customMessages!];
                        updated[mi] = { ...updated[mi], text: e.target.value };
                        onUpdate(char.id, { customMessages: updated });
                      }}
                      placeholder="Cosa deve scrivere..."
                      className="bg-secondary border-border text-foreground text-sm min-h-[40px] resize-none"
                    />
                    {/* Custom time */}
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-md p-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <Input
                        type="time"
                        value={cm.time || ''}
                        onChange={(e) => {
                          const updated = [...char.customMessages!];
                          updated[mi] = { ...updated[mi], time: e.target.value || undefined };
                          onUpdate(char.id, { customMessages: updated });
                        }}
                        className="bg-background border-border text-foreground h-7 text-sm w-32"
                      />
                      <span className="text-xs text-muted-foreground font-medium">Orario</span>
                    </div>
                    {/* Image for this message */}
                    {cm.image ? (
                      <div className="relative inline-block">
                        <img src={cm.image} alt="Msg img" className="w-16 h-16 rounded object-cover border border-border" />
                        <button
                          onClick={() => {
                            const updated = [...char.customMessages!];
                            updated[mi] = { ...updated[mi], image: undefined };
                            onUpdate(char.id, { customMessages: updated });
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              onMessageImageUpload(char.id, mi, file, char.customMessages!);
                            }
                          };
                          input.click();
                        }}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Image className="w-3 h-3" /> Foto
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Legacy single message fallback */}
                <Textarea
                  value={char.customMessage || ''}
                  onChange={(e) => onUpdate(char.id, { customMessage: e.target.value || undefined })}
                  placeholder="Scrivi cosa deve dire (1 messaggio) o usa + per più messaggi..."
                  className="bg-background border-border text-foreground text-sm min-h-[50px] resize-none"
                />
                {/* Legacy time */}
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={(char.customMessages?.[0]?.time) || ''}
                    onChange={(e) => {
                      const time = e.target.value || undefined;
                      const existing = char.customMessages?.[0] || { text: char.customMessage || '', order: 1 };
                      onUpdate(char.id, { customMessages: [{ ...existing, text: existing.text || char.customMessage || '', time, order: 1 }] });
                    }}
                    className="bg-secondary border-border text-foreground h-8 text-sm w-32"
                  />
                  <span className="text-xs text-muted-foreground">Orario</span>
                </div>
                {/* Legacy custom image */}
                {char.customImage ? (
                  <div className="relative inline-block">
                    <img src={char.customImage} alt="Custom" className="w-16 h-16 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => onUpdate(char.id, { customImage: undefined })}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => charImageRefs.current[char.id]?.click()}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Image className="w-3 h-3" /> Aggiungi foto da inviare
                  </button>
                )}
                <input
                  ref={(el) => { charImageRefs.current[char.id] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onCharImageChange(char.id, file);
                    e.target.value = '';
                  }}
                />
              </>
            )}
            <p className="text-[10px] text-muted-foreground/60">
              Usa "+" per aggiungere più messaggi in sequenza
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDialog;
