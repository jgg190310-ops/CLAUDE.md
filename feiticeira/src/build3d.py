#!/usr/bin/env python3
"""Assemble feiticeira/3d.html from the new head/UI, the original model code (patched) and the new runtime."""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
orig = (ROOT / 'orig' / '3d.html').read_text().split('\n')
# original lines 149..535 (1-based): IIFE start, renderer, textures, materials, helpers and build()
mid = '\n'.join(orig[148:535])

def rep(old, new, count=1):
    global mid
    n = mid.count(old)
    if n != count:
        sys.exit(f'patch failed ({n} matches): {old[:90]!r}')
    mid = mid.replace(old, new)

# --- renderer: adaptive pixel ratio, clipping for the dollhouse, sane depth range
rep("const renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});\nrenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));",
    "const renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});\nconst maxDPR = Math.min(window.devicePixelRatio || 1, 2); let curDPR = Math.min(maxDPR, isTouch ? 1.7 : 2);\nrenderer.setPixelRatio(curDPR);\nrenderer.localClippingEnabled = true;")
rep("new T.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 900)", "new T.PerspectiveCamera(70, innerWidth/innerHeight, 0.08, 700)")

# --- the old start-screen help text is rebuilt later
start = mid.index("$('howto').innerHTML = isTouch")
end = mid.index("// ---------- renderer ----------")
mid = mid[:start] + mid[end:]

# --- textures that matched the photos badly
def replace_line_starting(prefix, new):
    global mid
    lines = mid.split('\n')
    hits = [i for i, l in enumerate(lines) if l.startswith(prefix)]
    if len(hits) != 1:
        sys.exit(f'line patch failed ({len(hits)}): {prefix}')
    i = hits[0]
    # a definition can continue on following lines until the line that ends with '});' or ');'
    j = i; bal = 0
    while True:
        bal += lines[j].count('(') - lines[j].count(')') + lines[j].count('{') - lines[j].count('}')
        if bal == 0 and lines[j].rstrip()[-1:] in (';', '}'):
            break
        j += 1
    lines[i:j + 1] = [new] if new else []
    mid = '\n'.join(lines)

ROOF = r"""const [tRoof,hRoof] = dual((g,gh,s)=>{ g.fillStyle='#1d1916'; g.fillRect(0,0,s,s); gh.fillStyle='#000'; gh.fillRect(0,0,s,s); const cols=5, rows=6, cw=s/cols, rh=s/rows;
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){ const x=c*cw+(r%2)*cw*.08, y=r*rh, v=(rnd()-.5)*22, warm=rnd()<.12?18:0;
    const gr=g.createLinearGradient(x,0,x+cw,0); gr.addColorStop(0,'rgb('+C8(40+v)+','+C8(35+v)+','+C8(32+v)+')'); gr.addColorStop(.5,'rgb('+C8(96+v+warm)+','+C8(86+v)+','+C8(78+v-warm*.4)+')'); gr.addColorStop(1,'rgb('+C8(38+v)+','+C8(33+v)+','+C8(30+v)+')');
    g.fillStyle=gr; g.fillRect(x+1,y,cw-2,rh-3); const sg=g.createLinearGradient(0,y,0,y+rh); sg.addColorStop(0,'rgba(0,0,0,.45)'); sg.addColorStop(.25,'rgba(0,0,0,0)'); sg.addColorStop(.92,'rgba(255,255,255,.05)'); sg.addColorStop(1,'rgba(0,0,0,.5)'); g.fillStyle=sg; g.fillRect(x+1,y,cw-2,rh-3);
    const hg=gh.createLinearGradient(x,0,x+cw,0); hg.addColorStop(0,'#202020'); hg.addColorStop(.5,'#f0f0f0'); hg.addColorStop(1,'#202020'); gh.fillStyle=hg; gh.fillRect(x+1,y+2,cw-2,rh-5); }
  blobs(g,s,26,['rgba(80,96,60,.12)','rgba(0,0,0,.18)','rgba(140,110,80,.08)'],30,120); }, 512);"""
replace_line_starting("const [tRoof,hRoof] = dual(", ROOF)

