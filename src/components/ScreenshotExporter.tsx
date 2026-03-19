import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Character, ChatMessage } from '@/lib/characters';
import logoButterfly from '@/assets/logo-butterfly.png';
import { toast } from 'sonner';

interface ScreenshotExporterProps {
  messages: ChatMessage[];
  getCharById: (id: string) => Character | undefined;
  onComplete: () => void;
}

// Convert any image URL (blob, external, etc.) to a base64 data URL
const toDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!url || url.startsWith('data:')) {
      resolve(url || '');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(url); // fallback to original
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
};

const ScreenshotExporter: React.FC<ScreenshotExporterProps> = ({ messages, getCharById, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState<'preparing' | 'rendering' | 'capturing'>('preparing');
  // Pre-converted base64 images for the current message
  const [avatarB64, setAvatarB64] = useState<string>('');
  const [imageB64, setImageB64] = useState<string>('');
  const [logoB64, setLogoB64] = useState<string>('');

  // Pre-convert logo once
  useEffect(() => {
    toDataUrl(logoButterfly).then(setLogoB64);
  }, []);

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

  // Step 1: Start export
  useEffect(() => {
    if (currentIndex === -1) {
      toast.info(`Esportazione di ${messages.length} screenshot...`);
      setCurrentIndex(0);
    }
  }, []);

  // Step 2: When currentIndex changes, pre-convert images for that message
  useEffect(() => {
    if (currentIndex < 0) return;

    if (currentIndex >= messages.length) {
      toast.success(`${messages.length} screenshot scaricati!`);
      onComplete();
      return;
    }

    setStatus('preparing');
    const msg = messages[currentIndex];
    const character = getCharById(msg.characterId);

    const prepare = async () => {
      // Convert avatar and message image to base64 in parallel
      const [av, im] = await Promise.all([
        character?.avatar ? toDataUrl(character.avatar) : Promise.resolve(''),
        msg.imageUrl ? toDataUrl(msg.imageUrl) : Promise.resolve(''),
      ]);
      setAvatarB64(av);
      setImageB64(im);
      setStatus('rendering');
    };

    prepare();
  }, [currentIndex]);

  // Step 3: When status becomes 'rendering', wait for DOM then capture
  useEffect(() => {
    if (status !== 'rendering') return;

    const timeout = setTimeout(async () => {
      setStatus('capturing');
      const el = containerRef.current;
      if (!el) {
        setCurrentIndex(prev => prev + 1);
        return;
      }

      try {
        let dataUrl: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            dataUrl = await toPng(el, {
              backgroundColor: '#000000',
              pixelRatio: 2,
              skipFonts: true,
            });
            break;
          } catch {
            await new Promise(r => setTimeout(r, 500));
          }
        }

        if (dataUrl) {
          await downloadDataUrl(dataUrl, `msg-${String(currentIndex + 1).padStart(3, '0')}.png`);
        }
      } catch (err) {
        console.error(`Error exporting message ${currentIndex + 1}:`, err);
      }

      setCurrentIndex(prev => prev + 1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [status]);

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
          {status === 'preparing' ? 'Caricamento immagini...' : status === 'rendering' ? 'Rendering...' : 'Cattura in corso...'}
        </p>
      </div>

      {/* Render target - uses only inline base64 images for reliable capture */}
      <div
        ref={containerRef}
        style={{
          width: 420,
          padding: '12px 0',
          backgroundColor: '#000000',
        }}
      >
        <div style={{
          backgroundColor: 'hsl(222, 13%, 7%)',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          padding: '12px 0',
        }}>
          <div style={{ display: 'flex', gap: 8, padding: '0 12px', justifyContent: msg.isUser ? 'flex-end' : 'flex-start' }}>
            {!msg.isUser && character && avatarB64 && (
              <img
                src={avatarB64}
                alt={character.name}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginTop: 4, flexShrink: 0 }}
              />
            )}

            <div
              style={{
                position: 'relative',
                borderRadius: 8,
                padding: '8px 12px',
                maxWidth: '80%',
                backgroundColor: msg.isUser ? 'hsl(142, 45%, 18%)' : 'hsl(222, 13%, 18%)',
                borderTopRightRadius: msg.isUser ? 0 : 8,
                borderTopLeftRadius: msg.isUser ? 8 : 0,
              }}
            >
              {!msg.isUser && character && (
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: `hsl(${character.color})` }}>
                  {character.name} {character.emoji}
                </p>
              )}

              {msg.replyTo && (
                <div style={{
                  borderLeft: '2px solid hsl(142, 70%, 45%)',
                  paddingLeft: 8,
                  marginBottom: 4,
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '0 4px 4px 0',
                  fontSize: 12,
                  color: 'hsl(215, 15%, 55%)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {msg.replyTo}
                </div>
              )}

              {imageB64 && (
                <img
                  src={imageB64}
                  alt=""
                  style={{ borderRadius: 6, marginBottom: 4, maxWidth: '100%', maxHeight: 288, objectFit: 'cover' }}
                />
              )}

              <p style={{ fontSize: 15, color: 'hsl(0, 0%, 93%)', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, margin: 0 }}>
                {msg.text}
              </p>

              <p style={{
                fontSize: 11,
                color: 'hsl(215, 15%, 55%)',
                textAlign: 'right',
                marginTop: 2,
                marginBottom: -2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}>
                <span>{timeStr}</span>
                {logoB64 && (
                  <img src={logoB64} alt="" style={{ width: 28, height: 28, objectFit: 'contain', display: 'inline-block' }} />
                )}
                {msg.isUser && <span style={{ color: 'hsl(142, 70%, 45%)' }}>✓✓</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotExporter;
