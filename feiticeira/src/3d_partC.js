
// ---------- merge static geometry (thousands of meshes -> one draw call per material) ----------
const VEG = new Set();
function mergeStatic(){
  scene.updateMatrixWorld(true);
  const groups = new Map(), kill = [];
  scene.traverse(o=>{ if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return; const m=o.material; if (Array.isArray(m) || m.isShaderMaterial) return;
    const key=m.uuid+'|'+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'|'+o.renderOrder; let g=groups.get(key); if (!g){ g={m,cast:o.castShadow,rec:o.receiveShadow,ro:o.renderOrder,list:[]}; groups.set(key,g); } g.list.push(o); kill.push(o); });
  const v=new T.Vector3(), nm=new T.Matrix3();
  for (const g of groups.values()){
    const parts=[]; let n=0; for (const o of g.list){ let geo=o.geometry; if (geo.index) geo=geo.toNonIndexed(); parts.push([geo,o.matrixWorld,o.matrixWorld.determinant()<0]); n+=geo.attributes.position.count; }
    const P=new Float32Array(n*3), N=new Float32Array(n*3), U=new Float32Array(n*2); let off=0;
    for (const [geo,mw,flip] of parts){ const p=geo.attributes.position, nr=geo.attributes.normal, uv=geo.attributes.uv; nm.getNormalMatrix(mw);
      for (let i=0;i<p.count;i++){ const j = flip ? (i%3===1 ? i+1 : i%3===2 ? i-1 : i) : i, k=off+i;
        v.fromBufferAttribute(p,j).applyMatrix4(mw); P[k*3]=v.x; P[k*3+1]=v.y; P[k*3+2]=v.z;
        if (nr){ v.fromBufferAttribute(nr,j).applyMatrix3(nm).normalize(); N[k*3]=v.x; N[k*3+1]=v.y; N[k*3+2]=v.z; } else N[k*3+1]=1;
        if (uv){ U[k*2]=uv.getX(j); U[k*2+1]=uv.getY(j); } }
      off+=p.count; }
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(P,3)); geo.setAttribute('normal',new T.BufferAttribute(N,3)); geo.setAttribute('uv',new T.BufferAttribute(U,2)); geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,g.m); mesh.castShadow=g.cast; mesh.receiveShadow=g.rec; mesh.renderOrder=g.ro; mesh.matrixAutoUpdate=false; scene.add(mesh); }
  for (const o of kill){ if (o.parent) o.parent.remove(o); }
  // empty groups left behind
  const empty=[]; scene.traverse(o=>{ if (o.isGroup && !o.children.length) empty.push(o); }); for (const o of empty) if (o.parent) o.parent.remove(o);
}

// ---------- lights ----------
const hemi = new T.HemisphereLight(0xffffff, 0x445522, .6); scene.add(hemi);
const amb = new T.AmbientLight(0xffffff, .08); scene.add(amb);
const sun = new T.DirectionalLight(0xffffff, 2); sun.castShadow = true; const smap = isTouch ? 2048 : Math.min(4096, renderer.capabilities.maxTextureSize); sun.shadow.mapSize.set(smap, smap);
const sc = sun.shadow.camera; sc.left=-27; sc.right=27; sc.top=27; sc.bottom=-27; sc.near=1; sc.far=220; sun.shadow.bias=-.0004; sun.shadow.normalBias=.03; sun.shadow.radius=3; scene.add(sun); scene.add(sun.target);
const plights = [];
function plight(x,y,z,color,int,dist){ const l=new T.PointLight(lin(color), int, dist, 2); l.position.set(x,y,z); scene.add(l); plights.push({l, base:int}); return l; }
plight(5,1.75,-3.3,'#ffb06a',2.8,7.5);
plight(3,1.95,3,'#ffb06a',3,8.5);
plight(0,-.15,-2,'#ffbf3d',1.8,5);
plight(0,1.3,.1,'#ff9a40',1.3,4.5);
plight(-5.5,2.3,-2.8,'#ffcf96',1.9,8.5);
plight(-5.8,1.6,6.9,'#ffc487',1.6,4.2);
plight(-5.8,1.6,13.1,'#ffc487',1.6,4.2);
plight(1.1,1.6,9.95,'#ffc487',1.4,3.8);
plight(0,2.3,12.6,'#ffd6a0',1.4,3.8);
plight(-.3,2.4,7.3,'#fff0d8',1.4,3.8);

// ---------- sky: gradient, sun and soft procedural clouds in one shader ----------
const skyU = { top:{value:new T.Color()}, bot:{value:new T.Color()}, sunDir:{value:new T.Vector3(0,1,0)}, sunCol:{value:new T.Color()}, uTime:{value:0}, uNight:{value:0} };
const sky = new T.Mesh(new T.SphereGeometry(500,48,24), new T.ShaderMaterial({ uniforms:skyU, side:T.BackSide, depthWrite:false, depthTest:false, fog:false,
  vertexShader:'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader:[
    'uniform vec3 top; uniform vec3 bot; uniform vec3 sunCol; uniform vec3 sunDir; uniform float uTime; uniform float uNight; varying vec3 vP;',
    'float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),u.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),u.x), u.y); }',
    'float fbm(vec2 p){ float a=0.5, s=0.0; for (int i=0;i<5;i++){ s+=a*n2(p); p=p*2.02+vec2(17.1,9.2); a*=0.5; } return s; }',
    'void main(){ vec3 d=normalize(vP); float h=clamp(d.y,0.0,1.0); vec3 c=mix(bot, top, pow(h,0.5));',
    '  float s=max(dot(d,sunDir),0.0); c += sunCol*(smoothstep(0.9993,0.9997,s)*2.2 + pow(s,14.0)*0.22 + pow(s,3.0)*0.05);',
    '  if (d.y>0.0){ vec2 uv=d.xz/(d.y+0.10)*1.15 + vec2(uTime*0.004, uTime*0.0015);',
    '    float n=fbm(uv); float cov=smoothstep(0.50,0.80,n); float dens=cov*smoothstep(0.0,0.22,d.y);',
    '    float sh=fbm(uv*1.6+sunDir.xz*0.12+3.0); vec3 lit=mix(vec3(1.0),sunCol,0.30); vec3 cl=lit*(1.06-0.42*smoothstep(0.35,0.85,sh));',
    '    cl=mix(cl,bot,0.22); cl*=mix(1.0,0.14,uNight); cl+=sunCol*pow(s,5.0)*0.45*cov;',
    '    c=mix(c,cl,dens*0.9); }',
    '  else c=bot*0.85;',
    '  gl_FragColor=vec4(c,1.0); }'].join('\n') }));
