# Get a Crush Before College

*An anime movie you play.* Opening title sequence, character introduction
cards, visual-novel close-ups with expressions, episode title cards for each
day, speed lines, film grain, and end credits — all drawn in code.

An anime school game in the browser. Five days until graduation, and the squad
made a pact: **everyone gets a crush before college** — or treats the whole
squad to bakso.

## How it plays

1. **Pick who you are:** Ghanim, Ghiffy, Lindan, Arkan, Dyas, Zubair, Ahza,
   Aboi, Qai, Hamzah or Nizam. The other ten are around school.
2. **Walk around school:** the classroom, hallway, library, canteen, courtyard
   and rooftop.
3. **Talk to your friends** for advice. That's free, and each of them has a tip
   about one of the crushes.
4. **Talk to the seven classmates** who might become your crush — Hana (transfer
   student from Japan, classroom window seat), Putri (drama club star, hallway),
   Alya (class president, library), Rania (canteen chef), Kirana (track ace,
   courtyard), Nayla (astronomy club, rooftop telescope) and Sekar (quiet
   artist, rooftop). Each has three scenes with a choice; good
   answers fill her hearts. Every scene uses up your lunch break or your
   afternoon, so you only get 10 over the week.
5. **Friday afternoon:** your top crush waits under the cherry tree. Confess.
   Enough hearts and you get the anime ending; otherwise it's the Bakso End.
6. **Everyone has their own ending.** Whoever you play gets a personal
   confession move and their own lines in the ending — Ghanim the coder shows
   her a website whose NO button runs away, Ghiffy the gamer asks for a Player 2,
   Lindan the meteorologist gives a forecast, Dyas the footballer juggles a ball
   for her, and so on. The pact results show how each of the others did.

Controls: `←` `→` (or `A` `D`) to walk, `E` / `Space` / `Enter` to talk and
continue, `1`–`3` to answer. On phones, use the on-screen buttons and tap the
dialogue box.

## Run it

A static site with no build step.

- **Locally:** `npx serve .` (or any static server), then open the address it prints.
- **Vercel:** import this repository in Vercel and deploy. No settings needed.

## Files

- `index.html`, `style.css`: the page, character select, dialogue box, HUD and touch controls
- `js/main.js`: the cast, the school, the scenes, the days and the endings
- `js/portrait.js`: the anime close-up portraits and their expressions
- `js/ending.js`: the hill-at-sunset ending with the title card and fireworks
- `js/audio.js`: chimes and dialogue blips (and a built-in song as a fallback)
- `js/fx.js`: hearts, rings and shooting stars
- `prettyjohn1-calm-537656.mp3`: the soundtrack, "Calm" by prettyjohn1

To change what a friend says, or their hair and clothes, edit the `FRIENDS`
list at the top of `js/main.js`.
