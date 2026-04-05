

## Mostrar todas as fotos de cada veículo no carrossel WhatsApp

### Problema
Atualmente, o carrossel envia apenas `images[0]` de cada veículo. O cliente só vê uma foto por veículo.

### Solução
No webhook `whatsapp-webhook/index.ts`, enviar as fotos adicionais de cada veículo como mensagens de imagem separadas **antes** do card do carrossel, criando um efeito de álbum.

### Alterações em `supabase/functions/whatsapp-webhook/index.ts`

1. **Antes de enviar o carrossel** (linhas ~525-532): Para cada veículo que tem mais de 1 imagem, enviar as imagens extras (a partir do índice 1) como mensagens individuais via `sendWhatsAppMedia`, com legenda identificando o veículo (ex: `📸 {nome} - Foto {n}`). Um pequeno delay entre envios para evitar throttling.

2. **No fallback de texto** (linhas ~536-542): Já envia imagem individual por veículo — alterar para enviar **todas** as imagens do veículo, não apenas `images[0]`.

### Fluxo resultante
```text
1. Envia álbum de fotos extras de cada veículo (imagens 2, 3, 4...)
2. Envia o carrossel com a foto principal (imagem 1) + botão de seleção
3. Cliente vê todas as fotos E pode selecionar via carrossel
```

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts`

