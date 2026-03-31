

# Melhorar visual do player de vídeo e remover autoplay

## Alterações em `src/pages/Conversations.tsx`

### MediaVideo (linhas 298-311)
- Remover `autoPlay` do `<video>` para nunca reproduzir automaticamente
- Melhorar visual: adicionar fundo escuro arredondado, sombra suave, e estilização mais polida
- Adicionar `controlsList="nodownload"` para visual mais limpo
- Usar `rounded-2xl` e `shadow-lg` para visual premium

### Thumbnail/preview (linhas 314-339)
- Melhorar botão de play: gradiente sutil, sombra, escala no hover
- Transição mais suave no overlay