sky.renderOrder = -1; sky.userData.keep = true; scene.add(sky);
const starG = new T.BufferGeometry(); const spts=[]; for (let i=0;i<900;i++){ const u=rnd()*Math.PI*2, v=Math.acos(rnd()*.95); spts.push(Math.sin(v)*Math.cos(u)*450, Math.cos(v)*450, Math.sin(v)*Math.sin(u)*450); } starG.setAttribute('position', new T.Float32BufferAttribute(spts,3));
const starM = new T.PointsMaterial({color:0xffffff, size:1.6, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false}); const stars=new T.Points(starG, starM); scene.add(stars);
scene.fog = new T.Fog(0xffffff, 45, 300);
// environment map rendered from the sky (reflections on the glossy floor, glass and metal)
const pmrem = new T.PMREMGenerator(renderer); const envScene = new T.Scene();
const envSkyG = new T.SphereGeometry(10,24,12); envSkyG.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(envSkyG.attributes.position.count*3),3));
envScene.add(new T.Mesh(envSkyG, new T.MeshBasicMaterial({vertexColors:true, side:T.BackSide})));
const envSun = new T.Mesh(new T.SphereGeometry(.6,12,8), new T.MeshBasicMaterial({color:0xffffff})); envScene.add(envSun);
const envGround = new T.Mesh(new T.CircleGeometry(9.5,32), new T.MeshBasicMaterial({color:0x2f4a22})); envGround.rotation.x=-Math.PI/2; envGround.position.y=-.6; envScene.add(envGround);
let envRT=null, envTimer=0, envLast=-1;
function updateEnv(){ const old=envRT; const P=envSkyG.attributes.position, Cc=envSkyG.attributes.color, tl=cur.top.clone().convertSRGBToLinear(), bl=cur.bot.clone().convertSRGBToLinear(), tmp=new T.Color();
  for (let i=0;i<P.count;i++){ const h=Math.max(0,P.getY(i)/10); tmp.copy(bl).lerp(tl,Math.pow(h,.55)); if (P.getY(i)<0) tmp.copy(bl).multiplyScalar(.5); Cc.setXYZ(i,tmp.r,tmp.g,tmp.b); } Cc.needsUpdate=true;
  envSun.position.copy(cur.sun).multiplyScalar(9); envSun.material.color.copy(cur.sunC).convertSRGBToLinear().multiplyScalar(4*Math.min(1,cur.sunI)); envGround.material.color.copy(cur.hG).multiplyScalar(.6); envRT=pmrem.fromScene(envScene,.03); scene.environment=envRT.texture; if (old) old.dispose(); }

const PRESETS = [
  {sun:[.78,.32,.32], sunC:'#ffd3a0', sunI:1.8, hS:'#c4dbf7', hG:'#5b6a3c', hI:.5, top:'#6fa6e6', bot:'#ffe2c4', fog:'#eedcc8', exp:1.02, star:0},
  {sun:[.35,.86,.28], sunC:'#fff3df', sunI:2.2, hS:'#d4e7ff', hG:'#5e7040', hI:.62, top:'#2f7fdc', bot:'#d4e9ff', fog:'#d6e6f2', exp:1.02, star:0},
  {sun:[-.86,.11,.42], sunC:'#ff8435', sunI:1.75, hS:'#ffb084', hG:'#3c2f20', hI:.36, top:'#33427c', bot:'#ff9a5c', fog:'#d98f6c', exp:1.06, star:.12},
  {sun:[-.3,.8,-.5], sunC:'#8aa0d8', sunI:.16, hS:'#23315a', hG:'#090b10', hI:.13, top:'#03060f', bot:'#121b33', fog:'#0b1222', exp:1.18, star:1}
];
function presetState(p){ return { sun:new T.Vector3(...p.sun).normalize(), sunC:new T.Color(p.sunC), sunI:p.sunI, hS:new T.Color(p.hS), hG:new T.Color(p.hG), hI:p.hI, top:new T.Color(p.top), bot:new T.Color(p.bot), fog:new T.Color(p.fog), exp:p.exp, star:p.star }; }
const targets = PRESETS.map(presetState);
let cur = presetState(PRESETS[1]), target = targets[1];
function lerpState(a){ const t=target; cur.sun.lerp(t.sun,a).normalize(); cur.sunC.lerp(t.sunC,a); cur.hS.lerp(t.hS,a); cur.hG.lerp(t.hG,a); cur.top.lerp(t.top,a); cur.bot.lerp(t.bot,a); cur.fog.lerp(t.fog,a);
  cur.sunI+=(t.sunI-cur.sunI)*a; cur.hI+=(t.hI-cur.hI)*a; cur.exp+=(t.exp-cur.exp)*a; cur.star+=(t.star-cur.star)*a; }
let lightsOn = true, lightF = 1;
function applyState(){ sun.position.copy(cur.sun).multiplyScalar(90); sun.color.copy(cur.sunC).convertSRGBToLinear(); sun.intensity=cur.sunI;
  hemi.color.copy(cur.hS).convertSRGBToLinear(); hemi.groundColor.copy(cur.hG).convertSRGBToLinear(); hemi.intensity=cur.hI;
  const night = Math.max(0, Math.min(1, 1-cur.sunI/1.4));
  skyU.top.value.copy(cur.top); skyU.bot.value.copy(cur.bot); skyU.sunDir.value.copy(cur.sun); skyU.sunCol.value.copy(cur.sunC); skyU.uNight.value=night;
  scene.fog.color.copy(cur.fog).convertSRGBToLinear(); renderer.toneMappingExposure=cur.exp; starM.opacity=cur.star;
  for (const h of halos) h.sm.opacity = lightF*h.k*(.22+.78*night)*.85; }
function applyLights(t){ for (const p of plights) p.l.intensity = p.base*lightF; for (const g of glowMats){ let k=g.base*lightF; if (g.m===mat.fire) k*=(.8+.25*Math.sin(t*13)+.15*Math.sin(t*29)); g.m.emissiveIntensity=k; } }

// ---------- dollhouse cut (a clipping plane that lifts the roof off) ----------
const cutPlane = new T.Plane(new T.Vector3(0,-1,0), 1e4); let cutCur=1e4, cutGoal=1e4;
function setupClipping(){ for (const m of [mat.foliage,mat.trunk,mat.palmTrunk,mat.frond,mat.bigleaf,mat.mountainV,mat.blades,mat.grass,mat.paver,mat.fence,mat.flower].concat(mat.leaf)) VEG.add(m); const seen=new Set(); scene.traverse(o=>{ if (!o.isMesh || !o.material || o===sky) return; const m=o.material; if (seen.has(m) || VEG.has(m)) return; seen.add(m); m.clippingPlanes=[cutPlane]; if (m.side===T.FrontSide && !m.transparent) m.side=T.DoubleSide; m.needsUpdate=true; }); }

