

## Completar configuração do nó "Enviar Link"

Atualmente o `send_link` só tem 2 campos (URL e Mensagem). Vamos adicionar o campo **Label do botão** — o texto exibido no botão que o usuário clica para abrir o link. O webhook já usa `cfg.label || cfg.buttonText || "Acessar"`.

### Mudanças

**1. `src/components/flow-builder/NodeConfigPanel.tsx` (linhas 72-83)**

Substituir o bloco `send_link` por:

```tsx
{nt === "send_link" && (
  <>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
      <Textarea className="text-sm min-h-[60px]" placeholder="Texto exibido acima do botão..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">URL do Link</Label>
      <Input className="h-9 text-sm" placeholder="https://..." value={data.config?.url || ""} onChange={(e) => updateConfig({ url: e.target.value })} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Label do botão</Label>
      <Input className="h-8 text-sm" placeholder="Acessar" value={data.config?.label || ""} onChange={(e) => updateConfig({ label: e.target.value })} />
    </div>
  </>
)}
```

**2. `src/components/flow-builder/nodeTypes.ts`**

Atualizar `defaultConfig` do `send_link` para incluir `label`:

```typescript
defaultConfig: { url: "", message: "", label: "Acessar" }
```

(remover os campos `linkPreviewTitle`, `linkPreviewDescription`, `linkPreviewImage` que não são usados)

### Resultado
- **Mensagem**: texto exibido acima do botão
- **URL do Link**: endereço que abre ao clicar
- **Label do botão**: texto do botão, default "Acessar"

Mesma estrutura do Copia e Cola, consistente e completo.

