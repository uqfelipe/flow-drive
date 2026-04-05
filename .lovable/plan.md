

## Remover botões "Teste em 10s" e "Processar agora"

### Alterações em `src/pages/Reminders.tsx`

1. **Remover os dois botões** (linhas 362-376):
   - Botão "Teste em 10s" + badge de countdown
   - Botão "Processar agora"

2. **Remover código morto** associado:
   - Estado `testCountdown`, `testReminderId`, `countdownRef` (linhas 78-81)
   - Função `handleQuickTest` (linhas 262-304)
   - Função `processTestReminder` (linhas 245-260)
   - Função `handleProcessNow` (buscar e remover)
   - Cleanup do countdown `useEffect` (linhas 239-243)

3. **Limpar imports** não mais usados:
   - `FlaskConical`, `Play` do lucide-react
   - `useCallback` do React (se não usado em outro lugar)