// ---------- player / camera ----------
const pos = new T.Vector3(13,0,.5); let yaw=Math.PI/2, pitch=-.05, eyeY=1.6, bobT=0;
function floorAt(x,z){ if (x>=-8&&x<=-2.5&&z>=-6&&z<=.5) return .45; if ((x>-2.5&&x<=-2.15&&z>=-6&&z<=.85)||(x>=-5&&x<=-2.15&&z>.5&&z<=.85)) return .22;
  if (x>=-1.5&&x<=1.5&&z>=-3.5&&z<=-.5) return (z>-.8&&Math.abs(x)<.5) ? -.22 : -.45; return 0; }
function blocked(x,z,feet){ const r=.26; for (const c of colliders){ if (c.y1 < feet+.36 || c.y0 > feet+1.75) continue; if (x+r>c.x0 && x-r<c.x1 && z+r>c.z0 && z-r<c.z1) return true; } return false; }
const zones=[['Quarto 1',-8,-3.6,6,10],['Quarto 2',-8,-3.6,10,14],['Corredor dos quartos',-3.6,-2.4,6,14],['Banheiro',-2.4,2,6,8.6],['Espaço de trabalho',-2.4,2,8.6,11.3],['Quarto 3',-2.4,2,11.3,14],
  ['Sala de TV',-8,-2.15,-6,.85],['Lareira e rede',-2.15,2.5,-6,1.2],['Mesa de jantar',2.5,8,-6,.5],['Cozinha',-2.2,8,1.2,6],['Varanda gourmet',-8,8,-6,6]];
function zoneAt(x,z){ for (const [n,a,b,c,d] of zones) if (x>=a&&x<b&&z>=c&&z<d) return n; if (x>8&&x<18&&Math.abs(z)<9) return 'Pátio'; if (x>18&&x<25&&Math.abs(z)<3) return 'Chegada'; return 'Jardim'; }
const spots=[['Entrada',13,.5,Math.PI/2,-.05],['Sala de TV',-3.2,-1.5,.84,-.12],['Lareira e rede',3.2,-2,Math.PI/2,-.22],['Mesa de jantar',2.8,-1.2,-.885,-.15],['Cozinha',0,1.9,-1.92,-.15],
  ['Quarto 1',-4.2,9.4,.64,-.2],['Quarto 2',-4.2,10.7,2.48,-.2],['Espaço de trabalho',-1.9,9.6,-1.69,-.2],['Quarto 3',-1.9,11.9,-2.43,-.2],['Banheiro',-1.9,7.7,-1.35,-.15],['Jardim',15,7,.98,0]];
function baseFov(){ const a=innerWidth/innerHeight; return Math.max(62, Math.min(84, 2*Math.atan(Math.tan(24*Math.PI/180)/a)*180/Math.PI)); }
function onResize(){ camera.aspect=innerWidth/innerHeight; camera.fov=baseFov(); camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); }
addEventListener('resize',onResize); onResize();

const qTmp=new T.Quaternion(), eTmp=new T.Euler(0,0,0,'YXZ'), oTmp=new T.Object3D();
function walkQuat(y,p){ eTmp.set(p,y,0,'YXZ'); return new T.Quaternion().setFromEuler(eTmp); }
let camAnim=null;
function animateCam(p1,q1,dur,onEnd){ camAnim={p0:camera.position.clone(),q0:camera.quaternion.clone(),p1:p1.clone(),q1:q1.clone(),t:0,dur:dur||1.2,onEnd}; }
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const fadeEl=$('fade');
function fadeTo(fn){ fadeEl.classList.add('on'); setTimeout(()=>{ fn(); setTimeout(()=>fadeEl.classList.remove('on'),60); },460); }
function placeAt(x,z,y,p){ pos.set(x,0,z); yaw=y; pitch=p; eyeY=floorAt(x,z)+1.6; walkTarget=null; }

// ---------- modes ----------
let mode='walk', started=false, paused=false;
const ui={ bar:$('bar'), mini:$('mini'), modes:$('modes'), tour:$('tourCard'), doll:$('dollCard'), photo:$('photoBtn'), menu:$('menu'), hint:$('hint') };
function setModeButtons(){ ui.modes.querySelectorAll('button').forEach(b=>b.classList.toggle('lens', b.dataset.mode===mode)); }
function setMode(m, opts){ opts=opts||{}; if (m===mode && !opts.force) return; const prev=mode; mode=m; setModeButtons(); ui.menu.hidden=true; $('bRooms').classList.remove('lens'); walkTarget=null;
  ui.tour.hidden = m!=='tour'; ui.doll.hidden = m!=='doll'; ui.bar.hidden = m==='tour'; ui.mini.hidden = m!=='walk' || isTouch || innerWidth<761; dollLabels.hidden = m!=='doll'; ui.photo.hidden=true; nearKey=null;
  if (m==='doll'){ tourStop(); dollFrame(); cutGoal=2.35; if (cutCur>100) cutCur=9; const p=dollPos(); oTmp.position.copy(p); oTmp.lookAt(doll.tgt); animateCam(p, oTmp.quaternion, 1.5); showHint(isTouch?'Arraste para girar, pince para aproximar':'Arraste para girar, role para aproximar', 2600); }
  else { cutGoal=1e4; }
  if (m==='walk'){ tourStop(); if (prev==='doll' && !opts.keepCam){ animateCam(new T.Vector3(pos.x,floorAt(pos.x,pos.z)+1.6,pos.z), walkQuat(yaw,pitch), 1.4); } if (!opts.silent) showHint(isTouch?'Toque no chão para ir até lá · arraste para olhar':'Clique no chão para ir até lá · arraste para olhar · W A S D', 3200); }
  if (m==='tour'){ const from = opts.from!==undefined ? opts.from : 0; if (prev==='doll') { tour.i=-1; tourGo(from,'fade'); } else { tour.i=-1; tourGo(from, from===0?'fade':'fade'); } }
}
ui.modes.querySelectorAll('button').forEach(b=> b.onclick=()=>setMode(b.dataset.mode));
let hintT=0; function showHint(txt,ms){ const h=ui.hint; h.textContent=txt; h.hidden=false; h.style.opacity=1; clearTimeout(hintT); hintT=setTimeout(()=>{ h.style.opacity=0; setTimeout(()=>{ h.hidden=true; },420); }, ms||2800); }

