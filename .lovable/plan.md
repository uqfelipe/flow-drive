

## Redesign do Bloco de Notas + Notas de Áudio

### O que será feito

1. **Visual refinado e responsivo** — redesign completo do `NotesBlock` com layout em grid de cards (estilo post-its), tamanhos responsivos, gradientes sutis, tipografia maior na página dedicada
2. **Página `/notes` full-width** — remover limite `max-w-2xl`, usar toda a largura disponível
3. **Gravação de áudio como nota** — integrar gravador de áudio inline no dialog de criação/edição. Notas podem ter texto, áudio, ou ambos
4. **Player de áudio nas notas** — notas com áudio mostram um mini player inline na listagem

### Alterações

| Arquivo | O que |
|---------|-------|
| `src/hooks/use-notes.ts` | Adicionar campo opcional `audioUrl` no tipo `Note` e nos métodos CRUD |
| `src/components/NotesBlock.tsx` | Redesign completo: grid responsivo de cards, visual refinado, gravador de áudio no dialog, mini player na listagem, ícones de tipo (texto/áudio), empty state melhorado |
| `src/pages/Notes.tsx` | Layout full-width responsivo com padding adequado |

### Layout da listagem (grid responsivo)

```text
Mobile (1 col)          Tablet (2 cols)         Desktop (3 cols)
┌──────────┐           ┌─────┐ ┌─────┐         ┌────┐ ┌────┐ ┌────┐
│ Nota 1   │           │ N1  │ │ N2  │         │ N1 │ │ N2 │ │ N3 │
│ 🎤 ▶     │           │     │ │ 🎤  │         │    │ │ 🎤 │ │    │
└──────────┘           └─────┘ └─────┘         └────┘ └────┘ └────┘
```

### Detalhes do áudio
- O gravador será embutido no dialog de nova/editar nota (abaixo do textarea)
- Áudio salvo como blob URL no localStorage (base64 encoded)
- Sem dependência de Supabase Storage — tudo local
- Notas com áudio mostram badge "Áudio" e mini player com play/pause
- Limite de ~2min por gravação para não estourar localStorage

### Melhorias visuais
- Cards com hover lift (shadow + scale sutil)
- Barra de busca com ícone animado
- Badge colorida por tipo (texto = azul, áudio = vermelho, ambos = roxo)
- Empty state com ilustração maior e CTA claro
- Transições suaves com `transition-all`

