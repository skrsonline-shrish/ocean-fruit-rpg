# Ocean Fruit RPG

Original 3D browser-game prototype with account login, saved random races, fruit drowning rules, chat, owner fruit tools, and island shops for swords, guns, fruit stock, and randomized gacha.

## Run locally
Requires Node.js 20+.

```sh
npm install
npm start
```
Open http://localhost:3000. Signup assigns a race and 10,000 starter berries. The first account in an empty database is admin. Train to unlock versions at levels 10, 30, and 60; max level is 5,000.

## Shops and economy
Choose an unlocked island in the Island Shops panel. Islands have different sword, gun, and fruit selections. Stock is server-side, shared between players, decremented on purchase, and replenishes every 24 hours. Rarer fruits have higher prices and lower stock. Purchased fruit enters inventory; select it to equip/eat it. Weapon purchases equip the item and add it to inventory.

Fruit gacha is available at each island. Price scales with level and reaches exactly 50,000,000 berries at level 5,000 (formula: max(250, round(50,000,000 × (level / 5,000)^2))). The server chooses a randomized fruit using rarity-weighted odds. Gacha and shop purchases are validated and charged server-side.

## Deployment and security notes
This is a prototype, not a production-ready multiplayer service. Deploy behind HTTPS with `NODE_ENV=production` and a long random `SESSION_SECRET`; use persistent storage and backups for the SQLite database. The first account created receives admin privileges, so control registration/bootstrap carefully before opening the service publicly. Auth, chat, and shop routes are rate limited. Chat moderation/reporting and production-scale infrastructure are not included.
