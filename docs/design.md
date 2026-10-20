# Design references

No generic "admin template" look. QuizArena is a **game show on a projector** and a
**controller in the student's hand**. References for the coding agent:

| Screen | Reference | What to take |
|---|---|---|
| Host lobby | Kahoot lobby, Jackbox Games "room code" screen | Huge PIN (≥ 72 px, monospace), join URL + QR on the right, player names popping in as chips |
| Question (host) | Kahoot question screen, "Who Wants to Be a Millionaire" | Question in a white card at the top, countdown ring, answer counter, 4 coloured tiles in a 2×2 grid |
| Phone controller | Kahoot mobile, Nintendo Switch Joy-Con colours | Only the 4 coloured shapes fill the screen — no text needed, thumb-sized |
| Reveal | Kahoot bar chart | Bars per option, correct one keeps its colour, wrong ones fade to 35 % |
| Leaderboard / podium | Duolingo leagues, Olympic podium | Top 5 with score deltas; podium with 2-1-3 blocks, bold |
| Teacher dashboard | Linear, Notion | Calm neutral UI for building quizzes (the game screens are loud, the editor is quiet) |

## Tokens
- Background game: deep indigo gradient `#1e1b4b → #4c1d95`; editor: `#f6f7fb`
- Answer colours + shapes (colour-blind safe because of the shapes):
  ▲ red `#e21b3c` · ◆ blue `#1368ce` · ● yellow `#d89e00` · ■ green `#26890c`
- Accent `#7c3aed`, success `#16a34a`, danger `#dc2626`
- Font: system UI; numbers `font-variant-numeric: tabular-nums`; PIN in monospace
- Radius 14 px cards, 10 px buttons; spacing scale 4/8/12/16/24/32
- Motion: 150 ms ease-out for presses; no animation on the phone except the press state

## Rules
- Host screens are designed for 1280 × 720 projectors; phone screens for 360 × 740
- Every player-facing text ≥ 18 px; answer tiles ≥ 88 px tall
- Never rely on colour alone: every answer has its shape glyph
- Anything loaded from the internet (QR image) needs an offline fallback (#10)
