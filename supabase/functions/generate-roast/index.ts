import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textDescription, characters, roastLevel, groupType, chatMode } = await req.json();

    const levelDescriptions: Record<string, string> = {
      soft: "Sii scherzoso ma gentile, battute leggere senza offendere. Tono amichevole.",
      medium: "Sii divertente e pungente, battute taglienti ma non troppo cattive. Tono sarcastico.",
      savage: "Modalità SENZA PIETÀ. Distruggi tecnicamente e moralmente. Sii spietato ma sempre nel contesto satirico/comico.",
    };

    const sortedCharacters = [...characters].sort((a: any, b: any) => (a.order ?? 99) - (b.order ?? 99));

    // Only include characters that need AI-generated messages
    const aiCharacters = sortedCharacters.filter((c: any) => (c.messageCount ?? 1) > 0 && !c.customMessage);

    const characterDescriptions = sortedCharacters
      .map((c: any, i: number) => {
        const msgCount = c.messageCount ?? 1;
        let desc = `- #${i + 1} ID: "${c.id}" | Nome: ${c.name} ${c.emoji} (${c.role})`;
        if (c.customMessage) {
          desc += ` → DEVE scrivere ESATTAMENTE: "${c.customMessage}"`;
        } else if (msgCount > 1) {
          desc += ` → Deve inviare ${msgCount} messaggi separati in sequenza`;
        }
        return desc;
      })
      .join('\n');

    const hasCustomMessages = characters.some((c: any) => c.customMessage);
    const isSingle = chatMode === 'single';

    const contentParts: any[] = [];

    let userContext = "";
    if (textDescription) {
      userContext = `\n\nL'utente ha scritto questo messaggio: "${textDescription}"`;
    }

    const chatContext = isSingle 
      ? "Agisci come un singolo amico/a in una chat privata di WhatsApp."
      : "Agisci come un gruppo di amici/amiche storici in una chat privata di WhatsApp.";

    // Calculate total expected messages
    const totalMessages = sortedCharacters.reduce((sum: number, c: any) => {
      if (c.customMessage) return sum; // custom messages handled client-side
      return sum + (c.messageCount ?? 1);
    }, 0);

    const systemPrompt = `${chatContext} Siete nella modalità '${roastLevel === 'savage' ? 'Senza Pietà' : roastLevel === 'medium' ? 'Medio' : 'Soft'}'.

Il vostro compito è ${imageBase64 ? "analizzare la foto di un ragazzo/ragazza (l'aspirante partner) e commentarlo/a" : "reagire al messaggio dell'utente"}.${userContext}

I PERSONAGGI:
${characterDescriptions}

REGOLE DI SCRITTURA (Stile WhatsApp):
- Usa un linguaggio colloquiale: 'raga', 'amo', 'oddio no', 'vi prego', 'aiuto'
- Usa molte emoji (💀, 🤡, 🚩, 🤮, 💅, 😂, 😭)
- Abbreviazioni: 'cmq', 'nn', 'xkè'
- I messaggi devono essere brevi e in sequenza, come se stessero scrivendo freneticamente
- Ogni messaggio deve riflettere la personalità del personaggio
- Se un personaggio deve inviare più messaggi, ogni messaggio deve essere diverso e progressivo (come se stesse scrivendo più volte di seguito)

LIVELLO DI CATTIVERIA: ${levelDescriptions[roastLevel] || levelDescriptions.savage}

${imageBase64 ? "ANALISI FOTO: Guarda attentamente la foto. Commenta dettagli specifici: outfit, sfondo, espressione, pose, oggetti visibili." : ""}

${hasCustomMessages ? "IMPORTANTE: Se un personaggio ha un messaggio personalizzato specificato, NON generare messaggi per lui. Genera SOLO per i personaggi senza messaggio personalizzato." : ""}

OUTPUT: Rispondi SOLO con un JSON array valido. Ogni elemento deve avere:
- "charId": l'ID del personaggio (usa ESATTAMENTE l'ID indicato sopra)
- "text": il messaggio

GENERA ESATTAMENTE ${totalMessages} messaggi totali. Per i personaggi che devono inviare più messaggi, crea più elementi con lo stesso charId. SEGUI L'ORDINE NUMERICO dei personaggi.

RISPONDI SOLO CON IL JSON ARRAY, NESSUN ALTRO TESTO.`;

    contentParts.push({ type: "text", text: systemPrompt });

    if (imageBase64) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
        },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    let roasts;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        roasts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (parseErr) {
      console.error('Parse error, raw content:', content);
      roasts = sortedCharacters.map((c: any) => ({
        charId: c.id,
        text: c.customMessage || `${c.emoji} Raga nn ce la faccio 💀`,
      }));
    }

    // Only keep messages for characters that were sent (no dedup - allow multiple per char)
    const validIds = new Set(sortedCharacters.map((c: any) => c.id));
    const finalRoasts = roasts.filter((r: any) => validIds.has(r.charId));

    return new Response(JSON.stringify({ roasts: finalRoasts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