// ---------- guided tour ----------
const TOUR=[
  {k:'chegada', n:'Chegada', t:'O portão abre para o jardim tropical. A portaria 24h do condomínio fica logo na entrada.', p:[21.5,0,Math.PI/2,-.04]},
  {k:'externa', n:'Pátio e jardim', t:'Um pátio amplo de bloquete, com a casa de madeira e vidro aberta para ele.', p:[14.5,3.5,1.22,-.03], glide:[]},
  {k:'lareira', n:'Lareira e rede', t:'O coração da casa: a lareira rebaixada cheia de almofadas, a rede e o piso de cimento queimado verde.', p:[3.2,-2,Math.PI/2,-.22], glide:[[9.6,.6],[7,.1]]},
  {k:'jantar', n:'Jantar', t:'Mesa redonda para 8 pessoas, colada às portas de vidro que dão para o jardim.', p:[2.8,-1.2,-.885,-.15], glide:[]},
  {k:'cozinha', n:'Cozinha', t:'Bancada de concreto com banquetas, fogão, forno, micro-ondas e churrasqueira.', p:[0,1.9,-1.92,-.15]},
  {k:'sala', n:'Sala de TV', t:'O deck de madeira, um degrau acima, com sofás, TV e as janelas para a mata.', p:[-3.2,-1.5,.84,-.12]},
  {k:'q1', n:'Quarto 1', t:'Cama de casal, ar-condicionado e janela para o jardim.', p:[-4.2,9.4,.64,-.2]},
  {k:'q2', n:'Quarto 2', t:'Cama de casal com cabeceira de madeira e roupa de cama bordada.', p:[-4.2,10.7,2.48,-.2]},
  {k:'q3', n:'Quarto 3', t:'Duas camas de solteiro sobre o tablado de madeira, com janela entre elas.', p:[-1.9,11.9,-2.43,-.2]},
  {k:'banheiro', n:'Banheiro', t:'Bancada de concreto, parede de tijolo de vidro e box de azulejo branco.', p:[-1.9,7.7,-1.35,-.15]},
  {k:'externa', n:'Jardim', t:'O terreno cercado, com palmeiras e muito verde. A Praia da Feiticeira fica a uns 100 metros.', p:[15,7,.98,0]}
];
const HOLD=7.5; const tour={i:-1,t:0,playing:true,phase:'hold',glide:null};
function tourStop(){ tour.phase='idle'; }
function tourUI(){ const s=TOUR[tour.i]; $('tcStep').textContent=(tour.i+1)+' de '+TOUR.length; $('tcRoom').textContent=s.n; $('tcText').textContent=s.t; $('tcPlay').innerHTML=ico(tour.playing?'pause':'play'); $('tcPlay').setAttribute('aria-label',tour.playing?'Pausar':'Continuar'); $('tcPrev').disabled=tour.i===0; $('tcPrev').style.opacity=tour.i===0?.4:1; }
function tourGo(i, how){ i=Math.max(0,Math.min(TOUR.length-1,i)); const s=TOUR[i], prev=tour.i; tour.i=i; tourUI();
  const P=s.p; if (how!=='fade' && i===prev+1 && s.glide && prev>=0){ const pts=[new T.Vector3(pos.x,0,pos.z)].concat(s.glide.map(q=>new T.Vector3(q[0],0,q[1]))).concat([new T.Vector3(P[0],0,P[1])]);
      const curve=new T.CatmullRomCurve3(pts,false,'centripetal'); const len=curve.getLength(); tour.glide={curve,y0:yaw,y1:P[2],p0:pitch,p1:P[3],dur:Math.max(2.2,Math.min(6,len/1.7)),t:0}; tour.phase='glide'; }
  else { tour.phase='fading'; fadeTo(()=>{ placeAt(P[0],P[1],P[2],P[3]); camera.position.set(pos.x,eyeY,pos.z); tour.phase='hold'; tour.t=0; }); }
  tour.t=0; }
const angDiff=(a,b)=>{ let d=b-a; while (d>Math.PI) d-=2*Math.PI; while (d<-Math.PI) d+=2*Math.PI; return d; };
function tourTick(dt){ if (mode!=='tour') return;
  if (tour.phase==='glide'){ const g=tour.glide; g.t+=dt/g.dur; const e=ease(Math.min(1,g.t)); const p=g.curve.getPointAt(e); pos.set(p.x,0,p.z); yaw=g.y0+angDiff(g.y0,g.y1)*e; pitch=g.p0+(g.p1-g.p0)*e; bobT+=dt*5; if (g.t>=1){ tour.phase='hold'; tour.t=0; } }
  else if (tour.phase==='hold'){ const s=TOUR[tour.i]; if (tour.playing) tour.t+=dt; const k=Math.min(1,tour.t/HOLD); yaw=s.p[2]+Math.sin(k*Math.PI*1.4)*.24*Math.min(1,tour.t*1.2); pitch=s.p[3];
    $('tcBar').firstChild.style.width=(k*100)+'%';
    if (tour.playing && tour.t>=HOLD){ if (tour.i<TOUR.length-1) tourGo(tour.i+1); else { tour.playing=false; tourUI(); $('tcStep').textContent='Fim do tour'; } } }
  else $('tcBar').firstChild.style.width='0%'; }
$('tcPlay').onclick=()=>{ if (!tour.playing && tour.i===TOUR.length-1 && tour.t>=HOLD){ tour.playing=true; tourGo(0,'fade'); return; } tour.playing=!tour.playing; tourUI(); };
$('tcNext').onclick=()=>{ if (tour.i<TOUR.length-1) tourGo(tour.i+1); };
$('tcPrev').onclick=()=>{ if (tour.i>0) tourGo(tour.i-1,'fade'); };
$('tcPhotos').onclick=()=>{ tour.playing=false; tourUI(); openGal(TOUR[tour.i].k,0); };
$('tcExplore').onclick=()=>setMode('walk');

