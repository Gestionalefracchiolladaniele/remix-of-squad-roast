import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toBlob } from 'html-to-image';
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
  const hasStartedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState<'waiting' | 'rendering' | 'capturing' | 'downloading' | 'done'>('waiting');

  const wait = useCallback((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)), []);

  const downloadBlob = useCallback(async (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);

    return new Promise<void>((resolve) => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve();
      }, 1200);
    });
  }, []);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    if (messages.length === 0) {
      onComplete();
      return;
    }

    let cancelled = false;

    const exportSequentially = async () => {
      toast.info(`Esportazione di ${messages.length} screenshot...`);

      try {
        for (let index = 0; index < messages.length; index += 1) {
          if (cancelled) return;

          setCurrentIndex(index);
          setStatus('rendering');
          await wait(900);

          if (cancelled) return;

          setStatus('capturing');
          await wait(150);

          const el = containerRef.current;
          if (!el) continue;

          let blob: Blob | null = null;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
              blob = await toBlob(el, {
                backgroundColor: '#000000',
                pixelRatio: 2,
                cacheBust: true,
              });

              if (blob) break;
            } catch {
              await wait(350);
            }
          }

          if (!blob) {
            throw new Error(`Impossibile generare lo screenshot del messaggio ${index + 1}`);
          }

          if (cancelled) return;

          setStatus('downloading');
          await downloadBlob(blob, `msg-${String(index + 1).padStart(3, '0')}.png`);
          await wait(900);
        }

        if (cancelled) return;

        setStatus('done');
        toast.success(`${messages.length} screenshot scaricati!`);
        onComplete();
      } catch (err) {
        console.error('Error exporting screenshots:', err);
        toast.error('Errore durante il download degli screenshot');
        onComplete();
      }
    };

    void exportSequentially();

    return () => {
      cancelled = true;
    };
  }, [downloadBlob, messages, onComplete, wait]);

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
          {status === 'rendering'
            ? 'Preparazione messaggio...'
            : status === 'capturing'
              ? 'Cattura in corso...'
              : status === 'downloading'
                ? 'Download in corso...'
                : ''}
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
