

## Indicadores visuais de mídia nos nós de Imagem, Vídeo e Arquivo

### O que muda

**`src/components/flow-builder/FlowNode.tsx`**

Adicionar indicadores visuais para `send_image`, `send_video`, `send_file` e `send_sticker`, seguindo o mesmo padrão do indicador de áudio existente. Cada tipo terá seu ícone e cor correspondente (do `nodeTypes.ts`):

| Tipo | Ícone | Cor | Configurado | Não configurado |
|------|-------|-----|-------------|-----------------|
| `send_image` | Image | #10B981 | "Imagem anexada" | "Sem imagem" |
| `send_video` | Video | #EF4444 | "Vídeo anexado" | "Sem vídeo" |
| `send_file` | File | #6366F1 | "Arquivo anexado" | "Sem arquivo" |
| `send_sticker` | Sticker | #A855F7 | "Figurinha anexada" | "Sem figurinha" |

Alterações:
1. Importar ícones `Image`, `Video`, `File`, `Sticker` do lucide-react
2. Detectar se o nó é de mídia (`isMediaNode`) e se tem arquivo configurado (`hasFile`) via `config.file`
3. Renderizar um indicador compacto com ícone + texto de status, usando as cores do nó — verde/emerald quando configurado, cor do nó apagada quando vazio
4. Excluir da descrição genérica os nós de mídia (assim como já é feito para áudio)

O indicador será visualmente consistente com o de áudio mas sem as barras de waveform — usa apenas ícone + texto + borda colorida.