// ---------- dollhouse ----------
const doll={theta:-.62, phi:.92, r:30, tgt:new T.Vector3(3.2,0,4.2)};
function dollFrame(){ if (innerWidth/innerHeight<.85){ doll.theta=Math.PI/2+.32; doll.phi=.78; doll.r=29; doll.tgt.set(5.5,0,3.6); } else { doll.theta=-.62; doll.phi=.92; doll.r=27; doll.tgt.set(4.5,0,3.6); } }
function dollPos(){ const s=Math.sin(doll.phi); return new T.Vector3(doll.tgt.x+doll.r*s*Math.sin(doll.theta), doll.r*Math.cos(doll.phi), doll.tgt.z+doll.r*s*Math.cos(doll.theta)); }
const dollLabels=document.createElement('div'); dollLabels.hidden=true; document.body.appendChild(dollLabels);
const DL=[['sala','Sala de TV',-5.2,-2.6],['lareira','Lareira',0,-2],['jantar','Jantar',5.2,-3.2],['cozinha','Cozinha',3.2,3.9],['q1','Quarto 1',-5.8,8],['q2','Quarto 2',-5.8,12],['banheiro','Banheiro',-.2,7.2],['q3','Quarto 3',-.2,12.6],['externa','Pátio',12.8,0],['chegada','Chegada',21,0]];
const dlEls=DL.map(([k,n,x,z])=>{ const b=document.createElement('button'); b.className='lg pill press'; b.style.cssText='position:fixed;left:0;top:0;height:'+(isTouch?30:36)+'px;padding:0 '+(isTouch?11:14)+'px;font-size:'+(isTouch?12.5:13.5)+'px;z-index:5;will-change:transform'; b.textContent=n; b.onclick=e=>{ e.stopPropagation(); enterRoom(k); }; dollLabels.appendChild(b); return {b,v:new T.Vector3(x,1.2,z)}; });
function updateDollLabels(){ const w=innerWidth, h=innerHeight; for (const d of dlEls){ const p=d.v.clone().project(camera); const vis=p.z<1 && Math.abs(p.x)<1.05 && Math.abs(p.y)<1.05; d.b.style.display=vis?'':'none'; if (vis) d.b.style.transform='translate('+((p.x*.5+.5)*w-d.b.offsetWidth/2).toFixed(1)+'px,'+((-p.y*.5+.5)*h-d.b.offsetHeight/2).toFixed(1)+'px)'; } }
function enterRoom(k){ const r=PH[k]; if (!r) return; placeAt(r.tp[0],r.tp[1],r.tp[2],r.tp[3]); setMode('walk'); }
function enterAt(x,z){ const dx=x-camera.position.x, dz=z-camera.position.z; placeAt(x,z,Math.atan2(-dx,-dz),-.08); setMode('walk'); }

// ---------- input ----------
const keys={}; const menu=ui.menu;
spots.forEach(s=>{ const b=document.createElement('button'); b.innerHTML=s[0]+'<span>ir</span>'; b.onclick=()=>{ goSpot(s); }; $('menuList').appendChild(b); });
function goSpot(s){ menu.hidden=true; $('bRooms').classList.remove('lens'); if (mode!=='walk'){ placeAt(s[1],s[2],s[3],s[4]); setMode('walk'); } else fadeTo(()=>{ placeAt(s[1],s[2],s[3],s[4]); }); }
const MZ=[['Sala de TV',-8,-2.15,-6,.85,1],['Lareira',-2.15,2.5,-6,1.2,2],['Jantar',2.5,8,-6,.5,3],['Cozinha',-2.2,8,1.2,6,4],['Quarto 1',-8,-3.6,6,10,5],['Quarto 2',-8,-3.6,10,14,6],['Banheiro',-2.4,2,6,8.6,9],['Trabalho',-2.4,2,8.6,11.3,7],['Quarto 3',-2.4,2,11.3,14,8],['Pátio',8,17,-7,7,0],['Jardim',8,17,7,14,10]];
function drawMap(svg){ svg.setAttribute('viewBox','-9 -7.5 27 22'); svg.innerHTML = MZ.map(([n,x0,x1,z0,z1,si])=>`<g class="mz" data-si="${si}" data-n="${n}"><rect x="${x0}" y="${z0}" width="${x1-x0}" height="${z1-z0}" rx=".3"/><text x="${(x0+x1)/2}" y="${(z0+z1)/2+.22}">${n}</text></g>`).join('') + '<path class="cone" d="M0 0"/><circle class="me" r=".42"/>';
  svg.querySelectorAll('.mz').forEach(g=> g.onclick=()=>goSpot(spots[+g.dataset.si])); }
drawMap($('miniSvg')); drawMap($('menuSvg'));
const MAPKEY={'Sala de TV':'Sala de TV','Lareira e rede':'Lareira','Mesa de jantar':'Jantar','Cozinha':'Cozinha','Quarto 1':'Quarto 1','Quarto 2':'Quarto 2','Banheiro':'Banheiro','Espaço de trabalho':'Trabalho','Quarto 3':'Quarto 3','Pátio':'Pátio','Jardim':'Jardim'};
function updateMaps(){ const zn=zoneAt(pos.x,pos.z); for (const id of ['miniSvg','menuSvg']){ const svg=$(id); if (id==='miniSvg' && ui.mini.hidden) continue; if (id==='menuSvg' && menu.hidden) continue; const me=svg.querySelector('.me'), cone=svg.querySelector('.cone'); me.setAttribute('cx',pos.x); me.setAttribute('cy',pos.z);
  const a=-yaw-Math.PI/2, r=2.4, s1=a-.5, s2=a+.5; cone.setAttribute('d',`M${pos.x} ${pos.z} L${pos.x+Math.cos(s1)*r} ${pos.z+Math.sin(s1)*r} A${r} ${r} 0 0 1 ${pos.x+Math.cos(s2)*r} ${pos.z+Math.sin(s2)*r}Z`);
  svg.querySelectorAll('.mz').forEach(g=>g.classList.toggle('on', g.dataset.n===MAPKEY[zn])); } }
function setTime(i){ target=targets[i]; document.querySelectorAll('#bar [data-t]').forEach(b=>b.classList.toggle('lens', +b.dataset.t===i)); }
function toggleLights(){ lightsOn=!lightsOn; $('bLights').classList.toggle('warm', lightsOn); $('bLights').setAttribute('aria-label', lightsOn?'Luzes acesas':'Luzes apagadas'); }
document.querySelectorAll('#bar [data-t]').forEach(b=> b.onclick=()=>setTime(+b.dataset.t));
$('bLights').onclick=toggleLights;
$('bRooms').onclick=()=>{ menu.hidden=!menu.hidden; $('bRooms').classList.toggle('lens',!menu.hidden); if (!menu.hidden) updateMaps(); };
addEventListener('keydown',e=>{ if (galOpen) return; keys[e.code]=true; if (!started) return; if (e.code==='KeyL') toggleLights(); if (e.code==='KeyM') $('bRooms').onclick(); if (e.code==='KeyT') setMode(mode==='tour'?'walk':'tour'); if (e.code==='KeyV') setMode(mode==='doll'?'walk':'doll');
  const d={Digit1:0,Digit2:1,Digit3:2,Digit4:3}[e.code]; if (d!==undefined) setTime(d);
  if (mode==='tour'){ if (e.code==='ArrowRight') $('tcNext').onclick(); if (e.code==='ArrowLeft') $('tcPrev').onclick(); if (e.code==='Space'){ e.preventDefault(); $('tcPlay').onclick(); } }
  if (mode==='tour' && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown'].includes(e.code)) setMode('walk',{silent:true}); });
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for (const k in keys) keys[k]=false; });
const clampPitch=()=>{ pitch=Math.max(-1.35,Math.min(1.35,pitch)); };

const joy=$('joy'), knob=$('knob'); let joyId=null, joyO=[0,0], joyV=[0,0], lookId=null, lookL=[0,0];
const ptrs=new Map(); let pinchD=0;
canvas.addEventListener('pointerdown',e=>{ if (!started || galOpen) return; menu.hidden=true; $('bRooms').classList.remove('lens'); try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t0:performance.now(),moved:0});
  if (mode==='doll'){ if (ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinchD=Math.hypot(a.x-b.x,a.y-b.y); } return; }
  if (mode==='tour') return;
  if (e.pointerType!=='mouse' && e.clientX < innerWidth*.42 && joyId===null){ joyId=e.pointerId; joyO=[e.clientX,e.clientY]; joyV=[0,0]; knob.style.transform=''; }
  else if (lookId===null){ lookId=e.pointerId; lookL=[e.clientX,e.clientY]; } });
