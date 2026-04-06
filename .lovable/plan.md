

## Aumentar limite de gravação de áudio para 30 minutos

### Alteração

| Arquivo | O que |
|---------|-------|
| `src/components/NotesBlock.tsx` | Alterar `MAX_SECONDS` de `120` para `1800` (30 min) |

Linha 26: `const MAX_SECONDS = 120;` → `const MAX_SECONDS = 1800;`

Aviso: com 30 minutos de áudio em base64 no localStorage, o armazenamento pode ficar pesado (~20-40MB por gravação). Se isso virar problema no futuro, migrar para Supabase Storage seria o ideal.

