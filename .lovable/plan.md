

## Adicionar indicador visual de "Mensagem de Voz" no nó Enviar Áudio

### O que muda

**`src/components/flow-builder/FlowNode.tsx`**
- Adicionar um bloco visual específico para nós `send_audio` no conteúdo do nó
- Mostrar um indicador estilo WhatsApp com ícone de microfone, barras de waveform animadas e texto "Mensagem de voz"
- Se o áudio já estiver configurado (campo `file` preenchido), mostrar "🎙 Áudio configurado" com cor verde
- Se não estiver configurado, mostrar "🎙 Sem áudio" com cor mais apagada
- O indicador fica na área de conteúdo do nó, abaixo do label

### Visual esperado
```text
┌──────────────────────────┐
│ 🎤 Enviar Áudio      ✏ ✕│
├──────────────────────────┤
│  Meu nó de áudio         │
│  ┌────────────────────┐  │
│  │ 🎙 ▎▌█▌▎ Msg de voz│  │
│  └────────────────────┘  │
│                       ●──│
└──────────────────────────┘
```

### Detalhes técnicos
- Extrair `config.file` do nodeData para saber se tem áudio configurado
- Renderizar barras de waveform com CSS (3-4 `<span>` com heights variadas e animação pulse)
- Cor âmbar (`#F59E0B`) para combinar com o tema do nó send_audio

