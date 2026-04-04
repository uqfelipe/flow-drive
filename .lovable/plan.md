

## Melhorar exibição de arquivos na aba Arquivos do cliente

### O que será feito
Aprimorar a aba "Arquivos" na página de edição do cliente para:
- **Imagens**: Hospedar automaticamente no imgbb (re-upload) e exibir a imagem renderizada. Atualizar a `file_url` no banco após o re-upload.
- **Arquivos gerais**: Botão de download direto.
- **PDFs**: Exibir prévia inline usando `<iframe>` ou Google Docs Viewer (`https://docs.google.com/gview?url=FILE_URL&embedded=true`).

### Alterações

**`src/pages/CustomerEdit.tsx`** — Aba Arquivos:

1. **Função `reHostToImgbb`**: Ao renderizar um card de imagem, verificar se a URL já é do imgbb. Se não for, fazer fetch da imagem → blob → upload para imgbb → atualizar `file_url` na tabela `customer_files` → exibir a URL do imgbb. Usar um estado local para controlar URLs já re-hospedadas.

2. **Card de Imagem**: Exibir `<img>` com a URL (original ou re-hospedada), com lightbox ao clicar (abrir em nova aba). Mostrar indicador de loading durante re-upload.

3. **Card de PDF**: Detectar PDF pelo `file_name` (extensão `.pdf`) ou `file_url` contendo `.pdf`. Renderizar prévia usando `<iframe src="https://docs.google.com/gview?url=ENCODED_URL&embedded=true">` com altura fixa. Manter botão de download abaixo.

4. **Card de Arquivo genérico**: Ícone de arquivo + nome + botão "Baixar" que abre a URL diretamente.

5. **Card de Áudio**: Manter o player `<audio>` atual.

### Detalhes técnicos
- O re-upload para imgbb usa a mesma função `uploadToImgbb` já existente no arquivo, adaptada para aceitar blob/URL.
- A atualização da `file_url` no banco é feita via `supabase.from("customer_files").update({ file_url }).eq("id", fileId)` para persistir a URL do imgbb.
- Google Docs Viewer é gratuito e funciona para PDFs públicos sem necessidade de API key.
- Detecção de PDF: `file_name?.endsWith('.pdf')` ou `file_url?.includes('.pdf')`.