canvas.addEventListener('pointermove',e=>{ const p=ptrs.get(e.pointerId); if (!p) return; const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY; p.moved=Math.max(p.moved, Math.hypot(e.clientX-p.x0, e.clientY-p.y0));
  if (mode==='doll'){ if (ptrs.size>=2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if (pinchD>0){ doll.r=Math.max(12,Math.min(60,doll.r*pinchD/d)); } pinchD=d; } else if (!camAnim){ doll.theta-=dx*.006; doll.phi=Math.max(.32,Math.min(1.32,doll.phi-dy*.004)); } return; }
  if (mode==='tour'){ if (p.moved>12){ setMode('walk',{silent:true}); lookId=e.pointerId; lookL=[e.clientX,e.clientY]; } return; }
  if (e.pointerId===joyId){ if (p.moved>8 || joy.style.display==='block'){ joy.style.display='block'; joy.style.left=joyO[0]+'px'; joy.style.top=joyO[1]+'px'; let jx=e.clientX-joyO[0], jy=e.clientY-joyO[1]; const l=Math.hypot(jx,jy), mx=56; if (l>mx){ jx*=mx/l; jy*=mx/l; } joyV=[jx/mx,jy/mx]; knob.style.transform='translate('+jx+'px,'+jy+'px)'; walkTarget=null; } }
  else if (e.pointerId===lookId){ const k = e.pointerType==='mouse' ? .0042 : .0058; yaw-=dx*k; pitch-=dy*k; clampPitch(); } });
function endP(e){ const p=ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size<2) pinchD=0;
  if (e.pointerId===joyId){ joyId=null; joyV=[0,0]; joy.style.display='none'; } if (e.pointerId===lookId) lookId=null;
  if (p && e.type==='pointerup' && p.moved<9 && performance.now()-p.t0<400) onTap(e.clientX,e.clientY); }
canvas.addEventListener('pointerup',endP); canvas.addEventListener('pointercancel',endP);
canvas.addEventListener('wheel',e=>{ if (mode!=='doll') return; e.preventDefault(); doll.r=Math.max(12,Math.min(60,doll.r*(1+e.deltaY*.0012))); },{passive:false});

// tap: photo marker > walk to the floor point (or enter a room from the dollhouse)
const rc=new T.Raycaster(), ndc=new T.Vector2();
function pickFloor(cx,cy){ ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1); rc.setFromCamera(ndc,camera); const o=rc.ray.origin, d=rc.ray.direction; if (d.y>-.015) return null; let best=null;
  for (const hh of [.45,.22,0,-.22,-.45]){ const t=(hh-o.y)/d.y; if (t<=0||t>80) continue; const x=o.x+d.x*t, z=o.z+d.z*t; if (Math.abs(floorAt(x,z)-hh)<.01 && (!best||t<best.t)) best={x,z,t,h:hh}; } return best; }
let walkTarget=null; const ring=new T.Mesh(new T.RingGeometry(.2,.29,40), new T.MeshBasicMaterial({color:lin('#ffcf8a'),transparent:true,opacity:0,depthWrite:false,fog:false})); ring.rotation.x=-Math.PI/2; ring.renderOrder=4; ring.userData.keep=true; let ringT=9;
function onTap(cx,cy){ if (!started || galOpen) return;
  if (mode==='tour'){ return; }
  ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1); rc.setFromCamera(ndc,camera); const hit=rc.intersectObjects(markers.map(m=>m.sp)); if (hit.length && hit[0].distance<(mode==='doll'?80:14)){ const mk=markers.find(m=>m.sp===hit[0].object); if (mk){ openGal(mk.k,0); return; } }
  const f=pickFloor(cx,cy); if (!f) return;
  if (mode==='doll'){ if (Math.abs(f.x)<26 && Math.abs(f.z)<26) enterAt(f.x,f.z); return; }
  if (f.t>32) return; walkTarget=new T.Vector3(f.x,0,f.z); ring.position.set(f.x,f.h+.02,f.z); ringT=0; }

