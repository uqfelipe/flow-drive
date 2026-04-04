

## Melhorar estilo do chat — refinamento visual

### Mudanças planejadas

O chat já tem uma base boa. As melhorias focam em refinamento, espaçamento e polish visual para dar um aspecto mais premium e organizado.

**`src/pages/Conversations.tsx`** — ajustes de estilo:

1. **Lista de conversas (painel esquerdo)**:
   - Aumentar espaçamento entre itens para respirar melhor
   - Avatar com borda sutil ao invés de indicador de status sobreposto
   - Preview de mensagem com max 1 linha e estilo mais clean
   - Hover mais suave com transição

2. **Header do chat (painel direito)**:
   - Barra mais limpa com separação visual mais elegante
   - Status online/offline mais discreto com texto "online" / "offline"
   - Remover botão de vídeo (não funcional)

3. **Bolhas de mensagem**:
   - Mensagens enviadas: gradiente mais suave, sombra reduzida, border-radius maior e mais consistente
   - Mensagens recebidas: fundo mais claro e neutro, sem bordas desnecessárias
   - Espaçamento entre mensagens do mesmo remetente reduzido (agrupamento visual)
   - Horário e status mais elegantes com tipografia menor e mais espaço

4. **Separadores de data**:
   - Estilo mais discreto, com linha horizontal + texto centralizado (estilo WhatsApp Web)

5. **Input area**:
   - Input com height maior e cantos mais arredondados
   - Botões de emoji/clip mais integrados visualmente
   - Botão de envio com animação mais sutil

6. **Background do chat**:
   - Pattern mais sutil ou gradiente suave ao invés do SVG pattern atual

**`src/index.css`** — possível ajuste fino de variáveis de cor se necessário.

### Resultado esperado
Chat com visual limpo, espaçado e profissional — similar ao Telegram Desktop ou WhatsApp Web modernizado, com hierarquia visual clara e interações suaves.

