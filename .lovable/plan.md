

## Adicionar upload de imagem no nó "Enviar Imagem"

### Alteração

**`src/components/flow-builder/NodeConfigPanel.tsx`** — Separar `send_image` dos outros nós de mídia e criar uma interface com abas (Link / Upload), similar ao que já existe no `send_audio`:

1. Remover `send_image` do bloco genérico de mídia (linha 209)
2. Criar novo bloco exclusivo para `send_image` com `Tabs`:
   - **Aba Link**: campo URL como hoje
   - **Aba Upload**: área de drag/upload que faz upload para Supabase Storage (bucket `audio-files` ou criar `media-files`) e salva a URL pública no `config.file`
3. Manter o campo de legenda (caption) abaixo das abas
4. Preview da imagem quando já houver uma URL carregada

### Bucket de storage
Reutilizar o bucket `audio-files` existente (já tem políticas configuradas) ou, se preferível, o upload salva no mesmo bucket. A URL pública gerada funciona igual ao link manual.

