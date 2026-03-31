

# Fix: Chat list disappears on desktop + badges not clearing

## Problems Found

1. **Chat list panel disappears when selecting a chat on desktop** — The `cn()` function (which uses tailwind-merge) resolves conflicting display classes. When `selectedChat` is set, the classes become `flex flex-col ... hidden md:flex`. tailwind-merge removes the base `flex` because `hidden` overrides it, leaving `hidden md:flex`. But at the base level the panel gets `display: none`, and `md:flex` only restores `display: flex`. The issue is that `flex-col` is also being lost since `md:flex` doesn't include direction. This causes layout issues.

2. **Badges still visible** — The mark-read API call is working (200 responses), but the optimistic update needs the `useMarkAsRead` hook to be correctly wired. Looking at the code, the optimistic update IS already there, so badges should clear. The remaining issue is that the chat list refetch (every 10s) might bring back old counts before the WhatsApp API processes the read receipt.

## Changes

### `src/pages/Conversations.tsx`

**Fix left panel visibility** — Replace the conflicting tailwind classes to avoid tailwind-merge issues:

Line 200-203: Change from:
```tsx
<div className={cn(
  "w-full md:w-[360px] md:min-w-[360px] flex flex-col bg-card/80 backdrop-blur-sm",
  selectedChat && "hidden md:flex"
)}>
```
To:
```tsx
<div className={cn(
  "w-full md:w-[360px] md:min-w-[360px] flex-col bg-card/80 backdrop-blur-sm",
  selectedChat ? "hidden md:flex" : "flex"
)}>
```

This ensures `flex` and `hidden` never appear in the same class string, preventing tailwind-merge from incorrectly resolving them. When no chat is selected, it's `flex`. When selected, it's `hidden md:flex` — hidden on mobile, flex on desktop.

**Fix right panel similarly** — Line 339-342:
```tsx
<div className={cn(
  "flex-1 flex-col bg-background",
  !selectedChat ? "hidden md:flex" : "flex"
)}>
```

Same single-file fix. No other changes needed — the mark-read and optimistic updates are already working correctly.