PAVER = r"""const [tPaver,hPaver] = dual((g,gh,s)=>{ g.fillStyle='#4a4743'; g.fillRect(0,0,s,s); gh.fillStyle='#000'; gh.fillRect(0,0,s,s); const n=8, u=s/n, m=2;
  for (let i=0;i<n;i++) for (let j=0;j<n;j++){ const vert=(i+j)%2===0; for (let k=0;k<2;k++){ const v=(rnd()-.5)*26, base=118+v;
      let x=i*u, y=j*u, w=u, h=u; if (vert){ w=u/2; x+=k*u/2; } else { h=u/2; y+=k*u/2; }
      g.fillStyle='rgb('+C8(base)+','+C8(base-3)+','+C8(base-9)+')'; g.fillRect(x+m,y+m,w-2*m,h-2*m); g.fillStyle='rgba(255,255,255,.06)'; g.fillRect(x+m,y+m,w-2*m,2);
      gh.fillStyle='#d0d0d0'; gh.fillRect(x+m+1,y+m+1,w-2*m-2,h-2*m-2); } }
  blobs(g,s,40,['rgba(30,30,20,.16)','rgba(255,255,240,.06)','rgba(60,70,40,.1)'],20,110); noise(g,s,.05,9000); hnoise(gh,s,2500); }, 512);"""
replace_line_starting("const [tPaver,hPaver] = dual(", PAVER)

GRASS = r"""const tGrass = tex((g,s)=>{ g.fillStyle='#4c7f2b'; g.fillRect(0,0,s,s); blobs(g,s,160,['rgba(28,64,18,.32)','rgba(130,170,60,.22)','rgba(90,120,40,.2)'],18,110);
  for (let i=0;i<14000;i++){ const x=rnd()*s, y=rnd()*s, v=rnd(); g.strokeStyle = v<.45 ? 'rgba(26,60,14,.45)' : v<.9 ? 'rgba(120,180,70,.4)' : 'rgba(170,190,90,.4)'; g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(rnd()-.5)*3, y-2-rnd()*4); g.stroke(); } }, 1024);"""
replace_line_starting("const tGrass = tex(", GRASS)
replace_line_starting("const tBlades = alphaTex(", "")
replace_line_starting("const tCloud = alphaTex(", "")
HALO = r"""const tHalo = (function(){ const S=128, c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'); const img=g.createImageData(S,S);
  for (let y=0;y<S;y++) for (let x=0;x<S;x++){ const r=Math.hypot(x-S/2+.5,y-S/2+.5)/(S/2), i=(y*S+x)*4; const a = r>=1 ? 0 : Math.exp(-r*r*9)*.95 + Math.pow(1-r,2)*.12; img.data[i]=img.data[i+1]=img.data[i+2]=255; img.data[i+3]=Math.min(255,a*255)|0; }
  g.putImageData(img,0,0); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; })();
const tLeafClump = tex((g,s)=>{ g.fillStyle='#b9b9b9'; g.fillRect(0,0,s,s); for (let i=0;i<2600;i++){ const v=150+(rnd()*105|0); g.fillStyle='rgb('+v+','+v+','+v+')'; g.beginPath(); g.ellipse(rnd()*s, rnd()*s, 3+rnd()*6, 1.5+rnd()*2.5, rnd()*3.14, 0, 6.3); g.fill(); }
  for (let i=0;i<900;i++){ g.fillStyle='rgba(40,40,40,.35)'; g.beginPath(); g.ellipse(rnd()*s, rnd()*s, 2+rnd()*4, 1+rnd()*2, rnd()*3.14, 0, 6.3); g.fill(); } }, 256);"""
replace_line_starting("const tHalo = alphaTex(", HALO)

rep(",\n  blades:new T.MeshStandardMaterial({map:tBlades,alphaTest:.4,side:T.DoubleSide,roughness:.95})\n};",
    ",\n  foliage:new T.MeshStandardMaterial({map:tLeafClump,roughness:.82}),\n  blades:new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),\n  mountainV:new T.MeshLambertMaterial({vertexColors:true})\n};\nconst grassU = { uTime:{value:0} };\nmat.blades.onBeforeCompile = sh => { sh.uniforms.uTime = grassU.uTime; sh.vertexShader = 'uniform float uTime;\\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\\n  #ifdef USE_INSTANCING\\n  vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);\\n  #else\\n  vec4 wp = vec4(0.0);\\n  #endif\\n  float hh = position.y*position.y*2.2;\\n  transformed.x += sin(uTime*1.6 + wp.x*.31 + wp.z*.17)*.07*hh;\\n  transformed.z += cos(uTime*1.25 + wp.z*.27 + wp.x*.11)*.05*hh;'); };")

# floor: the photo texture of the burnished cement reads too cyan; tint it toward the deep teal-green of the photos
rep("photoTex('tex/green.jpg', mat.green, false, 0, '#c9ddd6')", "photoTex('tex/green.jpg', mat.green, false, 0, '#86b3a4')")
rep("mat.green.envMapIntensity=.42;", "mat.green.envMapIntensity=.55;")
for m in ['foliage', 'blades', 'mountainV']:
    pass

