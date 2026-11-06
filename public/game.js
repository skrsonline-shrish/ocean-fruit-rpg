(() => {
  const races = {
    Human: { color: 0x67c8ff, css: '#67c8ff', versions: ['Human I','Human II','Human III'], traits: ['Steady','Adaptable','Focused'], description: 'A balanced voyager. Your focus burst briefly boosts movement and recovery.' },
    Shark: { color: 0x45e0dc, css: '#45e0dc', versions: ['Shark I','Shark II','Shark III'], traits: ['Tideborn','Current Runner','Abyssal'], description: 'Tideborn explorers leave a water wake and surge forward with a current dash.' },
    Rabbit: { color: 0xd8a7ff, css: '#d8a7ff', versions: ['Rabbit I','Rabbit II','Rabbit III'], traits: ['Fleetfoot','Springstep','Moonbound'], description: 'Fleet-footed wanderers make a quick, buoyant leap and leave a sparkling trail.' },
    Cyborg: { color: 0xffb866, css: '#ffb866', versions: ['Cyborg I','Cyborg II','Cyborg III'], traits: ['Copper Core','Overdrive','Star Engine'], description: 'A mechanical adventurer releases a bright energy pulse and enters a brief overdrive.' }
  };
  const $ = id => document.getElementById(id);
  const auth = $('auth'), gameUI = $('gameUI'), form = $('authForm');
  let isSignup = false, user = null, skillUntil = 0;
  const msg = (text, good=false) => { $('authMessage').textContent = text; $('authMessage').style.color = good ? '#80efc1' : '#ff9eae'; };
  async function api(url, options={}) {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  $('toggleAuth').addEventListener('click', () => {
    isSignup = !isSignup;
    $('submitAuth').textContent = isSignup ? 'Create account' : 'Sign in';
    $('toggleAuth').textContent = isSignup ? 'I already have an account' : 'Create account';
    form.elements.password.autocomplete = isSignup ? 'new-password' : 'current-password';
    msg(isSignup ? 'New accounts are assigned a random race once.' : '');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('submitAuth'); button.disabled = true; msg('');
    try {
      const result = await api(isSignup ? '/api/signup' : '/api/login', { method: 'POST', body: JSON.stringify({ username: form.elements.username.value, password: form.elements.password.value }) });
      user = result.user; showGame();
    } catch (error) { msg(error.message); }
    finally { button.disabled = false; }
  });
  function showGame() {
    auth.hidden = true; gameUI.hidden = false; updateUI(); setRaceMaterial();
  }
  function updateUI() {
    const race = races[user.race];
    $('playerName').textContent = user.username; $('raceBadge').textContent = user.race;
    $('level').textContent = user.level; $('xp').textContent = user.xp; $('raceName').textContent = user.race;
    $('raceName').style.color = race.css; $('raceDescription').textContent = race.description;
    $('raceVersion').textContent = user.raceVersion; $('raceHint').textContent = `Trait: ${race.traits[user.raceVersionIndex]}. New versions unlock at levels 10 and 30.`;
    $('versionTrack').replaceChildren(...race.versions.map((name, i) => { const el = document.createElement('span'); el.textContent = name; if (i <= user.raceVersionIndex) el.className = 'active'; return el; }));
    setRaceMaterial();
  }
  $('logout').addEventListener('click', async () => { await api('/api/logout', {method:'POST'}).catch(()=>{}); location.reload(); });
  $('train').addEventListener('click', async () => {
    try { const result = await api('/api/train', {method:'POST'}); user = result.user; updateUI(); $('status').textContent = `Training complete. ${user.raceVersion} is active.`; }
    catch(e) { $('status').textContent = e.message; }
  });
  $('raceSkill').addEventListener('click', useRaceSkill);
  window.addEventListener('keydown', e => { if (e.code === 'Space' && user && !e.repeat) { e.preventDefault(); useRaceSkill(); } });
  function useRaceSkill() {
    if (!user) return;
    if (performance.now() < skillUntil) { $('status').textContent = 'Race effect is recharging.'; return; }
    skillUntil = performance.now() + 5000;
    const effect = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: races[user.race].color, transparent: true, opacity: .62, wireframe: user.race === 'Cyborg' }));
    effect.position.copy(player.position); effect.position.y += .8; scene.add(effect);
    const start = performance.now();
    const animateEffect = now => { const t = (now-start)/650; effect.scale.setScalar(1+t*5); effect.material.opacity = Math.max(0,.62*(1-t)); if (t < 1) requestAnimationFrame(animateEffect); else {scene.remove(effect);effect.geometry.dispose();effect.material.dispose();} };
    requestAnimationFrame(animateEffect);
    const version = user.raceVersionIndex;
    if (user.race === 'Shark') { playerSpeed = 15 + version; $('status').textContent = `${user.raceVersion}: current dash!`; setTimeout(()=>playerSpeed=7,1000); }
    else if (user.race === 'Rabbit') { player.position.y += 1.8 + version*.3; $('status').textContent = `${user.raceVersion}: spring leap!`; setTimeout(()=>player.position.y=1,700); }
    else if (user.race === 'Cyborg') { $('status').textContent = `${user.raceVersion}: overdrive pulse!`; playerSpeed=12+version; setTimeout(()=>playerSpeed=7,1200); }
    else { $('status').textContent = `${user.raceVersion}: focus burst!`; playerSpeed=10+version; setTimeout(()=>playerSpeed=7,1100); }
  }

  let scene, camera, renderer, player, playerMaterial, playerSpeed=7;
  const keys = {};
  function setRaceMaterial() { if (playerMaterial && user) { playerMaterial.color.setHex(races[user.race].color); playerMaterial.emissive.setHex(races[user.race].color); playerMaterial.emissiveIntensity = .16 + user.raceVersionIndex*.13; } }
  function init3D() {
    if (!window.THREE) { $('status').textContent='3D library did not load. Check connection and refresh.'; return; }
    const canvas=$('scene'); renderer=new THREE.WebGLRenderer({canvas,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    scene=new THREE.Scene(); scene.background=new THREE.Color(0x071c2a); scene.fog=new THREE.Fog(0x071c2a,35,110);
    camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,250);
    scene.add(new THREE.HemisphereLight(0xa6e3ff,0x143040,1.3)); const sun=new THREE.DirectionalLight(0xffe6bd,1.7);sun.position.set(12,20,8);scene.add(sun);
    const water=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:0x0b526a,roughness:.48,metalness:.18}));water.rotation.x=-Math.PI/2;water.position.y=-.12;scene.add(water);
    for(let i=0;i<20;i++){const x=(Math.random()-.5)*95,z=(Math.random()-.5)*95,r=2+Math.random()*3;const island=new THREE.Mesh(new THREE.CylinderGeometry(r*.76,r,1.3,18),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.28+Math.random()*.15,.46,.32),roughness:1}));island.position.set(x,.55,z);scene.add(island);const hill=new THREE.Mesh(new THREE.ConeGeometry(.85+Math.random(),2.4+Math.random()*2,8),new THREE.MeshStandardMaterial({color:0x397d59}));hill.position.set(x,.9+hill.geometry.parameters.height/2,z);scene.add(hill);}
    playerMaterial=new THREE.MeshStandardMaterial({color:0x67c8ff,emissive:0x67c8ff,emissiveIntensity:.2,roughness:.35});player=new THREE.Mesh(new THREE.CapsuleGeometry(.55,.95,4,10),playerMaterial);player.position.set(0,1,0);scene.add(player);
    window.addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
    const resize=()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};window.addEventListener('resize',resize);resize();
    const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.04);if(player){const x=(keys.d?1:0)-(keys.a?1:0),z=(keys.s?1:0)-(keys.w?1:0),len=Math.hypot(x,z)||1;player.position.x+=x/len*playerSpeed*dt;player.position.z+=z/len*playerSpeed*dt;camera.position.lerp(new THREE.Vector3(player.position.x,player.position.y+7,player.position.z+10),.08);camera.lookAt(player.position.x,player.position.y,player.position.z);}renderer.render(scene,camera);}frame();
  }
  init3D();
  api('/api/me').then(result=>{user=result.user;showGame();}).catch(()=>{});
})();
