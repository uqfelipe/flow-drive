

## Mostrar apenas "Imagens dos Campos" na aba Arquivos

### Problema
A aba "Arquivos" mostra duas seções: "Imagens dos Campos" (custom fields) e "Arquivos Recebidos" (customer_files table), causando duplicação de imagens.

### Solução
Remover a seção "Arquivos Recebidos" (linhas 478-563) da aba Arquivos, mantendo apenas a seção "Imagens dos Campos" (linhas 455-476).

### Alteração
**`src/pages/CustomerEdit.tsx`** — linhas 432-567:
- Remover todo o bloco que renderiza `customerFiles` (linhas 478-563)
- Ajustar a lógica `hasFiles` para depender apenas de `customFieldImages.length > 0`
- Manter a seção "Imagens dos Campos" intacta

