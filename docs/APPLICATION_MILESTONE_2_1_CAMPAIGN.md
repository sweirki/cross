# Application Layer — Milestone 2.1: Campaign Experience

## Included

- Deterministic campaign presentation model
- Chapter cards with progress, stars, and state
- Lesson nodes with locked, available, in-progress, and completed states
- Connected visual lesson path
- Animated overall and chapter progress bars
- Campaign and chapter completion percentages
- Resume target derived from persistent application progress
- Campaign completion celebration state
- Accessible labels, disabled states, hints, and progress values
- Pure TypeScript campaign-runtime tests

## Commands

```bash
npm run campaign:m21:build
npm run campaign:m21:test
npm run milestone2.1:test
npx expo start --clear
```

## Manual checks

1. Open Campaign from Home.
2. Verify only the first unfinished lesson is available.
3. Start a lesson, return to Campaign, and verify the Resume card.
4. Complete a lesson and verify its check mark, stars, progress, and next unlock.
5. Complete a chapter and verify the next chapter becomes active.
6. Confirm TalkBack or VoiceOver announces lesson status and progress.
