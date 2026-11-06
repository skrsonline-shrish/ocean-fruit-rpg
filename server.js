const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const production = process.env.NODE_ENV === 'production';
const databasePath = process.env.DB_FILE || path.join(__dirname, 'game.sqlite');
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL, race TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
function addColumnIfMissing(table, column, declaration) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
}
addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'fruit_inventory', "TEXT NOT NULL DEFAULT '[]'");
addColumnIfMissing('users', 'fruit_name', 'TEXT');
addColumnIfMissing('users', 'health', 'REAL NOT NULL DEFAULT 100');
addColumnIfMissing('users', 'berries', 'INTEGER NOT NULL DEFAULT 10000');
addColumnIfMissing('users', 'item_inventory', "TEXT NOT NULL DEFAULT '[]'");
addColumnIfMissing('users', 'equipped_sword', 'TEXT');
addColumnIfMissing('users', 'equipped_gun', 'TEXT');
db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,username TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS shop_stock (island_id TEXT NOT NULL,item_id TEXT NOT NULL,quantity INTEGER NOT NULL,restock_at INTEGER NOT NULL,PRIMARY KEY(island_id,item_id));`);

const races = {
  Human: { color: '#67c8ff', versions: ['Human I','Human II','Human III','Human IV'], traits: ['Steady','Adaptable','Focused','Ascendant'], description: 'Balanced movement and a brief focus burst.' },
  Shark: { color: '#45e0dc', versions: ['Shark I','Shark II','Shark III','Shark IV'], traits: ['Tideborn','Current Runner','Abyssal','Ocean Sovereign'], description: 'Shark III is immune to sea damage and swims slowly; Shark IV is immune and swims at 3× speed.' },
  Rabbit: { color: '#d8a7ff', versions: ['Rabbit I','Rabbit II','Rabbit III','Rabbit IV'], traits: ['Fleetfoot','Springstep','Moonbound','Starbound'], description: 'Quick movement and a springing leap.' },
  Cyborg: { color: '#ffb866', versions: ['Cyborg I','Cyborg II','Cyborg III','Cyborg IV'], traits: ['Copper Core','Overdrive','Star Engine','Nova Engine'], description: 'Mechanical glow and an overdrive pulse.' }
};
const raceNames = Object.keys(races);
const chooseRace = () => raceNames[crypto.randomInt(raceNames.length)];
const rarityRank = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythical: 5, 'Ancient Mythic': 6 };
const rarityStock = { Common: 12, Uncommon: 8, Rare: 5, Epic: 3, Legendary: 2, Mythical: 1, 'Ancient Mythic': 1 };
const rarityPrice = { Common: 2500, Uncommon: 12000, Rare: 60000, Epic: 250000, Legendary: 1000000, Mythical: 5000000, 'Ancient Mythic': 25000000 };
const fruitGroups = {
  Common: ['Pebble','Gust','Sprout','Spark','Puddle','Shell','Moth','Bramble','Cinder','Ripple','Dew','Kite','Thorn','Moss','Drift','Sail','Flint','Pollen','Mist','Crab','Soot','Reed','Tumble','Breeze','Acorn','Ink','Clove','Frost','Wisp','Silt','Lantern','Vine','Marble','Tide','Feather','Whistle','Dune','Berry','Tallow','Coral'],
  Uncommon: ['Moonpetal','Ironwood','Cloudstep','Glasswing','Foxfire','Rainsong','Coppercoil','Snowcap','Sunshade','Quickroot','Stormbell','Honeycomb','Nightjar','Blueflame','Seaglass','Wildmint','Starling','CaveBloom','Saltstone','Sundial','Firefly','Windchime','Frostfern','Mimic','Brightscale'],
  Rare: ['Tempest','Moonfin','Prism','Blackwater','Silvervein','Crown','Hollow','Vapor','Nautilus','Scorpion','Galecrest','Jadeheart','Echo','Razorleaf','Comet'],
  Epic: ['Stormglass','Solaris','Abyss','Basilisk','Volta','Radiant','Magma','Onyx','Warden','Horizon'],
  Legendary: ['Starfall','Emberglass','Dreadwake','Aurora','Voidtide','Worldtree'],
  Mythical: ['Phoenix Bloom','Leviathan Core','Eclipse Crown','Celestial Forge']
};
const fruits = Object.entries(fruitGroups).flatMap(([rarity,names]) => names.map(name => ({ id:`fruit:${name}`, name, type:'fruit', rarity, price:rarityPrice[rarity], requiredLevel:0, stock:rarityStock[rarity] })));
for (const name of ['Sea Serpent','Disguise','Angel','Demon']) fruits.push({ id:`fruit:${name}`, name, type:'fruit', rarity:'Ancient Mythic', price:rarityPrice['Ancient Mythic'], requiredLevel:60, stock:1 });
const weapons = [
  { id:'sword:Harbor Cutlass',name:'Harbor Cutlass',type:'sword',rarity:'Common',price:1200,requiredLevel:1,stock:20 },
  { id:'gun:Deckhand Flintlock',name:'Deckhand Flintlock',type:'gun',rarity:'Common',price:1500,requiredLevel:1,stock:20 },
  { id:'sword:Reefsplitter',name:'Reefsplitter',type:'sword',rarity:'Uncommon',price:22000,requiredLevel:25,stock:10 },
  { id:'gun:Tidecaller Repeater',name:'Tidecaller Repeater',type:'gun',rarity:'Uncommon',price:28000,requiredLevel:25,stock:10 },
  { id:'sword:Tempest Saber',name:'Tempest Saber',type:'sword',rarity:'Rare',price:180000,requiredLevel:101,stock:7 },
  { id:'gun:Stormline Rifle',name:'Stormline Rifle',type:'gun',rarity:'Rare',price:220000,requiredLevel:101,stock:7 },
  { id:'sword:Emberbrand',name:'Emberbrand',type:'sword',rarity:'Epic',price:1200000,requiredLevel:301,stock:4 },
  { id:'gun:Cinderlock Cannon',name:'Cinderlock Cannon',type:'gun',rarity:'Epic',price:1500000,requiredLevel:301,stock:4 },
  { id:'sword:Starforged Edge',name:'Starforged Edge',type:'sword',rarity:'Legendary',price:8000000,requiredLevel:601,stock:2 },
  { id:'gun:Nova Handcannon',name:'Nova Handcannon',type:'gun',rarity:'Legendary',price:9500000,requiredLevel:601,stock:2 },
  { id:'sword:Voidwake',name:'Voidwake',type:'sword',rarity:'Mythical',price:30000000,requiredLevel:1200,stock:1 },
  { id:'gun:Celestial Longarm',name:'Celestial Longarm',type:'gun',rarity:'Mythical',price:35000000,requiredLevel:1200,stock:1 }
];
const islands = [
  { id:'coral-harbor',name:'Coral Harbor',sea:'Coral Reach',requiredLevel:1, fruits:['Pebble','Gust','Sprout','Spark','Puddle','Shell','Bramble','Ripple','Moonpetal','Ironwood'], weapons:['sword:Harbor Cutlass','gun:Deckhand Flintlock'] },
  { id:'driftwood-cove',name:'Driftwood Cove',sea:'Coral Reach',requiredLevel:25, fruits:['Dew','Kite','Mist','Coral','Cloudstep','Foxfire','Rainsong','Coppercoil','Frostfern','Mimic'], weapons:['sword:Reefsplitter','gun:Tidecaller Repeater'] },
  { id:'tempest-port',name:'Tempest Port',sea:'Tempest Expanse',requiredLevel:101, fruits:['Tempest','Moonfin','Prism','Blackwater','Silvervein','Crown','Hollow','Vapor','Nautilus','Scorpion','Stormglass'], weapons:['sword:Tempest Saber','gun:Stormline Rifle'] },
  { id:'gale-isle',name:'Gale Isle',sea:'Tempest Expanse',requiredLevel:200, fruits:['Galecrest','Jadeheart','Echo','Razorleaf','Comet','Solaris','Abyss','Basilisk','Volta'], weapons:['sword:Tempest Saber','gun:Stormline Rifle'] },
  { id:'ember-bastion',name:'Ember Bastion',sea:'Emberdeep',requiredLevel:301, fruits:['Radiant','Magma','Onyx','Warden','Horizon','Starfall','Emberglass','Dreadwake','Aurora'], weapons:['sword:Emberbrand','gun:Cinderlock Cannon'] },
  { id:'ashen-garden',name:'Ashen Garden',sea:'Emberdeep',requiredLevel:450, fruits:['Voidtide','Worldtree','Phoenix Bloom','Leviathan Core'], weapons:['sword:Emberbrand','gun:Cinderlock Cannon'] },
  { id:'starfall-docks',name:'Starfall Docks',sea:'Starfall Ocean',requiredLevel:601, fruits:['Eclipse Crown','Celestial Forge','Sea Serpent','Disguise','Angel','Demon'], weapons:['sword:Starforged Edge','gun:Nova Handcannon'] },
  { id:'void-citadel',name:'Void Citadel',sea:'Starfall Ocean',requiredLevel:1200, fruits:['Sea Serpent','Disguise','Angel','Demon','Phoenix Bloom','Leviathan Core','Eclipse Crown','Celestial Forge'], weapons:['sword:Voidwake','gun:Celestial Longarm'] }
];
const catalog = new Map([...fruits,...weapons].map(item=>[item.id,item]));
const authLimiter = rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many sign-in attempts. Please wait and try again.'}});
const chatLimiter = rateLimit({windowMs:60*1000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Chat is sending messages too quickly.'}});
const shopLimiter = rateLimit({windowMs:60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please slow down and try again.'}});
if (production && !process.env.SESSION_SECRET) throw new Error('Set SESSION_SECRET to a long, random secret in production.');
if (production) app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'",'https://cdn.jsdelivr.net'],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:production?[]:null}}}));
app.use(express.json({limit:'10kb'}));
app.use(session({store:new SQLiteStoreFactory({db:'sessions.sqlite',dir:path.dirname(databasePath)}),secret:process.env.SESSION_SECRET||'development-only-change-before-deploy-'+crypto.randomBytes(24).toString('hex'),resave:false,saveUninitialized:false,name:'ocean.sid',cookie:{httpOnly:true,sameSite:'lax',secure:production,maxAge:7*24*60*60*1000}}));
app.use(express.static(path.join(__dirname,'public')));
function versionIndex(level){return level>=60?3:level>=30?2:level>=10?1:0;}
function parseArray(value){try{return JSON.parse(value||'[]')}catch{return[]}}
function safeUser(row){const index=versionIndex(row.level);return{username:row.username,level:row.level,xp:row.xp,race:row.race,raceVersion:races[row.race].versions[index],raceVersionIndex:index,raceInfo:races[row.race],isAdmin:Boolean(row.is_admin),fruitInventory:parseArray(row.fruit_inventory),fruitName:row.fruit_name||null,health:Math.max(0,Math.min(100,row.health)),berries:row.berries,itemInventory:parseArray(row.item_inventory),equippedSword:row.equipped_sword||null,equippedGun:row.equipped_gun||null};}
function getUser(req){return req.session.userId?db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId):null;}
function requireAuth(req,res,next){if(!getUser(req))return res.status(401).json({error:'Please sign in first.'});next();}
function requireAdmin(req,res,next){const user=getUser(req);if(!user)return res.status(401).json({error:'Please sign in first.'});if(!user.is_admin)return res.status(403).json({error:'Admin access required.'});next();}
function validCredentials(body){const username=typeof body.username==='string'?body.username.trim():'';const password=typeof body.password==='string'?body.password:'';if(!/^[A-Za-z0-9_]{3,20}$/.test(username))return{error:'Username must be 3–20 letters, numbers, or underscores.'};if(password.length<10||password.length>72)return{error:'Password must be 10–72 characters.'};return{username,password};}
function startSession(req,res,userId,status=200){req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Could not start your session.'});req.session.userId=userId;req.session.save(saveError=>{if(saveError)return res.status(500).json({error:'Could not save your session.'});res.status(status).json({user:safeUser(getUser(req))});});});}
app.post('/api/signup',authLimiter,async(req,res)=>{const input=validCredentials(req.body||{});if(input.error)return res.status(400).json({error:input.error});const hash=await bcrypt.hash(input.password,12);try{const insert=db.transaction(()=>{const first=db.prepare('SELECT COUNT(*) AS count FROM users').get().count===0;return db.prepare('INSERT INTO users(username,password_hash,race,is_admin) VALUES(?,?,?,?)').run(input.username,hash,chooseRace(),first?1:0);});startSession(req,res,Number(insert().lastInsertRowid),201);}catch(e){if(String(e.code).includes('SQLITE_CONSTRAINT'))return res.status(409).json({error:'That username is already taken.'});res.status(500).json({error:'Could not create account.'});}});
app.post('/api/login',authLimiter,async(req,res)=>{const input=validCredentials(req.body||{});if(input.error)return res.status(400).json({error:input.error});const row=db.prepare('SELECT * FROM users WHERE username=?').get(input.username);if(!row||!(await bcrypt.compare(input.password,row.password_hash)))return res.status(401).json({error:'Incorrect username or password.'});startSession(req,res,row.id);});
app.get('/api/me',(req,res)=>{const row=getUser(req);if(!row)return res.status(401).json({error:'Please sign in.'});res.json({user:safeUser(row)});});
app.post('/api/train',requireAuth,(req,res)=>{const now=Date.now();if(req.session.lastTrain&&now-req.session.lastTrain<5000)return res.status(429).json({error:'Take a short breather before training again.'});req.session.lastTrain=now;const row=getUser(req);let xp=row.xp+10,level=row.level;while(xp>=level*25&&level<5000){xp-=level*25;level++;}db.prepare('UPDATE users SET level=?,xp=? WHERE id=?').run(level,xp,row.id);res.json({user:safeUser(getUser(req))});});
app.post('/api/admin/spawn',requireAuth,requireAdmin,(req,res)=>{const fruitName=typeof req.body?.fruitName==='string'?req.body.fruitName.trim():'';if(!/^[\p{L}\p{N}][\p{L}\p{N} '’-]{0,39}$/u.test(fruitName))return res.status(400).json({error:'Enter a valid fruit name (up to 40 characters).'});const user=getUser(req),inventory=parseArray(user.fruit_inventory);if(!inventory.includes(fruitName))inventory.push(fruitName);db.prepare('UPDATE users SET fruit_inventory=?,fruit_name=? WHERE id=?').run(JSON.stringify(inventory),fruitName,user.id);res.json({user:safeUser(getUser(req)),message:`${fruitName} added and equipped.`});});
app.post('/api/fruit/eat',requireAuth,(req,res)=>{const fruitName=typeof req.body?.fruitName==='string'?req.body.fruitName:'',user=getUser(req),inventory=parseArray(user.fruit_inventory);if(!inventory.includes(fruitName))return res.status(404).json({error:'You do not own that fruit.'});db.prepare('UPDATE users SET fruit_name=?,health=100 WHERE id=?').run(fruitName,user.id);res.json({user:safeUser(getUser(req)),message:`${fruitName} equipped. Beware of the sea!`});});
app.post('/api/world/tick',requireAuth,(req,res)=>{const user=getUser(req),inWater=req.body?.inWater===true,elapsed=Math.max(0,Math.min(2,Number(req.body?.seconds)||1)),sharkSafe=user.race==='Shark'&&versionIndex(user.level)>=2;let health=user.health;if(inWater&&user.fruit_name&&!sharkSafe)health=Math.max(0,health-12*elapsed);else health=Math.min(100,health+4*elapsed);db.prepare('UPDATE users SET health=? WHERE id=?').run(health,user.id);const swimmingSpeedMultiplier=user.race==='Shark'&&versionIndex(user.level)>=3?3:user.race==='Shark'&&versionIndex(user.level)>=2?.65:1;res.json({health,drowning:inWater&&Boolean(user.fruit_name)&&!sharkSafe&&health>0,sharkSafe,swimmingSpeedMultiplier,knockedOut:health<=0});});
function gachaPrice(level){return Math.max(250,Math.round(50000000*(Math.min(5000,Math.max(1,level))/5000)**2));}
function pickFruit(){const weights={Common:100,Uncommon:55,Rare:25,Epic:10,Legendary:4,Mythical:1.5,'Ancient Mythic':.35};const options=fruits.filter(f=>f.requiredLevel<=5000);const total=options.reduce((n,f)=>n+weights[f.rarity],0);let r=Math.random()*total;for(const fruit of options){r-=weights[fruit.rarity];if(r<=0)return fruit;}return options[0];}
app.post('/api/gacha/roll',requireAuth,shopLimiter,(req,res)=>{const user=getUser(req),price=gachaPrice(user.level);if(user.berries<price)return res.status(400).json({error:`You need ${price.toLocaleString()} berries to roll.`});const fruit=pickFruit();const inventory=parseArray(user.fruit_inventory);if(!inventory.includes(fruit.name))inventory.push(fruit.name);db.prepare('UPDATE users SET berries=berries-?,fruit_inventory=?,fruit_name=? WHERE id=?').run(price,JSON.stringify(inventory),fruit.name,user.id);res.json({user:safeUser(getUser(req)),fruit:{name:fruit.name,rarity:fruit.rarity},price});});
function islandProducts(island){const items=island.weapons.map(id=>catalog.get(id)).filter(Boolean);for(const name of island.fruits){const fruit=catalog.get(`fruit:${name}`);if(fruit)items.push({...fruit,requiredLevel:Math.max(fruit.requiredLevel,island.requiredLevel)});}return items;}
function currentStock(island,item){const now=Date.now(),restockAt=now+24*60*60*1000;let row=db.prepare('SELECT quantity,restock_at FROM shop_stock WHERE island_id=? AND item_id=?').get(island.id,item.id);if(!row||row.restock_at<=now){db.prepare('INSERT INTO shop_stock(island_id,item_id,quantity,restock_at) VALUES(?,?,?,?) ON CONFLICT(island_id,item_id) DO UPDATE SET quantity=excluded.quantity,restock_at=excluded.restock_at').run(island.id,item.id,item.stock,restockAt);return{quantity:item.stock,restockAt};}return{quantity:row.quantity,restockAt:row.restock_at};}
app.get('/api/shops',requireAuth,(req,res)=>{const user=getUser(req),island=islands.find(item=>item.id===req.query.island);if(!island)return res.status(404).json({error:'Island shop not found.'});if(user.level<island.requiredLevel)return res.status(403).json({error:`Requires level ${island.requiredLevel}.`});const products=islandProducts(island).filter(item=>user.level>=item.requiredLevel).map(item=>({...item,...currentStock(island,item),owned:parseArray(user.item_inventory).includes(item.id)||parseArray(user.fruit_inventory).includes(item.name)}));res.json({island:{id:island.id,name:island.name,sea:island.sea,requiredLevel:island.requiredLevel},berries:user.berries,gachaPrice:gachaPrice(user.level),products});});
app.post('/api/shops/buy',requireAuth,shopLimiter,(req,res)=>{const user=getUser(req),island=islands.find(item=>item.id===req.body?.island),item=catalog.get(req.body?.itemId);if(!island||!item||!islandProducts(island).some(product=>product.id===item.id))return res.status(404).json({error:'That item is not sold at this island.'});if(user.level<Math.max(island.requiredLevel,item.requiredLevel))return res.status(403).json({error:`Requires level ${Math.max(island.requiredLevel,item.requiredLevel)}.`});const ownedItems=parseArray(user.item_inventory),ownedFruit=parseArray(user.fruit_inventory);if((item.type==='fruit'&&ownedFruit.includes(item.name))||(item.type!=='fruit'&&ownedItems.includes(item.id)))return res.status(409).json({error:'You already own this item.'});const transaction=db.transaction(()=>{const current=getUser(req);if(current.berries<item.price)throw new Error('NOT_ENOUGH');const stock=currentStock(island,item);if(stock.quantity<1)throw new Error('OUT_OF_STOCK');const updated=db.prepare('UPDATE shop_stock SET quantity=quantity-1 WHERE island_id=? AND item_id=? AND quantity>0').run(island.id,item.id);if(!updated.changes)throw new Error('OUT_OF_STOCK');if(item.type==='fruit'){ownedFruit.push(item.name);db.prepare('UPDATE users SET berries=berries-?,fruit_inventory=? WHERE id=?').run(item.price,JSON.stringify(ownedFruit),current.id);}else{ownedItems.push(item.id);const column=item.type==='sword'?'equipped_sword':'equipped_gun';db.prepare(`UPDATE users SET berries=berries-?,item_inventory=?,${column}=? WHERE id=?`).run(item.price,JSON.stringify(ownedItems),item.name,current.id);}});try{transaction();res.json({user:safeUser(getUser(req)),message:`Purchased ${item.name}.`});}catch(e){if(e.message==='NOT_ENOUGH')return res.status(400).json({error:'Not enough berries.'});if(e.message==='OUT_OF_STOCK')return res.status(409).json({error:'Sold out. Check again after restock.'});throw e;}});
app.get('/api/chat',requireAuth,(req,res)=>{const after=Math.max(0,Number.parseInt(req.query.after,10)||0);const messages=db.prepare('SELECT id,username,message,created_at AS createdAt FROM chat_messages WHERE id>? ORDER BY id DESC LIMIT 50').all(after).reverse();res.json({messages});});
app.post('/api/chat',requireAuth,chatLimiter,(req,res)=>{const message=typeof req.body?.message==='string'?req.body.message.trim().replace(/[\u0000-\u001f\u007f]/g,''):'';if(!message||message.length>180)return res.status(400).json({error:'Chat messages must be 1–180 characters.'});const user=getUser(req),result=db.prepare('INSERT INTO chat_messages(user_id,username,message) VALUES(?,?,?)').run(user.id,user.username,message);res.status(201).json({message:db.prepare('SELECT id,username,message,created_at AS createdAt FROM chat_messages WHERE id=?').get(result.lastInsertRowid)});});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>{res.clearCookie('ocean.sid',{httpOnly:true,sameSite:'lax',secure:production});res.json({ok:true});}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Ocean Fruit RPG running on http://localhost:${PORT}`));
