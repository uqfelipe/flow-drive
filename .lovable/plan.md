

## Exibir imagens base64 nas conversas e nos campos personalizados do cliente

### Problema identificado
1. **Conversas**: Imagens recebidas via WhatsApp têm URLs encriptadas (`.enc`) e a `fileUrl` chega vazia ou inacessível. O `MediaImage` mostra ícone quebrado porque não consegue acessar a URL diretamente. O thumbnail (JPEGThumbnail base64) existe mas às vezes não é suficiente.
2. **Campos Personalizados (CustomerEdit)**: Campos do tipo `image` mostram o valor como texto puro num `<Input>`, sem renderizar a imagem.

### Alterações

**`src/pages/Conversations.tsx`** — MediaImage + extractContent:

1. **Detectar base64 na `fileUrl` e `content`**: No `extractContent`, quando o tipo é image, verificar se `content` contém dados base64 (ex: `c?.data` que começa com `data:image/` ou `c?.base64`). Se sim, usar como `fileUrl` diretamente — igual ao tratamento já feito para vídeos base64.

2. **MediaImage — upload automático para imgbb**: Quando `displayUrl` é um data URI base64, converter para blob e fazer upload automático ao imgbb. Cachear o resultado no `mediaUrlCache` para não re-uploadar. Atualizar `displayUrl` com a URL do imgbb.

3. **Fallback thumbnail**: Se `fileUrl` estiver vazia e houver thumbnail base64, usar o thumbnail como imagem clicável (já funciona parcialmente, mas precisa garantir).

**`src/pages/CustomerEdit.tsx`** — Tab Campos Personalizados:

4. **Renderizar imagens nos campos tipo `image`**: Na iteração dos `fieldDefs`, quando `fd.field_type === "image"`, em vez de um `<Input>`, renderizar:
   - Se o valor (`customFields[fd.field_key]`) existir: mostrar `<img>` com a URL/base64, com botão de abrir em nova aba e botão de remover.
   - Se o valor estiver vazio: mostrar placeholder com ícone.
   - Manter a label e tooltip existentes.

5. **Campos tipo `audio`**: Renderizar `<audio controls>` com o valor como src.

6. **Campos tipo `file`**: Renderizar link de download com ícone.

### Detalhes técnicos
- Upload imgbb no `MediaImage`: usar `fetch(base64url)` → blob → FormData → POST imgbb API. A key já existe como constante.
- No `extractContent`, adicionar checagem antes do bloco de Image: `if (c?.data?.startsWith?.("data:image/")) return { ..., fileUrl: c.data }` e `if (c?.base64?.startsWith?.("data:image/")) return { ..., fileUrl: c.base64 }`.
- Para o CustomerEdit, a lógica de renderização condicional substitui o `<Input>` por componentes visuais baseados no `field_type`.