# --- foliage blobs become instances of one leafy shape (one draw call for every canopy, bush and potted plant)
rep("const icoG = new T.IcosahedronGeometry(1,1);\nfunction blob(x,y,z,r,m,sx,sy,sz,parent){ const mesh = new T.Mesh(icoG, m); mesh.position.set(x,y,z); mesh.scale.set(r*(sx||1), r*(sy||1), r*(sz||1)); mesh.rotation.y = rnd()*6; mesh.castShadow=true; mesh.receiveShadow=true; (parent||scene).add(mesh); return mesh; }",
    r"""const icoG = (function(){ const g=new T.IcosahedronGeometry(1,2); const p=g.attributes.position, n=g.attributes.normal, v=new T.Vector3();
  for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).normalize(); const k=.86+.14*Math.sin(v.x*7.1+v.y*3.3)*Math.cos(v.z*6.2-v.y*2.1)+.06*Math.sin(v.x*17+v.z*13); n.setXYZ(i,v.x,v.y,v.z); p.setXYZ(i,v.x*k,v.y*k,v.z*k); }
  const uv=g.attributes.uv; for (let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*3, uv.getY(i)*2); return g; })();
const FOL=[]; const _c=new T.Color();
function blob(x,y,z,r,m,sx,sy,sz){ const hsl={}; _c.copy(m.color); _c.getHSL(hsl); _c.setHSL(hsl.h+(rnd()-.5)*.025, hsl.s*(.9+rnd()*.2), hsl.l*(.85+rnd()*.3)); FOL.push({x,y,z,sx:r*(sx||1),sy:r*(sy||1),sz:r*(sz||1),ry:rnd()*6.28,c:_c.clone()}); }
function finishFoliage(){ const im=new T.InstancedMesh(icoG, mat.foliage, FOL.length); const m4=new T.Matrix4(), q=new T.Quaternion(), s=new T.Vector3(), p=new T.Vector3(), up=new T.Vector3(0,1,0);
  FOL.forEach((f,i)=>{ p.set(f.x,f.y,f.z); q.setFromAxisAngle(up,f.ry); s.set(f.sx,f.sy,f.sz); m4.compose(p,q,s); im.setMatrixAt(i,m4); im.setColorAt(i,f.c); });
  im.castShadow=true; im.receiveShadow=true; scene.add(im); }""")

# --- grass: real blades with wind instead of flat cards
gs = mid.index("// grass tufts (instanced)")
ge = mid.index("// clouds")
GRASS_BLOCK = r"""// grass clumps (instanced, swaying in the wind)
(function(){ const P=[],C=[],Nn=[]; const B=10; for (let b=0;b<B;b++){ const a=rnd()*6.28, r=rnd()*.2, bx=Math.cos(a)*r, bz=Math.sin(a)*r, h=.22+rnd()*.34, w=.022+rnd()*.02, la=rnd()*6.28, lean=.06+rnd()*.14;
    const dx=Math.cos(la), dz=Math.sin(la), px=-dz, pz=dx; const tone=rnd(); const base=[.10,.20+.05*tone,.05], mid=[.22+.08*tone,.42+.1*tone,.12], tip=[.45+.15*tone,.62+.1*tone,.22];
    const q=(t,wf)=>[bx+dx*lean*t*t+px*w*wf, h*t, bz+dz*lean*t*t+pz*w*wf];
    const v=[q(0,-1),q(0,1),q(.55,-.7),q(.55,.7),q(1,0)], col=[base,base,mid,mid,tip];
    for (const tri of [[0,1,3],[0,3,2],[2,3,4]]) for (const k of tri){ P.push(...v[k]); C.push(...col[k]); Nn.push(0,1,0); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); g.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));
  const N=isTouch?5200:11000; const im=new T.InstancedMesh(g,mat.blades,N); im.receiveShadow=true; const m4=new T.Matrix4(), q=new T.Quaternion(), sc=new T.Vector3(), ps=new T.Vector3(), up=new T.Vector3(0,1,0); let n=0, tries=0;
  while (n<N && tries<N*6){ tries++; const x=-24+rnd()*47.5, z=-24+rnd()*48; if ((x>-9.7&&x<17.6&&z>-7.7&&z<7.7)||(x>-8.3&&x<2.3&&z>5.8&&z<14.3)||(x>2.5&&x<9.6&&z>6.1&&z<9.3)||(x>17.4&&x<24.5&&Math.abs(z)<.8)) continue; const sv=.75+rnd()*.7; ps.set(x,-.07,z); q.setFromAxisAngle(up,rnd()*6.28); sc.set(sv,sv*(.75+rnd()*.5),sv); m4.compose(ps,q,sc); im.setMatrixAt(n++,m4); }
  im.count=n; im.frustumCulled=false; scene.add(im); })();
"""
mid = mid[:gs] + GRASS_BLOCK + mid[ge:]

