# Team Pulse verification checklist

Run against an isolated test tournament before merging PR #91. All commentary must be derived from completed scores, not entry timestamps.

| Scenario | Expected |
|---|---|
| Singles, Green wins holes 1–3 | Green three-hole streak |
| Best Ball, one score missing on each side | No result until both sides have a valid scoring ball |
| Scramble, Green wins three contiguous completed holes | Green three-hole streak |
| Match tied on a hole | Breaks any winning streak |
| Hole 2 incomplete, holes 1 and 3 won | No three-hole streak |
| Purple leads by 3, Green recovers to all square | Green comeback |
| Green leads by 3, then by 5 | No comeback |
| Green leads by 3, Purple cuts to 1 | Purple comeback |
| Match changes from Purple leading to Green leading | Lead-change highlight |
| Correct a score that previously caused a streak | Streak recalculates or disappears |
| Correct a score that previously caused a comeback | Comeback recalculates or disappears |
| Nine-hole round, final three holes competitive | Close-finish highlight |
| Total Stroke Play session | No match-play hole streak; session-level points remain distinct |
| Completed match | No ongoing close-finish alert |
| Two phones updating different matches | Both updates appear after refresh; no stale local override |
| Mobile 375px viewport | Scoreboard and match tracker remain readable |

## Release gates

- Run `npm ci && npm run build` (TypeScript + Vite).
- Exercise the scenarios above in a test tournament, including score corrections.
- Verify locked points and projected points against the existing leaderboard.
- Verify the live panel on an iPhone-sized viewport.
- Review PR #91, then merge and verify the production deployment.

**Status:** Checklist added; these cases are not yet confirmed passing.