// ---------- real photos linked to 3D ----------
const PH = {
  chegada:{n:'Chegada', m:[22.4,1.7,0], tp:[21.5,0,Math.PI/2,-.05], p:[['f00','Portaria do condomínio'],['f01','Portão da casa'],['f02','Caminho pelo jardim']]},
  externa:{n:'Pátio e jardim', m:[11.6,1.6,-3.2], tp:[13,.5,Math.PI/2,-.05], p:[['f03','A casa vista do pátio'],['f04','Pátio e jardim tropical'],['f05','Sombra das árvores'],['f06','Fachada entre palmeiras']]},
  jantar:{n:'Jantar', m:[5,1.25,-3.3], tp:[2.8,-1.2,-.885,-.15], p:[['f07','Mesa redonda junto ao vidro'],['f08','Mesa para 8'],['f09','Jantar, cozinha e rede']]},
  cozinha:{n:'Cozinha', m:[3,1.5,3], tp:[0,1.9,-1.92,-.15], p:[['f10','Bancada e churrasqueira'],['f11','Cozinha integrada'],['f12','Fogão e churrasqueira'],['f13','Pia dupla'],['f14','Geladeira e cobogós'],['f15','Micro-ondas e cafeteira']]},
  lareira:{n:'Lareira e rede', m:[0,.75,-2], tp:[3.2,-2,Math.PI/2,-.22], p:[['f16','Rede sobre o cimento queimado'],['f17','Telhado radial de madeira'],['f18','Lareira rebaixada'],['f19','A lareira vista do alto']]},
  sala:{n:'Sala de TV', m:[-5.4,1.5,-2.6], tp:[-3.2,-1.5,.84,-.12], p:[['f20','Sala de TV no deck'],['f21','Sofás voltados para a mata'],['f22','Deck integrado']]},
  q1:{n:'Quarto 1', m:[-5.8,1.45,8.7], tp:[-4.2,9.4,.64,-.2], p:[['f23','Cama de casal'],['f24','Janela para o jardim'],['f25','Visto da porta']]},
  q2:{n:'Quarto 2', m:[-5.8,1.45,11.3], tp:[-4.2,10.7,2.48,-.2], p:[['f26','Cama de casal e cadeira'],['f27','Cabeceira entalhada'],['f28','Visto da porta']]},
  q3:{n:'Quarto 3', m:[0,1.35,12.4], tp:[-1.9,11.9,-2.43,-.2], p:[['f29','Duas camas de solteiro'],['f30','Janela entre as camas'],['f31','Visto da porta']]},
  banheiro:{n:'Banheiro', m:[.1,1.6,7.4], tp:[-1.9,7.7,-1.35,-.15], p:[['f32','Bancada e tijolo de vidro'],['f33','Pia'],['f34','Box'],['f35','Vaso sanitário']]},
  lavabo:{n:'Banheiro 2', m:[-1,1.5,5.3], tp:[-1,3.8,Math.PI,-.1], p:[['f36','Pia de cobre']]}
};
const markerTex = (function(){ const S=128, c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'); const img=g.createImageData(S,S);
  for (let y=0;y<S;y++) for (let x=0;x<S;x++){ const r=Math.hypot(x-S/2+.5,y-S/2+.5)/(S/2), i=(y*S+x)*4, a=r<1?Math.pow(1-r,1.6)*.6:0; img.data[i]=255; img.data[i+1]=207; img.data[i+2]=138; img.data[i+3]=a*255|0; }
  g.putImageData(img,0,0); g.fillStyle='#ffcf8a'; g.beginPath(); g.arc(64,64,33,0,7); g.fill(); g.strokeStyle='#f6f1e7'; g.lineWidth=5; g.stroke();
  g.strokeStyle='#0c1411'; g.lineWidth=4.5; g.lineJoin='round'; g.beginPath(); g.moveTo(46,56); g.lineTo(52,56); g.lineTo(56,51); g.lineTo(72,51); g.lineTo(76,56); g.lineTo(82,56); g.lineTo(82,78); g.lineTo(46,78); g.closePath(); g.stroke(); g.beginPath(); g.arc(64,66,6.5,0,7); g.stroke(); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; })();
const markers=[]; for (const k in PH){ const sm=new T.SpriteMaterial({map:markerTex,depthWrite:false,transparent:true}); const sp=new T.Sprite(sm); sp.position.set(...PH[k].m); sp.scale.set(.42,.42,1); sp.renderOrder=5; markers.push({k,sp}); }
let nearKey=null, galOpen=false, galKey=null, galI=0, pendingTP=null;
const photoBtn=ui.photo;
function nearest(){ let best=null, bd=3.8; for (const mk of markers){ const d=Math.hypot(mk.sp.position.x-pos.x, mk.sp.position.z-pos.z); if (d<bd){ bd=d; best=mk.k; } } return best; }
function openGal(k,i){ galKey=k; galI=i||0; galOpen=true; for (const c in keys) keys[c]=false; $('gal').hidden=false; showGal(); }
function showGal(){ const r=PH[galKey], p=r.p[galI]; $('galImg').src='fotos/'+p[0]+'.jpg'; $('galRoom').textContent=r.n; $('galCap').textContent=p[1]+' · foto '+(galI+1)+' de '+r.p.length; $('galDots').innerHTML=r.p.map((_,j)=>'<i class="'+(j===galI?'on':'')+'"></i>').join(''); $('galP').hidden=$('galN').hidden=$('galDots').hidden=r.p.length<2; }
function closeGal(){ galOpen=false; $('gal').hidden=true; }
$('galX').onclick=closeGal; $('galP').onclick=()=>{ galI=(galI-1+PH[galKey].p.length)%PH[galKey].p.length; showGal(); }; $('galN').onclick=()=>{ galI=(galI+1)%PH[galKey].p.length; showGal(); };
(function(){ let sx=null; const g=$('gal'); g.addEventListener('pointerdown',e=>{ sx=e.clientX; }); g.addEventListener('pointerup',e=>{ if (sx===null) return; const dx=e.clientX-sx; sx=null; if (Math.abs(dx)>50 && PH[galKey].p.length>1) (dx<0?$('galN'):$('galP')).onclick(); }); })();
photoBtn.onclick=()=>{ if (nearKey) openGal(nearKey,0); };
addEventListener('keydown',e=>{ if (galOpen){ if (e.code==='Escape') closeGal(); if (e.code==='ArrowRight') $('galN').onclick(); if (e.code==='ArrowLeft') $('galP').onclick(); } else if (e.code==='KeyF' && nearKey && mode==='walk') openGal(nearKey,0); });
function teleportRoom(k){ const r=PH[k]; if (!r) return; placeAt(r.tp[0],r.tp[1],r.tp[2],r.tp[3]); if (started && mode!=='walk') setMode('walk',{keepCam:true,silent:true}); camAnim=null; }
const embedded = window.parent && window.parent!==window;
if (embedded){ $('back').hidden=false; $('back').onclick=()=>{ paused=true; window.parent.postMessage({tour3d:'close'},'*'); }; }
addEventListener('message',e=>{ const d=e.data||{}; if (d.tour3d==='goto'){ paused=false; if (window.__ready) teleportRoom(d.room); else pendingTP=d.room; } if (d.tour3d==='pause') paused=true; });

// ---------- start screen ----------
$('howto').innerHTML = isTouch
  ? '<div>'+ico('tap')+'<p><b>Andar</b><span>Toque no chão, ou arraste no lado esquerdo</span></p></div><div>'+ico('eye')+'<p><b>Olhar</b><span>Arraste no lado direito</span></p></div><div>'+ico('house')+'<p><b>Maquete</b><span>Veja a casa de cima, sem telhado</span></p></div><div>'+ico('cam')+'<p><b>Fotos reais</b><span>Toque nos pontos dourados</span></p></div>'
  : '<div>'+ico('walk')+'<p><b>Andar</b><span>Clique no chão ou use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span></p></div><div>'+ico('eye')+'<p><b>Olhar</b><span>Arraste com o mouse</span></p></div><div>'+ico('house')+'<p><b>Maquete</b><span><kbd>V</kbd> mostra a casa de cima, <kbd>T</kbd> o tour</span></p></div><div>'+ico('cam')+'<p><b>Fotos reais</b><span>Clique num ponto dourado ou aperte <kbd>F</kbd></span></p></div>';
function begin(m){ started=true; $('start').hidden=true; ui.modes.hidden=false; setMode(m,{force:true}); }
$('go').onclick=()=>begin('walk');
$('goTour').onclick=()=>begin('tour');

