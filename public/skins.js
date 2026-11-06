(() => {
  const catalogue = {
    sword: [
      { id:'reefsteel', name:'Reefsteel', tier:'Common', level:1, colors:['#57d5cc','#1d7682'], mark:'〰' },
      { id:'harbor-sunrise', name:'Harbor Sunrise', tier:'Uncommon', level:10, colors:['#ffd166','#f06a55'], mark:'☼' },
      { id:'sunken-gold', name:'Sunken Gold', tier:'Rare', level:20, colors:['#ffd166','#a96b2c'], mark:'✦' },
      { id:'tideglass-edge', name:'Tideglass Edge', tier:'Rare', level:35, colors:['#87fff1','#267db5'], mark:'❖' },
      { id:'storm-forged', name:'Stormforged', tier:'Epic', level:60, colors:['#b2c9ff','#5864c5'], mark:'ϟ' },
      { id:'emberwake', name:'Emberwake', tier:'Epic', level:90, colors:['#ffbb63','#a92d3c'], mark:'♨' },
      { id:'starfall-edge', name:'Starfall Edge', tier:'Legendary', level:120, colors:['#f5eeff','#9d69f5'], mark:'✧' },
      { id:'ancient-prism-blade', name:'Ancient Prism', tier:'Mythical', level:250, colors:['#fff4bf','#ff64ce'], mark:'✹' }
    ],
    gun: [
      { id:'harbor-brass', name:'Harbor Brass', tier:'Common', level:1, colors:['#e9b86a','#78502d'], mark:'✣' },
      { id:'seafarer-blue', name:'Seafarer Blue', tier:'Uncommon', level:10, colors:['#6ed8ff','#254b83'], mark:'⚓' },
      { id:'deep-current', name:'Deep Current', tier:'Rare', level:20, colors:['#61e6dc','#126e9a'], mark:'〰' },
      { id:'coral-burst', name:'Coral Burst', tier:'Rare', level:35, colors:['#ff9b83','#b73568'], mark:'✿' },
      { id:'ember-bore', name:'Emberbore', tier:'Epic', level:60, colors:['#ff9b60','#91384d'], mark:'♨' },
      { id:'frostline', name:'Frostline', tier:'Epic', level:90, colors:['#e5ffff','#5a9bd4'], mark:'❄' },
      { id:'nova-engraving', name:'Nova Engraving', tier:'Legendary', level:120, colors:['#fff0a8','#bd5dff'], mark:'✦' },
      { id:'eclipse-bore', name:'Eclipse Bore', tier:'Mythical', level:250, colors:['#ff4f8b','#321b69'], mark:'◉' }
    ],
    haki: [
      { id:'azure-will', name:'Azure Will', tier:'Common', level:1, colors:['#58dcff','#267cff'], mark:'◉' },
      { id:'verdant-guard', name:'Verdant Guard', tier:'Rare', level:20, colors:['#81ffbb','#24a879'], mark:'❋' },
      { id:'crimson-aura', name:'Crimson Aura', tier:'Epic', level:60, colors:['#ff6684','#b41c59'], mark:'◈' },
      { id:'thunder-mantle', name:'Thunder Mantle', tier:'Epic', level:90, colors:['#fff26b','#ed8c39'], mark:'ϟ' },
      { id:'celestial-pulse', name:'Celestial Pulse', tier:'Legendary', level:120, colors:['#fff0a8','#b983ff'], mark:'✺' },
      { id:'abyssal-crown', name:'Abyssal Crown', tier:'Mythical', level:250, colors:['#73fff1','#2843a8'], mark:'♜' }
    ],
    fruit: [
      { id:'sea-glass', name:'Sea Glass', tier:'Common', level:1, colors:['#83fff0','#2188ad'], mark:'❖' },
      { id:'festival-spark', name:'Festival Spark', tier:'Rare', level:20, colors:['#ffdb76','#f25897'], mark:'✷' },
      { id:'moon-orchard', name:'Moon Orchard', tier:'Rare', level:35, colors:['#a4a5ff','#5d4fb3'], mark:'☾' },
      { id:'aurora-bloom', name:'Aurora Bloom', tier:'Epic', level:60, colors:['#7df7d4','#bd7cff'], mark:'✿' },
      { id:'sunflare-citrus', name:'Sunflare Citrus', tier:'Epic', level:90, colors:['#fff07a','#f16e42'], mark:'☀' },
      { id:'ancient-prism', name:'Ancient Prism', tier:'Legendary', level:120, colors:['#fff4bf','#ff64ce'], mark:'✧' },
      { id:'void-orchid', name:'Void Orchid', tier:'Mythical', level:250, colors:['#f67cff','#342071'], mark:'❀' }
    ]
  };
  const categories = { sword:'Swords', gun:'Guns', haki:'Haki', fruit:'Fruits' };
  const palettes = Object.fromEntries(Object.values(catalogue).flat().map(skin => [skin.id, skin.colors[0]]));
  const $ = id => document.getElementById(id);
  let currentCategory = 'sword', selectedId = null, accountKey = '', user = null;
  let data = { owned:[], equipped:{} };
  const load = () => { try { data = JSON.parse(localStorage.getItem(accountKey)) || { owned:[], equipped:{} }; } catch { data = { owned:[], equipped:{} }; } };
  const save = () => localStorage.setItem(accountKey, JSON.stringify(data));

  const style = document.createElement('style');
  style.textContent = `
    #skinLauncher{position:fixed;right:16px;top:76px;z-index:20;border:1px solid #6ccfeb;background:linear-gradient(130deg,#123b50,#20365f);color:#eafaff;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}
    #skinPanel{position:fixed;z-index:21;right:14px;top:124px;width:min(410px,calc(100vw - 24px));max-height:calc(100vh - 138px);overflow:auto;padding:15px;background:rgba(6,19,32,.97);color:#eff9ff;border:1px solid #36728c;border-radius:16px;box-shadow:0 18px 55px #000b;font:13px system-ui,Arial,sans-serif}
    #skinPanel[hidden],#skinLauncher[hidden]{display:none}#skinPanel h2{margin:0 0 4px;font-size:21px}.skin-head{display:flex;justify-content:space-between;align-items:center}.skin-head small{color:#8eabba}.skin-close{background:#20384a;color:#fff;border:1px solid #456176;border-radius:8px;padding:6px 9px;cursor:pointer}
    .skin-tabs{display:flex;gap:6px;margin:12px 0}.skin-tab{flex:1;background:#142b3c;color:#cce0ed;border:1px solid #29475d;border-radius:8px;padding:7px 4px;cursor:pointer}.skin-tab.active{background:#155674;color:white;border-color:#51c6e8}
    .skin-preview{height:114px;border-radius:12px;border:1px solid #3c6175;background:radial-gradient(ellipse at center,#1d4054,#0a1927);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:10px}
    .skin-preview-art{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;font-size:43px;color:white;background:var(--preview);box-shadow:0 0 32px var(--glow);border:2px solid #ffffff55;text-shadow:0 2px 6px #0008}
    .skin-preview-label{position:absolute;bottom:7px;left:0;right:0;text-align:center;color:#cfe5f4;font-size:11px}
    #skinCards{display:flex;flex-direction:column;gap:7px}.skin-card{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;padding:8px;border:1px solid #263f54;border-radius:10px;background:#0b1d2b}.skin-swatch{height:38px;border-radius:9px;background:linear-gradient(135deg,var(--c1),var(--c2));display:grid;place-items:center;font-size:20px;color:#fff;text-shadow:0 2px 5px #000}.skin-copy strong{display:block;font-size:12px}.skin-copy small{color:#96adbe;font-size:10px}.skin-equip{border:0;border-radius:8px;padding:7px 9px;background:linear-gradient(120deg,#66e0ff,#8ca4ff);color:#052033;font-weight:800;cursor:pointer}.skin-equip:disabled{background:#20374a;color:#93a9b8;cursor:default}.skin-feedback{min-height:18px;color:#82edbd;font-size:11px;margin-top:8px}.skin-note{color:#91a9ba;font-size:10px;line-height:1.4;margin:8px 0}
  `;
  document.head.appendChild(style);
  const launcher = document.createElement('button'); launcher.id='skinLauncher'; launcher.textContent='✦ Cosmetic Skins'; launcher.hidden=true;
  const panel = document.createElement('section'); panel.id='skinPanel'; panel.hidden=true;
  panel.innerHTML='<div class="skin-head"><div><h2>Cosmetic Skins</h2><small id="skinAccount"></small></div><button class="skin-close" type="button">Close</button></div><p class="skin-note">Browse original looks for swords, guns, Haki, and fruits. Skins are cosmetic and do not change stats.</p><div class="skin-tabs"></div><div class="skin-preview"><div class="skin-preview-art" id="skinPreview">✦</div><div class="skin-preview-label" id="skinPreviewLabel"></div></div><div id="skinCards"></div><div class="skin-feedback" id="skinFeedback" role="status"></div>';
  document.body.append(launcher,panel);
  const tabRoot=panel.querySelector('.skin-tabs');
  for(const [id,label] of Object.entries(categories)){const button=document.createElement('button');button.type='button';button.className='skin-tab';button.textContent=label;button.dataset.category=id;button.onclick=()=>{currentCategory=id;selectedId=null;render();};tabRoot.append(button);}
  launcher.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)render();};
  panel.querySelector('.skin-close').onclick=()=>panel.hidden=true;
  function unlocked(skin){return skin.level <= (user?.level||1);}
  function applyVisual(skin){
    const root=document.documentElement;
    root.style.setProperty('--skin-accent',skin.colors[0]);
    root.style.setProperty('--skin-secondary',skin.colors[1]);
    root.style.setProperty(`--${currentCategory}-skin-color`,skin.colors[0]);
    panel.style.borderColor=skin.colors[0];
    $('skinPreview').style.setProperty('--preview',`linear-gradient(135deg,${skin.colors[0]},${skin.colors[1]})`);
    $('skinPreview').style.setProperty('--glow',skin.colors[0]+'88');
    window.dispatchEvent(new CustomEvent('ocean:cosmetic-equipped',{detail:{category:currentCategory,skin:{...skin}}}));
  }
  function render(){
    if(!user)return;
    panel.querySelectorAll('.skin-tab').forEach(button=>button.classList.toggle('active',button.dataset.category===currentCategory));
    $('skinAccount').textContent=`${user.username} · Level ${user.level}`;
    const root=$('skinCards');root.replaceChildren();
    const equipped=data.equipped[currentCategory];
    const selected=catalogue[currentCategory].find(skin=>skin.id===(selectedId||equipped))||catalogue[currentCategory][0];
    selectedId=selected.id;$('skinPreview').textContent=selected.mark;$('skinPreviewLabel').textContent=`${selected.name} · ${selected.tier}`;
    $('skinPreview').style.setProperty('--preview',`linear-gradient(135deg,${selected.colors[0]},${selected.colors[1]})`);$('skinPreview').style.setProperty('--glow',selected.colors[0]+'88');
    for(const skin of catalogue[currentCategory]){
      const card=document.createElement('article');card.className='skin-card';
      const swatch=document.createElement('div');swatch.className='skin-swatch';swatch.textContent=skin.mark;swatch.style.setProperty('--c1',skin.colors[0]);swatch.style.setProperty('--c2',skin.colors[1]);
      const copy=document.createElement('div');copy.className='skin-copy';const title=document.createElement('strong');title.textContent=skin.name;const meta=document.createElement('small');meta.textContent=`${skin.tier} · ${unlocked(skin)?'unlocked':'unlocks'} at level ${skin.level}`;copy.append(title,meta);
      const button=document.createElement('button');button.type='button';button.className='skin-equip';const owned=data.owned.includes(skin.id)||unlocked(skin);button.textContent=equipped===skin.id?'Equipped':owned?'Equip':'Locked';button.disabled=!owned||equipped===skin.id;
      button.onclick=()=>{data.owned=[...new Set([...data.owned,skin.id])];data.equipped[currentCategory]=skin.id;selectedId=skin.id;save();applyVisual(skin);$('skinFeedback').textContent=`${skin.name} equipped for ${categories[currentCategory].toLowerCase()}.`;render();};
      card.append(swatch,copy,button);card.addEventListener('click',event=>{if(!event.target.closest('button')){selectedId=skin.id;applyVisual(skin);render();}});root.append(card);
    }
    applyVisual(selected);
  }
  function syncUser(){fetch('/api/me',{credentials:'same-origin'}).then(response=>response.ok?response.json():null).then(result=>{if(!result?.user){launcher.hidden=true;panel.hidden=true;return;}user=result.user;accountKey=`ocean-skins-${user.username.toLowerCase()}`;load();launcher.hidden=false;if(!$('gameUI')||!$('gameUI').hidden)render();}).catch(()=>{});}
  syncUser();
  const game=$('gameUI');if(game)new MutationObserver(()=>{if(!game.hidden&&user)render();}).observe(game,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('keydown',event=>{if(event.key==='Escape')panel.hidden=true;});
  window.OceanCosmeticSkins={catalogue,getEquipped:category=>{const skin=catalogue[category]?.find(item=>item.id===data.equipped[category]);return skin?{...skin}:null;}};
})();
