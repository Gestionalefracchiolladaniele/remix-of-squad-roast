import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Character, ChatMessage } from '@/lib/characters';
import logoButterfly from '@/assets/logo-butterfly.png';
import { toast } from 'sonner';

interface ScreenshotExporterProps {
  messages: ChatMessage[];
  getCharById: (id: string) => Character | undefined;
  onComplete: () => void;
}

const ScreenshotExporter: React.FC<ScreenshotExporterProps> = ({ messages, getCharById, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const exportAll = async () => {
      toast.info(`Esportazione di ${messages.length} screenshot...`);

      for (let i = 0; i < messages.length; i++) {
        setCurrentIndex(i);
        // Wait for render
        await new Promise(r => setTimeout(r, 300));

        const el = containerRef.current;
        if (!el) continue;

        try {
          const dataUrl = await toPng(el, {
            backgroundColor: '#000000',
            pixelRatio: 2,
          });

          // Download
          const link = document.createElement('a');
          link.download = `msg-${String(i + 1).padStart(3, '0')}.png`;
          link.href = dataUrl;
          link.click();

          // Small delay between downloads
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`Error exporting message ${i + 1}:`, err);
        }
      }

      toast.success(`${messages.length} screenshot scaricati!`);
      setIsProcessing(false);
      onComplete();
    };

    exportAll();
  }, []);

  const msg = messages[currentIndex];
  if (!msg) return null;

  const character = getCharById(msg.characterId);
  const timeStr = msg.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <div className="text-center text-foreground mb-4 absolute top-4">
        <p className="text-sm">Esportazione {currentIndex + 1}/{messages.length}...</p>
      </div>

      {/* Hidden render target */}
      <div
        ref={containerRef}
        style={{
          width: 420,
          padding: '12px 0',
          backgroundColor: '#000000',
        }}
      >
        <div className="wa-pattern py-3" style={{ backgroundColor: 'hsl(222 13% 7%)' }}>
          <div className={`flex gap-2 px-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            {!msg.isUser && character && (
              <Avatar className="w-9 h-9 mt-1 shrink-0">
                <AvatarImage src={character.avatar} alt={character.name} />
                <AvatarFallback className="text-xs">{character.emoji}</AvatarFallback>
              </Avatar>
            )}

            <div
              className={`relative rounded-lg px-3 py-2 ${
                msg.isUser
                  ? 'bg-wa-bubble-out rounded-tr-none max-w-[80%]'
                  : 'bg-wa-bubble-in rounded-tl-none max-w-[80%]'
              }`}
            >
              {!msg.isUser && character && (
                <p className="text-sm font-semibold mb-0.5" style={{ color: `hsl(${character.color})` }}>
                  {character.name} {character.emoji}
                </p>
              )}

              {msg.replyTo && (
                <div className="border-l-2 border-primary pl-2 mb-1 py-1 bg-secondary/30 rounded-r text-xs text-muted-foreground truncate">
                  {msg.replyTo}
                </div>
              )}

              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="" className="rounded-md mb-1 max-w-full max-h-72 object-cover" />
              )}

              <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              <p className="text-[11px] text-muted-foreground text-right mt-0.5 -mb-0.5 flex items-center justify-end gap-1">
                <span>{timeStr}</span>
                <img src={logoButterfly} alt="" className="w-[18px] h-[18px] object-contain inline-block" />
                {msg.isUser && <span className="text-primary">✓✓</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotExporter;
