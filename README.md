# Get a Crush Before College

*An anime movie you play.* Opening title sequence, character introduction
cards, visual-novel close-ups with expressions, episode title cards for each
day, speed lines, film grain, and end credits — all drawn in code.

An anime school game in the browser. Five days until graduation, and the squad
made a pact: **everyone gets a crush before college** — or treats the whole
squad to bakso.

## How it plays

1. **Pick who you are:** Ghanim, Ghiffy, Lindan, Arkan, Dyas, Zubair, Ahza,
   Aboi, Qai, Hamzah or Nizam. The other ten are around school and town.
2. **Seven days until college.** Each day lasts **nine real minutes**, from
   07:00 to 21:00, with the sky going from morning to sunset to night. Use the
   ⏩ button to skip an hour.
3. **School until 15:00:** the classroom, hallway, library, canteen, courtyard
   and rooftop. **After school everyone heads into town:** the Kopi Senja café,
   the Game Center, the bookstore, the riverside park and the Grand Bintang
   Hotel.
4. **Talk to anyone, anytime.** Seven classmates might become your crush —
   Ana, Putri, Alya, Rania, Kirana, Nayla and Sekar — and each one goes
   somewhere different after school. A ♥ over a girl means she has a new
   moment for you today (three each), with choices that fill her hearts.
   Friends give advice about them.
5. **Sunday night is prom** at the Grand Bintang Hotel. Your top crush waits on
   the balcony. Confess: enough hearts and you get the anime ending; otherwise
   it's the Bakso End.
6. **Everyone has their own ending.** Whoever you play gets a personal
   confession move and their own lines in the ending, and the pact results
   show how each of the others did.

Controls: `←` `→` (or `A` `D`) to walk, hold `Shift` to run, `E` / `Space` / `Enter` to talk and
continue, `1`–`3` to answer. On phones, use the on-screen buttons and tap the
dialogue box.

## Run it

A static site with no build step.

- **Locally:** `npx serve .` (or any static server), then open the address it prints.
- **Vercel:** import this repository in Vercel and deploy. No settings needed.

## Files

- `index.html`, `style.css`: the page, character select, dialogue box, HUD and touch controls
- `js/main.js`: the cast, the school, the scenes, the days and the endings
- `art/`: the illustrated character portraits (made in Dreamina, backgrounds removed)
- `art/sprite/`: the walking chibi sprites for all 18 characters (Dreamina, backgrounds removed)
- `art/ending/`: one illustrated ending scene per girl (Dreamina), also used in the opening trailer
- `art/trailer.mp4`: the Dreamina-animated trailer clip that opens the game
- `js/portrait.js`: the anime close-up portraits and their expressions
- `js/ending.js`: the hill-at-sunset ending with the title card and fireworks
- `js/audio.js`: chimes and dialogue blips (and a built-in song as a fallback)
- `js/fx.js`: hearts, rings and shooting stars
- `prettyjohn1-calm-537656.mp3`: the soundtrack, "Calm" by prettyjohn1

To change what a friend says, or their hair and clothes, edit the `FRIENDS`
list at the top of `js/main.js`.
