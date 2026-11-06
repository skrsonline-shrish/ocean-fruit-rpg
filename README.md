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
- **Old Kai — Haki Training**, Tempest Port, level 101, 75,000 berries. Haki surrounds your avatar with a willpower aura; mastery extends its duration.
- **The Wayfinder — Blink Training**, Starfall Docks, level 601, 500,000 berries. Teleport moves you a short distance in your last travel direction.

Learn each skill at its teacher, then use it to gain mastery. Each three uses advances one rank (up to rank 10), improving dash/teleport range, Haki duration/power, and cooldowns. Skills consume energy; normal players have server-enforced cooldowns. Admin accounts bypass skill energy and cooldown costs. Hotkeys: 1 Dodge, 2 Haki, 3 Teleport.

## Cosmetic skins
Open **Cosmetic Skins** after signing in. The showcase includes original visual designs across four categories: sword finishes (Reefsteel, Sunken Gold, Stormforged, Starfall Edge, and others), gun finishes (Harbor Brass, Deep Current, Emberbore, Nova Engraving, and others), Haki auras, and fruit appearances. Skins have rarity-style tiers and level unlock requirements. Select a skin to preview it, then choose **Equip**. Choices are saved per username in that browser's local storage; they are cosmetic only and do not alter stats. The interface broadcasts an `ocean:cosmetic-equipped` browser event and exposes `window.OceanCosmeticSkins.getEquipped(category)` for connecting equipped colors to future in-world weapon/effect renderers.

This is a prototype. Cosmetic ownership/equipment is currently browser-local, so it does not sync across devices. Use HTTPS, persistent database storage, backups, and a long random `SESSION_SECRET` before deployment. The first account created gets admin privileges, so control initial registration.