// ---------- loop ----------
const clock=new T.Clock(); let labelT=0, perfN=0, perfT=0, perfDone=false;
function frame(){ requestAnimationFrame(frame); if (paused || document.hidden) { clock.getDelta(); return; }
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
  if (mode==='walk' && started && menu.hidden){ const near=nearest(); if (near!==nearKey){ nearKey=near; photoBtn.hidden=!near; if (near){ $('pbImg').src='fotos/'+PH[near].p[0][0]+'.jpg'; $('pbS').textContent=PH[near].n+' · '+PH[near].p.length+' foto'+(PH[near].p.length>1?'s':'')+(isTouch?'':' · tecla F'); } } }
  for (const mk of markers){ mk.sp.visible = mode!=='tour'; const k=(mk.k===nearKey?.5:.4)*(mode==='doll'?2.2:1)+.035*Math.sin(t*3+mk.sp.position.x); mk.sp.scale.set(k,k,1); }
  if (started && !galOpen && mode==='walk' && !camAnim){ let f=0, s=0; if (keys.KeyW||keys.ArrowUp) f+=1; if (keys.KeyS||keys.ArrowDown) f-=1; if (keys.KeyD||keys.ArrowRight) s+=1; if (keys.KeyA||keys.ArrowLeft) s-=1;
    f-=joyV[1]; s+=joyV[0]; let len=Math.hypot(f,s); if (len>1){ f/=len; s/=len; } if (len>.05) walkTarget=null;
    let sp = (keys.ShiftLeft||keys.ShiftRight||Math.hypot(joyV[0],joyV[1])>.97) ? 4.2 : 1.9;
    if (walkTarget){ const dx=walkTarget.x-pos.x, dz=walkTarget.z-pos.z, dist=Math.hypot(dx,dz); if (dist<.12){ walkTarget=null; } else { const want=Math.atan2(-dx,-dz); yaw+=angDiff(yaw,want)*Math.min(1,dt*3.2); const fwd=Math.max(0,Math.cos(angDiff(yaw,want))); f=Math.min(1,dist/.6)*fwd+.15; s=0; sp=2.1; len=1; } }
    const vx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt, vz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt; const feet=floorAt(pos.x,pos.z); const ox=pos.x, oz=pos.z;
    if (!blocked(pos.x+vx,pos.z,feet)) pos.x+=vx; if (!blocked(pos.x,pos.z+vz,feet)) pos.z+=vz;
    pos.x=Math.max(-24.4,Math.min(23.6,pos.x)); pos.z=Math.max(-24.4,Math.min(24.4,pos.z));
    if (walkTarget && Math.hypot(pos.x-ox,pos.z-oz)<sp*dt*.08) walkTarget=null;
    if (len>.05) bobT+=dt*sp*2.6; }
  tourTick(dt);
  eyeY += (floorAt(pos.x,pos.z)+1.6-eyeY)*Math.min(1,dt*10);
  if (camAnim){ camAnim.t+=dt/camAnim.dur; const e=ease(Math.min(1,camAnim.t)); camera.position.lerpVectors(camAnim.p0,camAnim.p1,e); camera.quaternion.copy(camAnim.q0).slerp(camAnim.q1,e); if (camAnim.t>=1){ const cb=camAnim.onEnd; camAnim=null; if (cb) cb(); } }
  else if (mode==='doll'){ camera.position.copy(dollPos()); camera.lookAt(doll.tgt); }
  else if (!(mode==='tour' && tour.phase==='fading')) { camera.position.set(pos.x, eyeY+Math.sin(bobT)*.022, pos.z); camera.quaternion.copy(walkQuat(yaw,pitch)); }
  // dollhouse cut
  if (cutGoal<100){ cutCur+= (cutGoal-cutCur)*Math.min(1,dt*2.4); } else if (cutCur<100){ cutCur+= (12-cutCur)*Math.min(1,dt*3); if (cutCur>11.5) cutCur=1e4; } cutPlane.constant=cutCur;
  if (mode==='doll') updateDollLabels();
  // tap ring
  if (ringT<1.2){ ringT+=dt; ring.material.opacity=Math.max(0,1-ringT/1.2)*.9; const k=1+ringT*.8; ring.scale.set(k,k,1); } else if (walkTarget){ ring.material.opacity=.55+.25*Math.sin(t*6); } else ring.material.opacity=0;
  lerpState(1-Math.exp(-dt*2.2)); applyState(); skyU.uTime.value=t;
  lightF += ((lightsOn?1:0)-lightF)*Math.min(1,dt*6); applyLights(t);
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  envTimer -= dt; const tdist = cur.sun.distanceTo(target.sun) + Math.abs(cur.sunI-target.sunI); if (envTimer<=0 && (tdist>.01 || envLast<0)){ envTimer=.35; envLast=1; updateEnv(); }
  grassU.uTime.value=t;
  labelT-=dt; if (labelT<=0){ labelT=.15; $('room').textContent = mode==='doll' ? 'Maquete' : zoneAt(pos.x,pos.z); updateMaps(); }
  renderer.render(scene,camera);
  // adaptive quality: if the phone struggles, render fewer pixels
  if (started && !perfDone){ perfN++; perfT+=dt; if (perfN>=90){ const ms=perfT/perfN*1000; if (ms>24 && curDPR>1){ curDPR=Math.max(1,curDPR-.35); renderer.setPixelRatio(curDPR); perfN=0; perfT=0; } else if (ms<15 && curDPR<maxDPR){ curDPR=Math.min(maxDPR,curDPR+.25); renderer.setPixelRatio(curDPR); perfDone=true; } else perfDone=true; } }
}

setTimeout(()=>{ build(); finishFoliage(); mergeStatic(); setupClipping(); for (const m of markers) scene.add(m.sp); scene.add(ring);
  applyState(); updateEnv(); camera.position.set(pos.x,eyeY,pos.z); camera.quaternion.copy(walkQuat(yaw,pitch)); renderer.render(scene,camera);
  const go=$('go'); go.disabled=false; go.innerHTML=ico('walk')+'Andar pela casa'; $('goTour').disabled=false; requestAnimationFrame(frame); window.__ready=true; window.__t3={renderer,scene,camera,setMode,setTime,placeAt,doll,tour,get mode(){return mode;},pause:v=>{paused=v;}, settle:()=>{ if (camAnim){ camAnim.t=.999; } if (cutGoal<100) cutCur=cutGoal+.01; }, tourGo:(i,h)=>tourGo(i,h),frame:()=>{ renderer.render(scene,camera); }}; if (pendingTP) teleportRoom(pendingTP); }, 30);
})();
</script>
</body>
</html>
