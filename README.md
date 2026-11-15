# Dyas ♥ Naswa · Sunset Errand

A little anime adventure in the browser. You are **Dyas**. Naswa texted:
*"Meet me on the hill before the sun goes down."* Walk through town, talk to
the people on the way, pick up gifts, and find Naswa on the hill. The sun sets
as you walk, and the ending changes with what you bring her.

## Play

- **Keyboard:** `←` `→` (or `A` `D`) to walk, `E` / `Space` / `Enter` to talk and continue, `1`–`3` to pick an answer.
- **Phone:** the on-screen arrows and the talk button, or tap the dialogue box.

Gifts to find: pink tulips, two strawberry milks and Naswa's lost red ribbon.

## Run it

It's a static site with no build step.

- **Locally:** `npx serve .` (or any static server), then open the address it prints.
- **Vercel:** import this repository in Vercel and deploy. No settings needed.

## Files

- `index.html`, `style.css`: the page, dialogue box, HUD and touch controls
- `js/main.js`: the town, characters, movement, conversations and quest
- `js/ending.js`: the hill-at-sunset ending with the title card and fireworks
- `js/audio.js`: chimes and dialogue blips (and a built-in song as a fallback)
- `js/fx.js`: hearts, rings and shooting stars
- `prettyjohn1-calm-537656.mp3`: the soundtrack, "Calm" by prettyjohn1
