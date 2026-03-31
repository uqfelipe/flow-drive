

# Redesign Premium — Tema Claro + Tema Escuro (Dracula)

## Resumo
Revisão completa da paleta de cores, variáveis CSS e componentes visuais para criar dois temas premium: um **tema escuro inspirado no Dracula** (roxos profundos, cyans e pinks harmoniosos) e um **tema claro refinado** (brancos quentes, cinzas suaves, acentos elegantes). Inclui melhorias no flow builder, sidebar, cards, inputs, badges e todos os elementos visuais.

---

## O que muda

### 1. Paleta de cores completa (src/index.css)

**Tema Escuro (Dracula-inspired):**
- Background: tons de `#282A36` → `#1E1F29` (roxo-escuro profundo)
- Cards: `#2D2F3D` com bordas `#383A4D`
- Foreground: `#F8F8F2` (branco quente Dracula)
- Primary: `#BD93F9` (roxo Dracula) em vez do azul genérico
- Success: `#50FA7B` (verde Dracula)
- Warning: `#FFB86C` (laranja Dracula)
- Destructive: `#FF5555` (vermelho Dracula)
- Accent/cyan: `#8BE9FD` para destaques secundários
- Muted-foreground: `#6272A4` (comentário Dracula)
- Sidebar: fundo ainda mais profundo `#191A24`, bordas sutis `#2A2C3A`
- Node colors ajustados para harmonia Dracula

**Tema Claro (Clean Premium):**
- Background: `#F8F9FC` (branco levemente azulado)
- Cards: `#FFFFFF` com bordas `#E8ECF1` suaves
- Foreground: `#1A1D2E` (quase-preto azulado)
- Primary: `#7C5CFC` (roxo elegante, mantém identidade com o dark)
- Success/Warning/Destructive: versões mais suaves e saturadas
- Muted: cinzas lavanda (`#F1F0F7`)
- Sidebar: fundo `#F0EEF8` lavanda claro com identidade forte

### 2. Melhorias globais de estilo (src/index.css)
- Transições globais em todos os elementos interativos
- Scrollbar estilizada por tema
- React Flow: background com grid pattern melhorado, edge glow sutil
- Sombras refinadas por tema (dark: glow sutil, light: shadow suave)
- `::selection` com cor da marca

### 3. AdminLayout (src/components/AdminLayout.tsx)
- Adicionar toggle de tema claro/escuro no header (Sun/Moon icon)
- Estado do tema gerenciado via localStorage + classe no root
- Header com glassmorphism mais pronunciado (`backdrop-blur-xl`, `bg-card/80`)
- Avatar com gradient sutil

### 4. Sidebar (src/components/AppSidebar.tsx)
- Logo com gradient background (Dracula purple → pink no dark)
- Itens ativos com left-border accent colorido
- Hover com background gradient sutil
- Separadores mais elegantes entre grupos

### 5. Cards do Dashboard (src/pages/Dashboard.tsx)
- Ícones com background gradient sutil por cor
- Cards com hover elevation (shadow lift)
- Borda superior colorida sutil nos cards de status
- Alertas com ícones e bordas laterais coloridas

### 6. Flow Builder visual upgrade
- **FlowNode.tsx**: Gradient top-bar colorido por categoria, sombra glow sutil no hover, backdrop blur nos nós, handles com animação de pulse
- **NodePalette.tsx**: Fundo com pattern sutil, items com hover mais pronunciado, badge de contagem colorido
- **NodeConfigPanel.tsx**: Header com gradient por categoria, inputs com focus ring colorido
- **FlowBuilder.tsx**: Background dots com cor temática, minimap com cores de nó corretas, controls com estilo premium, edge default glow

### 7. Demais páginas
- Vehicles, Rentals, Financial, Customers, Conversations: mesmos patterns de card, badge e table atualizados automaticamente via variáveis CSS
- Inputs: focus ring com cor primary, background sutil
- Badges: bordas e backgrounds harmoniosos

### 8. Tailwind config (tailwind.config.ts)
- Adicionar box-shadow custom para glow effects
- Adicionar gradient utilities se necessário

---

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Nova paleta completa (light + dark Dracula), transitions globais, scrollbar, React Flow overrides, selection |
| `tailwind.config.ts` | Box-shadow glow, novas utilities |
| `src/components/AdminLayout.tsx` | Toggle tema, header glassmorphism, avatar gradient |
| `src/components/AppSidebar.tsx` | Logo gradient, active state com border-left, hover melhorado |
| `src/components/flow-builder/FlowNode.tsx` | Gradient bar, glow shadow, handles animados |
| `src/components/flow-builder/NodePalette.tsx` | Background sutil, hover premium |
| `src/components/flow-builder/NodeConfigPanel.tsx` | Header gradient, styling refinado |
| `src/pages/FlowBuilder.tsx` | Background, minimap, controls e edges atualizados |
| `src/pages/Dashboard.tsx` | Cards com gradient icons, hover elevation, alertas melhorados |
| `src/pages/Vehicles.tsx` | Cards com hover premium |

---

## Resultado esperado
- Tema escuro sofisticado estilo Dracula com cores harmoniosas e conforto visual
- Tema claro limpo, leve e profissional com identidade consistente
- Toggle funcional entre temas
- Flow builder visualmente destacado nos dois temas
- Contraste excelente em todos os elementos
- Transições suaves em toda a interface

