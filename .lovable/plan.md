

## Criar `vercel.json` para SPA routing

Adicionar um arquivo `vercel.json` na raiz do projeto para redirecionar todas as rotas para `index.html`, evitando erro 404 ao acessar rotas diretamente ou dar refresh.

### Arquivo: `vercel.json` (novo)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Isso garante que qualquer rota (ex: `/conversations`, `/vehicles`) seja servida pelo `index.html`, permitindo que o React Router cuide do roteamento no client-side.

> **Nota:** Se o projeto está hospedado no Lovable (`.lovable.app`), esse arquivo não é necessário — o Lovable já faz SPA fallback automaticamente. O `vercel.json` só é útil se você estiver fazendo deploy na Vercel separadamente.

