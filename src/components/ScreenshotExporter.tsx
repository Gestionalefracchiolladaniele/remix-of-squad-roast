import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState<'waiting' | 'rendering' | 'capturing' | 'done'>('waiting');

  const downloadDataUrl = useCallback((dataUrl: string, filename: string) => {
    return new Promise<void>((resolve) => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(resolve, 600);
    });
  }, []);

  useEffect(() => {
    if (currentIndex === -1) {
      toast.info(`Esportazione di ${messages.length} screenshot...`);
      setCurrentIndex(0);
      return;
    }

    if (currentIndex >= messages.length) {
      toast.success(`${messages.length} screenshot scaricati!`);
      onComplete();
      return;
    }

    setStatus('rendering');

    // Wait for DOM to render the current message
    const renderTimeout = setTimeout(async () => {
      setStatus('capturing');
      const el = containerRef.current;
      if (!el) {
        setCurrentIndex(prev => prev + 1);
        return;
      }

      try {
        // Multiple attempts for reliability
        let dataUrl: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            dataUrl = await toPng(el, {
              backgroundColor: '#000000',
              pixelRatio: 2,
              cacheBust: true,
            });
            break;
          } catch {
            await new Promise(r => setTimeout(r, 300));
          }
        }

        if (dataUrl) {
          await downloadDataUrl(dataUrl, `msg-${String(currentIndex + 1).padStart(3, '0')}.png`);
        }
      } catch (err) {
        console.error(`Error exporting message ${currentIndex + 1}:`, err);
      }

      setCurrentIndex(prev => prev + 1);
    }, 800);

    return () => clearTimeout(renderTimeout);
  }, [currentIndex, messages.length]);

  const msg = currentIndex >= 0 && currentIndex < messages.length ? messages[currentIndex] : null;
  if (!msg) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <p className="text-foreground text-sm">Preparazione...</p>
    </div>
  );

  const character = getCharById(msg.characterId);
  const timeStr = msg.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <div className="text-center text-foreground mb-4 absolute top-4 space-y-1">
        <p className="text-sm font-medium">Esportazione {currentIndex + 1}/{messages.length}</p>
        <p className="text-xs text-muted-foreground">
          {status === 'rendering' ? 'Rendering...' : status === 'capturing' ? 'Cattura in corso...' : ''}
        </p>
      </div>

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
                <img src={logoButterfly} alt="" style={{ width: 28, height: 28, objectFit: 'contain', display: 'inline-block' }} />
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
