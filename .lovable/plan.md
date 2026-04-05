

## Adicionar upload de arquivo no nó "Enviar Arquivo"

### Alteração

**`src/components/flow-builder/NodeConfigPanel.tsx`** — Separar `send_file` do `send_sticker` e criar interface com abas (Link / Upload), igual ao que já foi feito para imagem e vídeo:

1. Manter `send_sticker` no bloco genérico (só link)
2. Criar bloco exclusivo para `send_file` com `Tabs`:
   - **Aba Link**: campo URL como hoje
   - **Aba Upload**: input de arquivo (qualquer tipo), upload para Supabase Storage bucket `audio-files`, salva URL pública no `config.file`
3. Validação de tamanho (máx 50MB) antes do upload
4. Exibir nome do arquivo enviado quando houver upload
5. Manter campo de legenda abaixo das abas

