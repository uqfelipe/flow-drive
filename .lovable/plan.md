

# Plano: Melhorar visualização do chat WhatsApp

## O que será feito

Redesign visual completo da página `/conversations` para uma experiência mais moderna e imersiva, inspirada no WhatsApp Web.

## Alterações em `src/pages/Conversations.tsx`

### Painel esquerdo (lista de conversas)
- Header com gradiente sutil usando cor primary
- Hover com animação mais suave nos itens da lista
- Separador visual entre conversas com linha fina
- Último texto com ícone de tipo (📷, 🎵) inline mais elegante
- Status online indicator (bolinha verde) no avatar

### Painel direito (área de chat)
- **Background**: padrão de fundo estilo WhatsApp (pattern SVG sutil em vez de dots)
- **Bolhas de mensagem**: sombras mais pronunciadas, cantos arredondados com "tail" (triângulo), max-width ajustado
- **Bolhas enviadas**: gradiente sutil de primary ao invés de cor sólida
- **Bolhas recebidas**: fundo branco/card com borda mais suave
- **Separadores de data**: estilo pill mais clean com backdrop-blur
- **Header do chat**: adicionar botão de chamada e mais opções visuais
- **Input area**: campo com bordas arredondadas maiores, botão de envio com animação de rotação ao enviar, ícone de anexo e emoji (decorativo)
- **Timestamps**: posicionados como "cauda" da bolha, mais discretos
- **Mensagem enviando**: efeito de opacity/loading enquanto `isPending`

### Melhorias gerais
- Transições suaves ao trocar de conversa (fade in nas mensagens)
- Empty state mais visual com ilustração SVG inline
- Responsividade melhorada com transição slide no mobile

