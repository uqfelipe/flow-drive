

## Fix Import/Export/Format Flow — Core Race Condition

### Problem
There are two issues:

1. **Import is overwritten**: `handleImport` sets `currentFlowId(null)` to decouple from the saved flow. But the useEffect at line 126 immediately re-assigns `currentFlowId` to the first flow in the list. Then the useEffect at line 169 resets `dbLoaded = false`. Then the useEffect at line 132 reloads the old flow from DB, overwriting the imported nodes.

2. **Format uses `window.confirm`**: The browser sandbox may block `window.confirm`, causing the format to silently fail. Should use a React-based confirmation dialog instead.

### Changes: `src/pages/FlowBuilder.tsx`

1. **Add a `skipAutoSelect` ref** to prevent the auto-select useEffect from overriding imported/formatted state:
   ```typescript
   const skipAutoSelectRef = useRef(false);
   ```

2. **Guard the auto-select useEffect** (line 126):
   ```typescript
   useEffect(() => {
     if (flows && flows.length > 0 && !currentFlowId && !skipAutoSelectRef.current) {
       setCurrentFlowId(flows[0].id);
     }
   }, [flows, currentFlowId]);
   ```

3. **In `handleImport`**: Set `skipAutoSelectRef.current = true` before setting `currentFlowId(null)`. This prevents the auto-select from firing.

4. **In `handleFormat`**: Also set `skipAutoSelectRef.current = true` and set `currentFlowId(null)` so save creates a new flow instead of overwriting the old one.

5. **Replace `window.confirm` with AlertDialog** (shadcn) for the format confirmation — add state `showFormatConfirm` and render a dialog. This ensures it works in all browsers/sandboxes.

6. **In `handleSave` onSuccess**: Reset `skipAutoSelectRef.current = false` after a new flow is created, so auto-select works normally again.

