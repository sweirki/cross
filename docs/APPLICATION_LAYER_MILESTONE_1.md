# Application Layer — Milestone 1

## Included

- Dynamic home dashboard
- Campaign browser
- Sequential lesson unlocking
- Lesson detail screen
- Resume last puzzle
- Practice mode
- Deterministic daily challenge
- Academy navigation
- Profile and progress statistics
- Persistent player progress with AsyncStorage
- Shared play screen for lessons, practice, and daily challenges
- Progress recording on puzzle completion
- Single-source-of-truth tile selection through the game runtime

## Commands

```bash
npm run application:m1:build
npm run application:m1:test
npm run milestone1:test
npx expo start --clear
```

## Routes

- `/`
- `/campaign`
- `/lesson/[lessonId]`
- `/play`
- `/academy`
- `/profile`
- `/studio`
