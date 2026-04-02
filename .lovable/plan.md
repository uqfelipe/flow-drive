

## Melhorar configuração do nó Copia e Cola

O painel atual só tem um campo "Texto para copiar". Faltam campos para a mensagem exibida acima do botão e para o label do botão — campos que o webhook já suporta (`message`, `label`/`buttonText`).

### Mudança

**Arquivo:** `src/components/flow-builder/NodeConfigPanel.tsx` (linhas 116-122)

Substituir o bloco `copy_paste` por:

```tsx
{nt === "copy_paste" && (
  <>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
      <Textarea className="text-sm min-h-[60px]" placeholder="Texto exibido acima do botão..." value={data.config?.message || ""} onChange={(e) => updateConfig({ message: e.target.value })} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Texto para copiar</Label>
      <Textarea className="text-sm min-h-[80px]" placeholder="Conteúdo que será copiado ao clicar no botão..." value={data.config?.text || ""} onChange={(e) => updateConfig({ text: e.target.value })} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Label do botão</Label>
      <Input className="h-8 text-sm" placeholder="Copiar" value={data.config?.label || ""} onChange={(e) => updateConfig({ label: e.target.value })} />
    </div>
  </>
)}
```

**Também atualizar** `nodeTypes.ts` — adicionar `defaultConfig` completo para `copy_paste`:

```typescript
{ type: "copy_paste", ..., defaultConfig: { text: "", message: "", label: "Copiar" } },
```

### Resultado
- **Mensagem**: texto exibido acima do botão (campo `message`)
- **Texto para copiar**: conteúdo copiado ao clicar (campo `text`)
- **Label do botão**: texto do botão, default "Copiar" (campo `label`)

Todos os 3 campos já são lidos pelo webhook — essa mudança apenas expõe no painel de configuração.

