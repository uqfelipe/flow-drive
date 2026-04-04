

## Exibir imagens nos Campos Personalizados e Arquivos

### Problema
1. **Campos Personalizados**: O campo "fotos" está com `field_type` provavelmente definido como "text", então renderiza como `<Input>` em vez de mostrar a imagem. O código já tem lógica para `field_type === "image"`, mas não detecta URLs de imagem quando o tipo é "text".
2. **Arquivos**: A aba mostra "Nenhum arquivo recebido" porque não há registros na tabela `customer_files` para este cliente. Imagens salvas em campos personalizados não aparecem lá.

### Alterações

**`src/pages/CustomerEdit.tsx`** — Campos Personalizados:

1. **Detecção inteligente de imagem**: Além de checar `fd.field_type === "image"`, verificar se o valor do campo é uma URL de imagem (contém `.jpg`, `.png`, `.webp`, `imgbb`, `ibb.co`, ou começa com `data:image/`). Se for, renderizar como `<img>` mesmo que o `field_type` seja "text".

2. **Auto re-host para imgbb**: Se o valor do campo personalizado for base64 ou URL de WhatsApp CDN, fazer upload automático para imgbb e atualizar o valor no `customFields` state (e salvar ao submeter).

**`src/pages/CustomerEdit.tsx`** — Aba Arquivos:

3. **Incluir imagens dos campos personalizados**: Na aba Arquivos, além dos registros de `customer_files`, listar também os valores de campos personalizados que são imagens (detectados pela URL ou `field_type`). Renderizar como cards de imagem iguais aos de `customer_files`, com label do campo como nome.

### Detalhes técnicos
- Função helper `isImageUrl(val)`: checa se string é URL de imagem por extensão ou domínio imgbb/ibb.co, ou se começa com `data:image/`.
- Na aba Campos Personalizados, a condição muda de `isImageField && val` para `(isImageField || isImageUrl(val)) && val`.
- Na aba Arquivos, após mapear `customerFiles`, adicionar seção "Imagens dos campos" iterando `fieldDefs` filtrando por valores que são URLs de imagem.

