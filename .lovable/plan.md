## Piano di Implementazione

### 1. Fix errori build (priorità immediata)

- **Index.tsx**: Rimuovere import `RoastLevel`, `defaultVipCharacters`. Rinominare `vipChars`→`bothChars`, rimuovere ref a `'vip'` type. Rimuovere stato `roastLevel`.
- **SettingsDialog.tsx**: Rimuovere import e prop `RoastLevel`, `roastLevel`, `onRoastLevelChange`.

### 2. Rimuovere funzionalità non desiderate

- **JSON Export**: Rimuovere `handleExport` da Index.tsx, rimuovere prop `onExport` da ChatInput, rimuovere bottone Download.
- **Livello di Cattiveria**: Rimuovere radio group "Livello di Cattiveria" da SettingsDialog e relativo stato/prop.
- **Risposte Interattive**: Rimuovere switch "Risposte Interattive" da SettingsDialog e relativo stato/prop.
  &nbsp;

### 3. Sostituire "VIP" con "Entrambi"

- SettingsDialog: Cambiare label `👑 VIP` → `👥 Entrambi` nel radio group.
- Presets tab: Cambiare testo `'VIP'` → `'Entrambi'`.
- characters.ts è già aggiornato con `both` type.

### 4. Modalità solo manuale

- Rimuovere la logica AI da `startRoastSequence`: eliminare la chiamata a `supabase.functions.invoke('generate-roast')`. I messaggi senza testo custom vengono saltati o mostrati con placeholder.
- Semplificare: la sequenza mostra solo messaggi con testo definito manualmente.

### 5. Chat singola = chat gruppo

- Unificare la logica: in modalità singola, usare lo stesso flusso di `startRoastSequence` con un solo personaggio. Rimuovere la distinzione speciale per `chatMode === 'single'`.

### 6. Nessun limite personaggi nei gruppi

- Aggiungere bottone "Aggiungi Personaggio" nella sezione Personaggi di SettingsDialog.
- Aggiungere bottone "Rimuovi" per ogni personaggio (con conferma).
- Nuovo personaggio creato con ID univoco, nome/emoji/ruolo di default editabili.
- Rimuovere `max` constraint sull'input ordine (`max={totalChars}`).

### 7. Export automatico screenshot di tutti i messaggi

Dopo che la conversazione è generata, aggiungere un bottone **"📸 Scarica Tutti gli Screenshot"** che:

- Usa `html-to-image` (libreria) per renderizzare ogni messaggio in modalità screenshot (stessa UI del ScreenshotModal) come immagine PNG.
- Crea un componente nascosto che renderizza ogni messaggio uno alla volta nello stile screenshot (sfondo nero + striscia wa-pattern).
- Converte ogni render in PNG via `toPng()`.
- Opzione 1: Scarica tutte le immagini in un file ZIP (usando `jszip`). 
- Opzione 2: Scarica una per una in sequenza rapida.
- Il bottone apparirà nel ChatInput area quando ci sono messaggi e non si sta generando. (Implementa opzione 2 che è molto importante per me)
- gli screen di ogni messaggio deve essere nella modalità del doppio click

### 8. Dettagli tecnici

**Dipendenze da aggiungere**: `html-to-image`, `jszip` (per download ZIP).

**File modificati**:

- `src/lib/characters.ts` — già OK (both type)
- `src/pages/Index.tsx` — fix imports, rimuovere AI/export/roastLevel/interactive, aggiungere add/remove chars, aggiungere export screenshots
- `src/components/SettingsDialog.tsx` — rimuovere roastLevel/interactive props, VIP→Entrambi, aggiungere add/remove personaggi
- `src/components/ChatInput.tsx` — rimuovere export button, aggiungere bottone screenshot export
- Nuovo: `src/components/ScreenshotExporter.tsx` — componente che renderizza tutti i messaggi come screenshot e li scarica come ZIP