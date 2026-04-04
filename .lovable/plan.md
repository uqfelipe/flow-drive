

## Simplificar configuração do Menu Botões

### Problema atual
O painel de configuração do `menu_buttons` está poluído: cada botão tem um seletor de tipo (Resposta/URL/Copiar/Ligar) que raramente é usado, os inputs estão apertados, e o campo de imagem fica misturado com o resto.

### Alterações

**`src/components/flow-builder/NodeConfigPanel.tsx`** — bloco `menu_buttons` (linhas 109-140):

1. **Separar em seções visuais claras**: Mensagem, Botões, e Imagem (colapsada/opcional)
2. **Simplificar botões**: mostrar apenas o campo de texto do botão + botão de remover. O tipo fica fixo como `REPLY` (o mais comum). Se precisar de URL/CALL, o usuário pode usar os nós específicos (send_link, etc.)
3. **Remover o seletor de tipo** dos botões — simplifica drasticamente a interface
4. **Mover campo de imagem** para baixo com label "Imagem (opcional)" mais claro
5. **Melhorar layout dos botões**: inputs maiores, espaçamento melhor, numeração visual (1, 2, 3...)
6. **Limite visual**: mostrar indicador "máx. 3 botões" (limite da API do WhatsApp) e desabilitar o botão de adicionar quando atingir 3

### Visual esperado
```
Mensagem
[__________________________]
[__________________________]

Botões (máx. 3)
 1. [Botão 1____________] [x]
 2. [Botão 2____________] [x]
 [+ Adicionar Botão]

Imagem (opcional)
[https://...____________]
```

