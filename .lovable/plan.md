

# Audio player estilo WhatsApp

## O que mudar

**Arquivo:** `src/pages/Conversations.tsx` — componente `MediaAudio`

Substituir o `<audio controls>` nativo por um player customizado no estilo WhatsApp:

- Botão play/pause circular
- Barra de progresso com waveform visual (barras simuladas)
- Indicador de duração (tempo atual / total)
- Ícone de microfone azul para PTT
- Avatar do contato no lado direito (para mensagens recebidas)
- Layout compacto e arredondado

**Implementação:**
- Usar `useRef` + `useState` para controlar `<audio>` hidden programaticamente
- Gerar waveform fake com barras de altura variável (padrão visual)
- Atualizar progresso via `timeupdate` event
- Mostrar duração formatada (mm:ss)
- Estilo diferente para `fromMe` vs recebida

