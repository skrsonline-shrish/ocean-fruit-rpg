# Ocean Fruit RPG

Original 3D browser-game prototype with account login, saved random races, fruit drowning, island shops, randomized gacha, shared chat, and owner tools.

## Run locally
Requires Node.js 20+.

```sh
npm install
npm start
```
Open http://localhost:3000. Signup grants 10,000 starter berries. The first account in a fresh database is admin. Train to unlock race versions at levels 10, 30, and 60; max level is 5,000.

## Shops and accessories
Select an unlocked island in the Island Shops panel to see its swords, guns, accessories, and limited fruit stock. Rare fruit has lower stock and higher prices. Purchases, balances, stock, and equipment are validated and saved server-side. Accessory examples include Current Pendant (+20 max energy, 5% cooldown reduction), Tideglass Charm (+35, 10%), Stormrunner Boots (+25, 15%), Starwake Circlet (+60, 20%), and Ancient Core (+100, 30%). Purchase an accessory at a shop, then select it in the accessory dropdown to equip it. Energy regenerates over time; fruit skills spend energy and have a server-enforced cooldown reduced by your accessory. At level 5,000, the gacha roll costs 50,000,000 berries.

The admin's fruit skills have no cooldown and consume no energy. Admin status is checked on the server, not trusted from the browser.

## Deployment and safety
This is a prototype, not a production-ready multiplayer service. Deploy behind HTTPS with `NODE_ENV=production` and a long random `SESSION_SECRET`; use persistent storage and backups for SQLite. The first account created gets admin privileges, so control registration/bootstrap carefully before opening publicly. Authentication, chat and shop operations are rate-limited. Chat moderation/reporting and production-scale infrastructure are not included. Passwords are bcrypt-hashed; sessions use HTTP-only SameSite cookies.
