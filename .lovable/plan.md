

# Gravação de áudio para envio no chat

## O que será feito
Adicionar um botão de gravação de áudio na área de input do chat. Ao pressionar/clicar no microfone, o navegador captura áudio via `MediaRecorder API`, converte para base64 e envia como áudio PTT (push-to-talk) via a action `send-media` já existente (tipo `audio`).

## Fluxo do usuário
1. Sem texto digitado, o botão de microfone aparece (já existe visualmente)
2. Clique no mic → inicia gravação, UI muda para modo gravação (timer + botão cancelar + botão enviar)
3. Clique em enviar → para gravação, converte blob para base64 data URL, envia via `useSendMedia` com type `audio`
4. Clique em cancelar → descarta gravação

## Alterações

### `src/pages/Conversations.tsx`

**1. Novos estados e refs para gravação:**
- `isRecording`, `recordingTime`, `mediaRecorderRef`, `audioChunksRef`, `recordingTimerRef`

**2. Funções de gravação:**
- `startRecording()`: pede permissão do mic via `navigator.mediaDevices.getUserMedia`, cria `MediaRecorder` (webm/ogg), coleta chunks, inicia timer
- `stopRecording()`: para o recorder, monta blob, converte para base64 data URL, envia via `sendMediaMutation` com type=`audio`
- `cancelRecording()`: para o recorder, limpa estado

**3. UI do modo gravação (substituir input area quando `isRecording`):**
- Indicador vermelho pulsante + timer (MM:SS)
- Botão de cancelar (lixeira/X)
- Botão de enviar (send)
- Animação suave com framer-motion

**4. Botão mic existente (linha 1266-1272):**
- Adicionar `onClick={startRecording}` ao botão de mic que já existe

### Edge function — sem alteração
A action `send-media` já suporta type `audio` e aceita base64 data URLs no campo `file`.

## Resultado
- Gravação nativa do navegador, sem dependências externas
- Visual integrado ao tema dark premium existente
- Envio como áudio que aparece reproduzível no WhatsApp do destinatário

