# Ocean Fruit RPG

Original 3D browser-game prototype with account login and a trainer/mastery progression system.

## Run locally
Requires Node.js 20+.

```sh
npm install
npm start
```
Open http://localhost:3000. Create an account with a 3–20 character username and a unique password of at least 10 characters. The first account in a fresh database is admin. WASD moves your character.

## Technique teachers and mastery
- **Mira Quickstep — Dodge Training**, Coral Harbor, level 1, 2,500 berries. Activating dodge moves you in your last travel direction and briefly makes your avatar translucent.
- **Old Kai — Haki Training**, Tempest Port, level 101, 75,000 berries. Haki surrounds your avatar with an aura; mastery extends the effect and increases its designed damage multiplier for a future combat system.
- **The Wayfinder — Blink Training**, Starfall Docks, level 601, 500,000 berries. Teleport moves you a short distance in your last travel direction.

Learn each skill at its teacher, then use it to gain mastery. Each three uses advances one rank (up to rank 10), improving dash/teleport range, Haki duration/power, and cooldowns. Skills consume energy; normal players have server-enforced cooldowns. Admin accounts bypass skill energy and cooldown costs. Hotkeys: 1 Dodge, 2 Haki, 3 Teleport.

## Cosmetic skins
Open **Cosmetic Skins** while signed in. Browse original cosmetic designs for swords, guns, Haki effects, and fruits. Skins unlock by level (levels 1, 20, 60, and 120), and equipped choices are stored in browser local storage per username. These are cosmetic-only; the current prototype previews palettes and symbols, and does not yet have fully modeled sword/gun/fruit assets or cross-device server synchronization.

This is a prototype: visual dodge is not integrated into a full damage/hitbox system, and Haki's damage multiplier is a design stat until combat is added. Use HTTPS, persistent database storage, backups, and a long random `SESSION_SECRET` before deployment. The first account created gets admin privileges, so control initial registration.
