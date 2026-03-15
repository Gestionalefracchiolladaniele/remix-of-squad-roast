import React, { useRef, useState } from 'react';
import { Send, Image, Smile, X, Download } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File) => void;
  onUploadPhoto: (file: File, text?: string) => void;
  onExport?: () => void;
  disabled?: boolean;
  interactive: boolean;
  hasMessages?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onUploadPhoto, onExport, disabled, interactive, hasMessages }) => {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (pendingFile) {
      onUploadPhoto(pendingFile, text.trim() || undefined);
      clearPending();
    } else if (text.trim()) {
      onSendMessage(text.trim());
    }
    setText('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const clearPending = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="bg-popover border-t border-border">
      {/* Photo preview bar */}
      {previewUrl && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="relative">
            <img src={previewUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
            <button
              onClick={clearPending}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Aggiungi un messaggio e invia</p>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Image className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {interactive || pendingFile ? (
          <>
            <div className="flex-1 relative">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={pendingFile ? "Aggiungi un messaggio..." : "Scrivi un messaggio..."}
                disabled={disabled}
                className="w-full bg-secondary text-foreground text-sm rounded-full px-4 py-2 pr-10 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <Smile className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && !pendingFile)}
              className="p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
            {hasMessages && onExport && (
              <button
                onClick={onExport}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Esporta per Social"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 text-center text-xs text-muted-foreground py-2">
            📸 Carica una foto per iniziare il roast
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