# --- remove sprite clouds (they rendered as coloured speckles on iPhone) and replace the faceted cone mountains
cs = mid.index("// clouds")
ce = mid.index("// fence + gate + sign")
MOUNT = r"""// distant mountains of Ilhabela: one smooth ring, coloured green to haze
(function(){ const SEG=240, R=[150,178,215,270]; const nz=[]; for (let i=0;i<24;i++) nz.push(rnd());
  const vn=a=>{ const f=a/(Math.PI*2)*24, i=Math.floor(f), t=f-i, u=t*t*(3-2*t); return nz[((i%24)+24)%24]*(1-u)+nz[(((i+1)%24)+24)%24]*u; };
  const hAt=a=>{ let h=18+vn(a)*26+vn(a*3.1+1)*12+vn(a*7.3+2)*5; const d=Math.atan2(Math.sin(a-2.35),Math.cos(a-2.35)); h+=78*Math.exp(-d*d/.32)+30*Math.exp(-Math.pow(d+.7,2)/.08); return h; };
  const pos=[], col=[], idx=[]; const cA=new T.Color('#21402a'), cB=new T.Color('#3e6448'), cC=new T.Color('#5b7d6a');
  for (let i=0;i<=SEG;i++){ const a=i/SEG*Math.PI*2, h=hAt(a), ca=Math.cos(a), sa=Math.sin(a); const rows=[[R[0],-4,cA],[R[1],h*.55,cB],[R[2],h,cC],[R[3],h*.35,cC]];
    for (const [r,y,c] of rows){ pos.push(ca*r,y,sa*r); col.push(c.r,c.g,c.b); } }
  for (let i=0;i<SEG;i++) for (let j=0;j<3;j++){ const a=i*4+j, b=(i+1)*4+j; idx.push(a,b,a+1, a+1,b,b+1); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3)); g.setIndex(idx); g.computeVertexNormals();
  const m=new T.Mesh(g, mat.mountainV); m.userData.keep=true; scene.add(m); })();
// a second belt of forest between the lot and the mountains
{ let k=0, tr=0; while (k<70 && tr<2000){ tr++; const a=rnd()*6.28, r=58+rnd()*34; const x=Math.cos(a)*r, z=Math.sin(a)*r; tree(x,z,1+rnd()*.6); k++; } }
"""
mid = mid[:cs] + MOUNT + mid[ce:]


rep("paver:M({map:tPaver,bump:hPaver,bs:.03,tile:1.2,r:.92})", "paver:M({map:tPaver,bump:hPaver,bs:.03,tile:2.0,r:.9})")
# tropical trees: taller trunks and wide, layered canopies instead of round balls
TREE = r"""function tree(x,z,s){ const h=(3.6+rnd()*1.6)*s; cyl(x,0,z,.09*s,.2*s,h,mat.trunk,8); const lm=[(rnd()*6)|0,(rnd()*6)|0]; const spread=(1.6+rnd()*1.2)*s;
  for (let k=0;k<4;k++){ const a=rnd()*6.28, bl=1.5*s; const bm=new T.Mesh(new T.CylinderGeometry(.035*s,.075*s,bl,6),mat.trunk); bm.position.set(x+Math.cos(a)*.45*s, h*.78+.35*s, z+Math.sin(a)*.45*s); bm.rotation.set(Math.sin(a)*.8,0,-Math.cos(a)*.8); bm.castShadow=true; scene.add(bm); }
  const n=13+(rnd()*8|0); for (let i=0;i<n;i++){ const a=rnd()*6.28, r=Math.sqrt(rnd())*spread; blob(x+Math.cos(a)*r, h+.35*s+rnd()*1.3*s-r*.22, z+Math.sin(a)*r, (.55+rnd()*.55)*s, mat.leaf[lm[i%2]], 1.25,.62,1.25); } }"""
replace_line_starting("function tree(x,z,s){", TREE)
rep("const g=new T.IcosahedronGeometry(1,2);", "const g=new T.IcosahedronGeometry(1,1);")
rep("h=.22+rnd()*.34, w=.022+rnd()*.02", "h=.1+rnd()*.17, w=.016+rnd()*.014")
rep("photoTex('tex/green.jpg', mat.green, false, 0, '#86b3a4')", "photoTex('tex/green.jpg', mat.green, false, 0, '#6e9d8b')")

head = (ROOT / 'src' / '3d_head.html').read_text()
partC = (ROOT / 'src' / '3d_partC.js').read_text()
scripts = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
           '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/geometries/RoundedBoxGeometry.js"></script>\n<script>\n')
out = head + scripts + mid + '\n' + partC
(ROOT / '3d.html').write_text(out)
print('wrote', ROOT / '3d.html', len(out))
