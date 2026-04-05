

## Adicionar campo de timeout configurável no nó "Reinício Digitando"

### O que muda
O nó `restart_with_typing` passa a ter **dois campos** de configuração:
1. **Tempo digitando** (segundos) — já existe, controla quanto tempo fica "digitando..."
2. **Tempo de inatividade** (minutos) — **novo**, define após quantos minutos sem resposta o sistema considera a sessão expirada e usa este nó para reiniciar (padrão: 30 min)

### Alterações

#### 1. `src/components/flow-builder/nodeTypes.ts`
- Atualizar `defaultConfig` do `restart_with_typing` para incluir `timeoutMinutes: 30`

#### 2. `src/components/flow-builder/NodeConfigPanel.tsx`
- Separar o `restart_with_typing` do bloco compartilhado com `delay`/`typing_indicator`
- Adicionar campo "Tempo digitando (segundos)" + campo "Tempo de inatividade (minutos)" com input numérico
- Descrição explicativa: "Sessão reinicia após X minutos sem interação"

#### 3. `src/components/flow-builder/FlowNode.tsx`
- Adicionar preview para `restart_with_typing` mostrando ex: "⏱ Inatividade: 120min → Digitando 3s → próximo nó"

#### 4. `supabase/functions/whatsapp-webhook/index.ts`
- Remover o `SESSION_TIMEOUT_MS` hardcoded de 30 min
- Ao encontrar o nó `restart_with_typing` no fluxo, usar `config.timeoutMinutes` (ou 30 como fallback) para calcular o timeout
- A verificação de expiração passa a ser: `now - lastUpdate > (restartNode.config.timeoutMinutes || 30) * 60 * 1000`

### Resultado
O usuário configura no nó "Reinício Digitando" que quer 120 minutos de inatividade. Se o cliente voltar após 2h, o sistema detecta, manda "digitando..." por X segundos, e redireciona pro nó conectado.

