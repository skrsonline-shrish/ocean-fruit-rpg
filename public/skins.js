(() => {
  const catalogue = {
    sword: [
      { id: 'reefsteel', name: 'Reefsteel', tier: 'Common', level: 1, colors: ['#57d5cc', '#1d7682'], mark: '〰' },
      { id: 'sunken-gold', name: 'Sunken Gold', tier: 'Rare', level: 20, colors: ['#ffd166', '#a96b2c'], mark: '✦' },
      { id: 'storm-forged', name: 'Stormforged', tier: 'Epic', level: 60, colors: ['#b2c9ff', '#5864c5'], mark: 'ϟ' },
      { id: 'starfall-edge', name: 'Starfall Edge', tier: 'Legendary', level: 120, colors: ['#f5eeff', '#9d69f5'], mark: '✧' }
    ],
    gun: [
      { id: 'harbor-brass', name: 'Harbor Brass', tier: 'Common', level: 1, colors: ['#e9b86a', '#78502d'], mark: '✣' },
      { id: 'deep-current', name: 'Deep Current', tier: 'Rare', level: 20, colors: ['#61e6dc', '#126e9a'], mark: '〰' },
      { id: 'ember-bore', name: 'Emberbore', tier: 'Epic', level: 60, colors: ['#ff9b60', '#91384d'], mark: '♨' },
      { id: 'nova-engraving', name: 'Nova Engraving', tier: 'Legendary', level: 120, colors: ['#fff0a8', '#bd5dff'], mark: '✦' }
    ],
    haki: [
      { id: 'azure-will', name: 'Azure Will', tier: 'Common', level: 1, colors: ['#58dcff', '#267cff'], mark: '◉' },
      { id: 'verdant-guard', name: 'Verdant Guard', tier: 'Rare', level: 20, colors: ['#81ffbb', '#24a879'], mark: '❋' },
      { id: 'crimson-aura', name: 'Crimson Aura', tier: 'Epic', level: 60, colors: ['#ff6684', '#b41c59'], mark: '◈' },
      { id: 'celestial-pulse', name: 'Celestial Pulse', tier: 'Legendary', level: 120, colors: ['#fff0a8', '#b983ff'], mark: '✺' }
    ],
    fruit: [
      { id: 'sea-glass', name: 'Sea Glass', tier: 'Common', level: 1, colors: ['#83fff0', '#2188ad'], mark: '❖' },
      { id: 'festival-spark', name: 'Festival Spark', tier: 'Rare', level: 20, colors: ['#ffdb76', '#f25897'], mark: '✷' },
      { id: 'aurora-bloom', name: 'Aurora Bloom', tier: 'Epic', level: 60, colors: ['#7df7d4', '#bd7cff'], mark: '✿' },
      { id: 'ancient-prism', name: 'Ancient Prism', tier: 'Legendary', level: 120, colors: ['#fff4bf', '#ff64ce'], mark: '✧' }
    ]
  };
  const categories = { sword: 'Swords', gun: 'Guns', haki: 'Haki', fruit: 'Fruits' };
  const palettes = {
    reefsteel: '#44cfc5', 'sunken-gold': '#ffd166', 'storm-forged': '#8698ff', 'starfall-edge': '#be87ff',
    'harbor-brass': '#c99756', 'deep-current': '#41d9de', 'ember-bore': '#ff785d', 'nova-engraving': '#ec9cff',
    'azure-will': '#47c9ff', 'verdant-guard': '#62e7a5', 'crimson-aura': '#ff536f', 'celestial-pulse': '#f5cbff',
    'sea-glass': '#50e8da', 'festival-spark': '#ff7fae', 'aurora-bloom': '#9aebbe', 'ancient-prism': '#f5a0ff'
  };
  const $ = id => document.getElementById(id);
  let currentCategory = 'sword', selectedId = null, accountKey = 'ocean-skins-guest', user = null;
  let data = { owned: [], equipped: {} };
  const load = () => { try { data = JSON.parse(localStorage.getItem(accountKey)) || { owned: [], equipped: {} }; } catch { data = { owned: [], equipped: {} }; } };
  const save = () => localStorage.setItem(accountKey, JSON.stringify(data));
  const style = document.createElement('style');
  style.textContent = `
    #skinLauncher{position:fixed;right:18px;top:82px;z-index:20;border:1px solid #6ccfeb;background:linear-gradient(130deg,#123b50,#20365f);color:#eafaff;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer;box-shadow:0 8px 26px #00131d99}
    #skinPanel{position:fixed;z-index:21;right:16px;top:130px;width:min(380px,calc(100vw - 28px));max-height:calc(100vh - 150px);overflow:auto;padding:16px;background:rgba(6,19,32,.96);color:#eff9ff;border:1px solid #36728c;border-radius:16px;box-shadow:0 15px 48px #000b;font:13px system-ui,Arial}
    #skinPanel[hidden]{display:none}#skinPanel h2{margin:0 0 5px;font-size:21px}#skinPanel p{color:#aec6d6;line-height:1.45;margin:5px 0 12px}.skin-head{display:flex;justify-content:space-between;align-items:center}.skin-close,.skin-tab,.skin-equip{border:0;border-radius:8px;padding:8px 10px;cursor:pointer;color:#eaf8ff;background:#18384b}.skin-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:12px 0}.skin-tab.active{background:#176485}.skin-card{display:flex;align-items:center;gap:10px;margin:7px 0;padding:9px;background:#0c2434;border:1px solid #25465b;border-radius:10px}.skin-swatch{flex:0 0 42px;height:42px;border-radius:9px;display:grid;place-items:center;font-size:24px;color:white;text-shadow:0 2px 6px #000;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 0 16px color-mix(in srgb,var(--c1),transparent 55%)}.skin-copy{min-width:0;flex:1}.skin-copy strong{display:block}.skin-copy small{color:#9cb4c7}.skin-equip{white-space:nowrap;background:#176485}.skin-equip:disabled{opacity:.55;cursor:default}.skin-note{font-size:11px;color:#8daabc!important}.skin-preview{height:58px;margin:10px 0;border-radius:10px;display:grid;place-items:center;font-size:32px;background:radial-gradient(circle,var(--preview) 0%,#102537 65%);border:1px solid #31546c}.skin-feedback{min-height:18px;color:#82edbe;font-size:11px}
  `;
  document.head.appendChild(style);
  const launcher = document.createElement('button'); launcher.id = 'skinLauncher'; launcher.textContent = '✦ Cosmetic Skins'; launcher.hidden = true;
  const panel = document.createElement('section'); panel.id = 'skinPanel'; panel.hidden = true; panel.innerHTML = `<div class="skin-head"><div><h2>Cosmetic Skins</h2><small id="skinAccount"></small></div><button class="skin-close" type="button" aria-label="Close skins">✕</button></div><p>Collect and equip original visual styles for swords, guns, Haki auras, and fruits. Skins are cosmetic and do not change stats.</p><div class="skin-tabs" role="tablist"></div><div class="skin-preview" id="skinPreview">✦</div><div id="skinCards"></div><div class="skin-feedback" id="skinFeedback" role="status"></div><p class="skin-note">Progression unlocks are saved in this browser for this account. Server-wide trading and inventory sync are not enabled in this prototype.</p>`;
  document.body.append(launcher, panel);
  const tabRoot = panel.querySelector('.skin-tabs');
  for (const [id, label] of Object.entries(categories)) { const button = document.createElement('button'); button.className = 'skin-tab'; button.textContent = label; button.dataset.category = id; button.onclick = () => { currentCategory = id; render(); }; tabRoot.append(button); }
  launcher.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) render(); };
  panel.querySelector('.skin-close').onclick = () => { panel.hidden = true; };
  function unlocked(skin) { return skin.level <= (user?.level || 1); }
  function render() {
    if (!user) return;
    panel.querySelectorAll('.skin-tab').forEach(button => button.classList.toggle('active', button.dataset.category === currentCategory));
    $('skinAccount').textContent = `${user.username} · Level ${user.level}`;
    const root = $('skinCards'); root.replaceChildren();
    const equipped = data.equipped[currentCategory];
    const selected = catalogue[currentCategory].find(skin => skin.id === (selectedId || equipped)) || catalogue[currentCategory][0];
    selectedId = selected.id;
    $('skinPreview').textContent = selected.mark;
    $('skinPreview').style.setProperty('--preview', `linear-gradient(130deg,${selected.colors[0]},${selected.colors[1]})`);
    for (const skin of catalogue[currentCategory]) {
      const card = document.createElement('article'); card.className = 'skin-card';
      const swatch = document.createElement('div'); swatch.className = 'skin-swatch'; swatch.textContent = skin.mark; swatch.style.setProperty('--c1', skin.colors[0]); swatch.style.setProperty('--c2', skin.colors[1]);
      const copy = document.createElement('div'); copy.className = 'skin-copy';
      const title = document.createElement('strong'); title.textContent = skin.name;
      const meta = document.createElement('small'); meta.textContent = unlocked(skin) ? `${skin.tier} · unlocked at level ${skin.level}` : `${skin.tier} · unlocks at level ${skin.level}`;
      copy.append(title, meta);
      const button = document.createElement('button'); button.className = 'skin-equip';
      const isOwned = data.owned.includes(skin.id) || unlocked(skin);
      button.textContent = equipped === skin.id ? 'Equipped' : isOwned ? 'Equip' : 'Locked';
      button.disabled = !isOwned || equipped === skin.id;
      button.onclick = () => { data.owned = [...new Set([...data.owned, skin.id])]; data.equipped[currentCategory] = skin.id; selectedId = skin.id; save(); applyVisual(skin); $('skinFeedback').textContent = `${skin.name} equipped.`; render(); };
      card.append(swatch, copy, button); card.onclick = event => { if (!event.target.closest('button')) { selectedId = skin.id; render(); } };
      root.append(card);
    }
    applyVisual(selected);
  }
  function applyVisual(skin) {
    const canvas = $('scene');
    if (canvas) {
      if (currentCategory === 'haki') canvas.style.setProperty('--haki-skin-color', palettes[skin.id] || '#71cfff');
      if (currentCategory === 'fruit') canvas.style.setProperty('--fruit-skin-color', palettes[skin.id] || '#71cfff');
    }
    document.documentElement.style.setProperty('--skin-accent', palettes[skin.id] || '#71cfff');
    panel.style.borderColor = palettes[skin.id] || '#36728c';
    $('skinPreview').style.setProperty('--preview', `linear-gradient(130deg,${skin.colors[0]},${skin.colors[1]})`);
  }
  function syncUser() {
    fetch('/api/me', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null).then(result => {
      if (!result?.user) { launcher.hidden = true; panel.hidden = true; return; }
      user = result.user;
      accountKey = `ocean-skins-${user.username.toLowerCase()}`;
      load(); launcher.hidden = false;
      const game = $('gameUI');
      if (game && !game.hidden) render();
    }).catch(() => {});
  }
  syncUser();
  const game = $('gameUI');
  if (game) new MutationObserver(() => { if (!game.hidden && user) render(); }).observe(game, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });
})();
