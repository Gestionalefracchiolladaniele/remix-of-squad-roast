import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Character, ChatMessage, GroupType } from '@/lib/characters';
import { toast } from 'sonner';

export interface ChatSession {
  id: string;
  group_type: string;
  group_name: string;
  roast_level: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
}

export interface CharacterPreset {
  id: string;
  group_type: string;
  preset_name: string;
  characters: Character[];
  created_at: string;
}

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [presets, setPresets] = useState<CharacterPreset[]>([]);

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      // Get message counts
      const sessionsWithCounts = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);
          return { ...s, messageCount: count || 0 };
        })
      );
      setSessions(sessionsWithCounts);
    }
  }, []);

  const loadPresets = useCallback(async () => {
    const { data, error } = await supabase
      .from('character_presets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPresets(data.map((p: any) => ({ ...p, characters: p.characters as unknown as Character[] })));
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadPresets();
  }, [loadSessions, loadPresets]);

  const saveSession = useCallback(async (
    groupType: string,
    groupName: string,
    roastLevel: string,
    messages: ChatMessage[],
    existingSessionId?: string
  ): Promise<string | null> => {
    try {
      let sessionId = existingSessionId;

      if (sessionId) {
        await supabase
          .from('chat_sessions')
          .update({ group_name: groupName, roast_level: roastLevel, updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      } else {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({ group_type: groupType, group_name: groupName, roast_level: roastLevel })
          .select('id')
          .single();
        if (error) throw error;
        sessionId = data.id;
      }

      // Delete old messages and re-insert
      await supabase.from('chat_messages').delete().eq('session_id', sessionId);

      if (messages.length > 0) {
        const rows = messages.map(m => ({
          session_id: sessionId!,
          character_id: m.characterId,
          text: m.text,
          is_user: m.isUser,
          image_url: m.imageUrl || null,
          reply_to: m.replyTo || null,
        }));
        await supabase.from('chat_messages').insert(rows);
      }

      await loadSessions();
      return sessionId!;
    } catch (err) {
      console.error('Save session error:', err);
      toast.error('Errore nel salvare la sessione');
      return null;
    }
  }, [loadSessions]);

  const loadSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      characterId: m.character_id,
      text: m.text,
      timestamp: new Date(m.created_at),
      isUser: m.is_user,
      imageUrl: m.image_url || undefined,
      replyTo: m.reply_to || undefined,
    }));
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    await loadSessions();
  }, [loadSessions]);

  const savePreset = useCallback(async (groupType: string, presetName: string, characters: Character[]) => {
    try {
      // Strip avatar blob URLs (they won't persist)
      const cleanChars = characters.map(c => ({
        ...c,
        avatar: c.avatar.startsWith('blob:') ? '' : c.avatar,
      }));
      await supabase
        .from('character_presets')
        .insert({ group_type: groupType, preset_name: presetName, characters: cleanChars as any });
      await loadPresets();
      toast.success('Preset salvato!');
    } catch (err) {
      toast.error('Errore nel salvare il preset');
    }
  }, [loadPresets]);

  const deletePreset = useCallback(async (presetId: string) => {
    await supabase.from('character_presets').delete().eq('id', presetId);
    await loadPresets();
  }, [loadPresets]);

  return {
    sessions,
    presets,
    saveSession,
    loadSessionMessages,
    deleteSession,
    savePreset,
    deletePreset,
    refreshSessions: loadSessions,
    refreshPresets: loadPresets,
  };
}
