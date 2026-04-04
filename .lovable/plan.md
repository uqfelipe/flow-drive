

## Adicionar opções de áudio no nó "Enviar Áudio" do Flow Builder

### Situação atual
O nó `send_audio` só aceita uma URL de arquivo (campo "URL do arquivo"). O usuário quer poder:
1. Colar um link de áudio
2. Fazer upload de um arquivo de áudio
3. Gravar áudio diretamente no painel de configuração

### Alterações

**1. `src/components/flow-builder/NodeConfigPanel.tsx`**
- Separar o `send_audio` do bloco genérico de mídia (linhas 235-248)
- Criar seção dedicada com 3 abas/modos:
  - **Link** — input de URL (como já existe)
  - **Upload** — input file que aceita `audio/*`, faz upload para Supabase Storage e salva a URL pública
  - **Gravar** — botão de gravação usando `MediaRecorder` API do navegador, com visualização de tempo, botão parar, e preview do áudio gravado. Ao finalizar, faz upload para Supabase Storage
- O config salva sempre `{ file: "url_final", audioSource: "link"|"upload"|"recording" }` — o webhook usa apenas `file`

**2. Supabase Storage** — criar bucket `audio-files` (público) via migration SQL para armazenar uploads e gravações

**3. `src/components/flow-builder/AudioRecorder.tsx`** (novo componente)
- Usa `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder`
- Estados: idle → recording → recorded
- Mostra timer durante gravação
- Preview com `<audio>` tag após gravar
- Botão "Usar este áudio" faz upload ao storage e chama callback com URL

**4. `nodeTypes.ts`** — atualizar `defaultConfig` do `send_audio` para `{ file: "", audioSource: "link" }`

### Resultado
No painel de configuração do nó "Enviar Áudio", o usuário verá 3 tabs (Link / Upload / Gravar) para escolher como fornecer o áudio. Todas as opções resultam em uma URL pública salva no campo `file` do config.

