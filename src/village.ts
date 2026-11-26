import {riverZ,riverRadius,bridgeStart,bridgeEnd,pathX,sidePath,bounds,groundSize,type Landmark} from './layout'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {grain,maple,seeded,sheet,shrub} from './print'

const rand=seeded(12587)
const choose=(a:number,b:number)=>a+rand()*(b-a)
const colors=new Map<string,T.MeshStandardMaterial>()
function paper(color:string){
  if(!colors.has(color)) colors.set(color,new T.MeshStandardMaterial({color,roughness:1,flatShading:true}))
  return colors.get(color)!
}
function object(p:T.Object3D,g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){
  const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o
}
const box=new T.BoxGeometry(),stone=new T.IcosahedronGeometry(1,0)
function block(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,col:string){
  const o=object(p,box,paper(col),x,y,z);o.scale.set(w,h,d);return o
}
function beam(p:T.Object3D,a:T.Vector3,b:T.Vector3,w:number,d:number,col:string){
  const mid=a.clone().lerp(b,.5),dir=b.clone().sub(a)
  const o=block(p,mid.x,mid.y,mid.z,w,dir.length(),d,col)
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o
}
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z)
function cylinder(p:T.Object3D,x:number,y:number,z:number,top:number,bottom:number,h:number,col:string,n=12){
  return object(p,new T.CylinderGeometry(top,bottom,h,n),paper(col),x,y,z)
}
export function floorY(x:number,z:number){
  const t=(z-bridgeStart)/(bridgeEnd-bridgeStart)
  return Math.abs(x)<1.15 && t>=0 && t<=1 ? .09+.65*Math.sin(Math.PI*t):.035
}
const obstacles:Landmark[]=[]
export function passable(x:number,z:number){
  if(x<bounds.left||x>bounds.right||z<bounds.top||z>bounds.bottom)return false
  if(Math.abs(z-riverZ(x))<riverRadius(x)+.18 && Math.abs(x)>.82)return false
  if(z>bridgeStart&&z<bridgeEnd&&Math.abs(x)>.82&&Math.abs(x)<1.29)return false
  return !obstacles.some(o=>Math.abs(x-o.x)<o.w+.18&&Math.abs(z-o.z)<o.d+.18)
}

function terrain(root:T.Group){
  const tex=sheet(2048,2048,c=>{
    const r=seeded(131),unit=2048/groundSize
    c.fillStyle='#bcb380';c.fillRect(0,0,2048,2048)
    for(let i=0;i<10000;i++){
      c.beginPath();c.fillStyle=i%2?'rgba(231,208,150,.12)':'rgba(132,134,87,.10)'
      c.arc(r()*2048,r()*2048,3+r()*35,0,Math.PI*2);c.fill()
    }
    function road(side:boolean){
      const pts=new Path2D()
      for(const s of [-1,1])for(let i=0;i<=640;i++){
        const u=(s===-1?i:640-i)/640
        const a=side?-7.1+u*8.8:u*64-32
        const b=(side?sidePath(a):pathX(a))+s*((side?.82:1.02)+.08*Math.sin(a*2.65)+r()*.085)
        const x=(32+(side?a:b))*unit,y=(32+(side?b:a))*unit
        if(i===0 && s===-1)pts.moveTo(x,y);else pts.lineTo(x,y)
      }
      pts.closePath();c.fillStyle='#e3cca0';c.fill(pts)
    }
    road(true);road(false);grain(c,2048,2048,r,295000)
    for(let i=0;i<14000;i++){
      const x=r()*64-32,z=r()*64-32
      if(Math.abs(x-pathX(z))<1||(x>-7.1&&x<1.7&&Math.abs(z-sidePath(x))<.85))continue
      c.save();c.translate((x+32)*32,(z+32)*32);c.rotate(r()*6)
      c.fillStyle=['#c48d56','#b09e62','#c4aa74','#b17346'][i%4]
      c.beginPath();c.ellipse(0,0,1+r()*2.8,1.1,0,0,Math.PI*2);c.fill();c.restore()
    }
  })
  const ground=object(root,new T.PlaneGeometry(groundSize,groundSize),new T.MeshStandardMaterial({map:tex}),0,0,0)
  ground.rotation.x=-Math.PI/2; ground.castShadow=false
  const wt=sheet(512,128,c=>{
    c.fillStyle='#439b91';c.fillRect(0,0,512,128);const r=seeded(44)
    for(let i=0;i<330;i++){c.fillStyle=i%4===0?'rgba(221,228,184,.45)':'rgba(53,129,121,.19)'
      c.beginPath();c.ellipse(r()*512,r()*128,2+r()*15,.5+r()*1.5,0,0,Math.PI*2);c.fill()}
    grain(c,512,128,r,3800)
  });wt.wrapS=T.RepeatWrapping
  const water=new T.MeshStandardMaterial({map:wt,roughness:.92,side:T.DoubleSide})
  function ribbon(a:number,b:number,y:number,mat:T.Material){
    const pos:number[]=[],uv:number[]=[],idx:number[]=[]
    for(let i=0;i<=256;i++){
      const x=-32+i*.25,z=riverZ(x),w=riverRadius(x)
      pos.push(x,y,z+w*a,x,y,z+w*b);uv.push(x/7,0,x/7,1)
      if(i){const j=i*2;idx.push(j-2,j-1,j,j,j-1,j+1)}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals()
    object(root,g,mat,0,0,0).castShadow=false
  }
  ribbon(-1.10,1.10,.011,paper('#eee0b0'));ribbon(-1.04,1.04,.016,paper('#a49e73'));ribbon(-1,1,.021,water)
  return {water:wt,groundPrint:tex.image as HTMLCanvasElement}
}
function bridge(p:T.Group){
  const n=19
  for(let i=0;i<=n;i++){
    const z=bridgeStart+(bridgeEnd-bridgeStart)*i/n,y=floorY(0,z)
    const o=block(p,0,y-.043,z,2.12,.09,.237,['#d5aa68','#dfba77','#cda163'][i%3])
    o.rotation.x=-Math.atan(.65*Math.PI/(bridgeEnd-bridgeStart)*Math.cos(Math.PI*i/n))
  }
  for(const x of [-1.03,1.03]){
    for(let i=0;i<=6;i++){
      const z=bridgeStart+i*.75,y=floorY(0,z)
      block(p,x,y+.35,z,.11,.76,.12,'#a85836');block(p,x,y+.75,z,.15,.07,.16,'#f1c682')
      if(i<6)for(const h of [.27,.65])
        beam(p,v(x,y+h,z),v(x,floorY(0,z+.75)+h,z+.75),.08,.085,h>.3?'#dfaa65':'#bd7148')
    }
  }
}

function house(p:T.Group,x:number,z:number,s:number,rot:number,roof:T.Texture){
  const g=new T.Group();p.add(g);g.position.set(x,0,z);g.scale.setScalar(s);g.rotation.y=rot
  obstacles.push({kind:'house',rotation:rot,x,z,w:1.65*s,d:1.48*s})
  block(g,0,1.08,0,3.1,2.12,2.52,'#c28b5a')
  for(let i=0;i<11;i++) block(g,0,.11+i*.185,1.272,3.1,.025,.028,'#a16b43')
  const tri=new T.Shape();tri.moveTo(-1.55,0);tri.lineTo(1.55,0);tri.lineTo(0,1.42);tri.closePath()
  object(g,new T.ExtrudeGeometry(tri,{depth:2.52,bevelEnabled:false}),paper('#d7a774'),0,2.12,-1.26)
  const mat=new T.MeshStandardMaterial({map:roof,side:T.DoubleSide})
  for(const sign of [-1,1]){
    const slope=.74*sign
    const panel=block(g,sign*.89,2.78,0,2.46,.12,3.05,'#e8b67d');panel.rotation.z=-slope
    const r=object(g,new T.PlaneGeometry(3.07,2.48),mat,sign*.89,2.90,0)
    r.rotation.order='YXZ';r.rotation.y=sign*Math.PI/2;r.rotation.x=-Math.PI/2+.74
  }
  block(g,0,3.67,0,.14,.13,3.15,'#a94b36')
  block(g,-.83,3.45,-.57,.41,.95,.46,'#bc8664');block(g,-.83,3.97,-.57,.53,.12,.55,'#e0ab83')
  for(const xx of [-1.49,1.49])block(g,xx,1.06,1.31,.12,2.14,.13,'#805138')
  block(g,0,.68,1.31,.74,1.36,.11,'#815137');block(g,0,.65,1.39,.55,1.17,.07,'#466b56')
  block(g,.15,.69,1.43,.07,.08,.05,'#e6ba6a')
  for(const xx of [-.96,.95]){
    block(g,xx,1.24,1.32,.77,.85,.08,'#794f35')
    block(g,xx,1.25,1.38,.63,.7,.06,'#ffdc88')
    block(g,xx,1.25,1.43,.045,.72,.035,'#8d593b')
    block(g,xx,1.25,1.43,.63,.045,.035,'#8d593b')
    block(g,xx,.78,1.42,.90,.09,.20,'#d6a46a')
  }
  block(g,0,.085,1.60,1.0,.17,.52,'#bc9f7a')
}
function roofPrint(){
  return sheet(512,384,c=>{
    c.fillStyle='#a54c38';c.fillRect(0,0,512,384)
    const r=seeded(314)
    for(let row=7;row>=-1;row--)for(let col=-1;col<9;col++){
      const x=col*65+(row%2)*32,y=row*54
      c.beginPath();c.moveTo(x,y);c.lineTo(x+64,y);c.lineTo(x+64,y+41);c.quadraticCurveTo(x+32,y+64,x,y+42);c.closePath()
      c.fillStyle=['#bb5941','#c36746','#af513e','#c85c42'][Math.floor(r()*4)];c.fill()
      c.strokeStyle='#e0a073';c.lineWidth=2.4;c.stroke()
    }
    grain(c,512,384,r,32000)
  })
}

// A shallow central crease makes the illustrated paper respond to light on both faces.
function folded(){
  const g=new T.BufferGeometry()
  g.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,0,0,.065,.5,0,0,-.5,1,0,0,1,.065,.5,1,0],3))
  g.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,0,1,0,0,1,.5,1,1,1],2))
  g.setIndex([0,1,3,1,4,3,1,2,4,2,5,4]);g.computeVertexNormals();return g
}
function decorations(p:T.Group){
  const geom=folded()
  const materials=[maple(8),maple(6),maple(19),shrub(2,'pine'),shrub(2,'bush'),shrub(5,'bush'),shrub(12,'grass'),shrub(23,'grass')].map(map=>new T.MeshStandardMaterial({map,alphaTest:.48,side:T.DoubleSide,roughness:1}))
  type Card={x:number,z:number,w:number,h:number,a:number,offset:number,wing:boolean,open:boolean,progress:number}
  const cards:Card[][]=materials.map(()=>[])
  function card(x:number,z:number,k:number,w:number,h:number,a:number,offset=0,wing=false){
    cards[k].push({x,z,w,h,a,offset,wing,open:false,progress:-1})
  }
  function clear(x:number,z:number,pad:number){
    return Math.abs(z-riverZ(x))>riverRadius(x)+pad && Math.abs(x-pathX(z))>1.12+pad && (x < -7.1 || x > 1.7 || Math.abs(z-sidePath(x))>.82+pad) &&
      !obstacles.some(o=>Math.abs(x-o.x)<o.w+pad&&Math.abs(z-o.z)<o.d+pad)
  }
  function tree(x:number,z:number,h:number,k:number){
    const w=h*(k===3?.65:.86),a=choose(-.45,.45)
    card(x,z,k,w,h,a);card(x,z,k,w*.89,h*.94,a,0,true)
    obstacles.push({kind:k===3?'pine':'tree',x,z,w:.18,d:.18})
  }
  tree(4.55,-2.65,3.18,0);tree(6.55,-4.12,3.55,1)
  tree(-2.95,-.90,2.72,2)
  for(let i=0;i<290;i++){
    const x=choose(-28,28),z=choose(-30,24)
    if(clear(x,z,1.35))tree(x,z,choose(2.4,4.4),Math.floor(choose(0,4)))
  }
  for(let i=0;i<970;i++){
    const x=choose(-27,27),z=choose(-28,23)
    if(!clear(x,z,.16))continue
    const k=Math.floor(choose(4,8)),w=k<6?choose(1.1,2.3):choose(.45,1.12)
    card(x,z,k,w,w*(k<6?.65:.92),choose(-.55,.55),k<6?-w*.13:0)
    if(i%4===0){const o=object(p,stone,paper(['#ae9268','#ac977d','#b49d74'][i%3]),x+.45,.08,z+.14);o.scale.set(.43,.34,.36);o.rotation.y=choose(0,3)}
  }
  const foliage=new T.Group()
  const batches=materials.map((mat,k)=>{
    const mesh=new T.InstancedMesh(geom,mat,cards[k].length)
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);foliage.add(mesh);return mesh
  })
  const pose=new T.Object3D()
  pose.rotation.order='YXZ'
  function animate(x:number,z:number,dt:number){
    for(let k=0;k<cards.length;k++){
      const mesh=batches[k]
      cards[k].forEach((c,index)=>{
        const distance=Math.hypot(x-c.x,z-c.z)
        const backdrop=Math.abs(c.x)>16 || c.z < -17 || c.z>16
        const radius=k<4?5.1:4.1
        c.open=backdrop || distance<radius+(c.open?1.9:0)
        const previous=c.progress
        if(previous<0)c.progress=backdrop?1:0
        else c.progress=T.MathUtils.clamp(previous+(c.open?1:-1)*dt/(c.wing?.93:.72),0,1)
        if(c.progress===previous)return
        const t=c.progress,e=t*t*(3-2*t)
        // Both leaves hinge at the ground. The second leaf fans around the trunk as it rises.
        pose.rotation.set(1.43*(1-e)-.12*Math.sin(2*Math.PI*t)*e,c.a+(c.wing?.035+1.195*e:0),0)
        pose.position.set(c.x,.035+c.offset*e+(c.wing?.018:0),c.z)
        pose.scale.set(c.w,c.h,c.w*(.12+.88*e));pose.updateMatrix()
        mesh.setMatrixAt(index,pose.matrix);mesh.instanceMatrix.needsUpdate=true
      })
    }
  }
  return {foliage,animate}
}
function signpost(p:T.Group,x:number,z:number){
  obstacles.push({kind:'sign',x,z,w:.10,d:.12})
  block(p,x,.66,z,.13,1.32,.14,'#885b3e')
  const b=block(p,x+.05,1.04,z,.98,.30,.13,'#d5a368');b.rotation.z=.065
  block(p,x,1.06,z+.08,.46,.042,.013,'#80563a')
  for(const s of [-1,1])block(p,x+.24,1.06+s*.045,z+.08,.16,.04,.014,'#80563a').rotation.z=s*-.56
}
function fence(p:T.Group,x:number,z:number,n:number){
  obstacles.push({kind:'fence',x:x+(n-1)*.365,z,w:(n-1)*.365+.06,d:.09})
  for(let i=0;i<n;i++){
    block(p,x+i*.73,.37,z,.11,.74,.14,'#9b6242')
    if(i<n-1)for(const h of [.26,.54])block(p,x+i*.73+.37,h,z,.76,.09,.09,'#c28c5a')
  }
}
function riverDetails(p:T.Group){
  const reedPaper=sheet(256,256,c=>{
    const r=seeded(58)
    for(let i=0;i<21;i++){
      const x=27+r()*202,y=68+r()*119
      c.beginPath();c.moveTo(126+(x-128)*.35,251);c.quadraticCurveTo(x,y+41,x+(x-128)*.16,y)
      c.quadraticCurveTo(x-13,y+43,112+(x-128)*.38,251);c.closePath()
      c.fillStyle=['#738052','#88894f','#ac934c','#976e3b'][i%4];c.fill()
      c.lineWidth=1.4;c.strokeStyle='#e4c580';c.stroke()
    }
    for(const [x,y] of [[72,54],[127,26],[189,52]]){
      c.save();c.translate(x,y);c.rotate((x-128)*.004)
      c.fillStyle='#8c6b3f';c.fillRect(-2,4,4,162)
      c.fillStyle='#a9462a';c.fillRect(-7,0,14,37)
      c.fillStyle='#d07b48';c.fillRect(-5,2,3,31);c.restore()
    }
    grain(c,256,256,r,3400)
  })
  const mat=new T.MeshStandardMaterial({map:reedPaper,side:T.DoubleSide,alphaTest:.45})
  const g=folded()
  for(const x of [-13,-8.8,-8,-4.25,3.5,4.1,8,12.2]){
    const z=riverZ(x)+(x>0?-1:1)*(riverRadius(x)+.12)
    const o=object(p,g,mat,x,.016,z);o.scale.set(1.25,1.18,1);o.rotation.y=.12*Math.sin(x)
  }
  const duckPrint=sheet(240,140,c=>{
    const draw=(d:string,col:string)=>{const shape=new Path2D(d);c.fillStyle=col;c.fill(shape);c.strokeStyle='#775033';c.lineWidth=2;c.stroke(shape)}
    draw('M18 92 L7 73 L38 81 Q70 58 117 80 Q139 91 151 66 Q142 29 171 27 Q194 25 198 47 L204 66 Q191 79 182 93 Q169 117 113 119 Q50 120 18 92Z','#c6a780')
    draw('M147 68 Q139 30 167 24 Q192 19 201 48 L200 63 Q177 79 151 73Z','#41634e')
    draw('M198 51 L228 59 Q219 66 198 65Z','#dfb45f')
    draw('M39 86 Q79 66 121 86 Q102 107 59 103Z','#936442')
    c.fillStyle='#392d25';c.beginPath();c.arc(184,44,3.5,0,7);c.fill()
  })
  const duckMat=new T.MeshStandardMaterial({map:duckPrint,alphaTest:.45,side:T.DoubleSide})
  for(const [x,dz,size] of [[-4.9,.13,.92],[-6.05,.38,.58],[5.1,-.38,.85]]){
    const z=riverZ(x)+dz
    const o=object(p,g,duckMat,x,-.047,z);o.scale.set(size,size*.59,size)
    for(const side of [-1,1]){
      const wake=block(p,x-.48*size,.031,z+side*.15,.44,.006,.026,'#aed0ae')
      wake.rotation.y=side*.20
    }
  }
}
// Bake stationary props by material to keep an illustrated thicket inexpensive to draw.
function batch(root:T.Group){
  root.updateMatrixWorld(true)
  const groups=new Map<T.Material,T.BufferGeometry[]>()
  const originals=new Set<T.BufferGeometry>()
  root.traverse(o=>{
    if(!(o instanceof T.Mesh))return
    const source=o.geometry as T.BufferGeometry;originals.add(source)
    const g=source.index?source.toNonIndexed():source.clone()
    g.applyMatrix4(o.matrixWorld);g.clearGroups()
    const arr=groups.get(o.material)??[];arr.push(g);groups.set(o.material,arr)
  })
  root.clear()
  for(const [mat,arr] of groups){
    const g=mergeGeometries(arr)!;object(root,g,mat,0,0,0)
    arr.forEach(a=>a.dispose())
  }
  originals.forEach(g=>{if(g!==box&&g!==stone)g.dispose()})
}
export function buildVillage(){
  const world=new T.Group(),{water,groundPrint}=terrain(world),props=new T.Group(),roof=roofPrint()
  bridge(props)
  riverDetails(props)
  house(props,-5.25,-5.08,1.06,-.32,roof);house(props,8.3,-10.3,.87,-.44,roof)
  house(props,-11,6.8,.91,.39,roof);house(props,1,-20,1.02,.22,roof)
  fence(props,-9.1,-3.62,5);fence(props,5.7,-7.7,6)
  const sign=new T.Group();signpost(sign,1.53,-1.35)
  for(const part of sign.children){part.position.x-=1.53;part.position.z+=1.35}
  batch(sign);sign.position.set(1.53,.065,-1.35)
  const {foliage,animate}=decorations(props);batch(props);world.add(props,foliage,sign)
  let signProgress=0,signOpen=false
  function updatePaper(x:number,z:number,dt:number){
    animate(x,z,dt)
    signOpen=Math.hypot(x-sign.position.x,z-sign.position.z)<(signOpen?6.5:4.3)
    signProgress=T.MathUtils.clamp(signProgress+(signOpen?1:-1)*dt/.8,0,1)
    sign.rotation.x=1.48*(1-T.MathUtils.smoothstep(signProgress,0,1))
  }
  return {world,water,updatePaper,groundPrint,landmarks:obstacles}
}
export function traveler(){
  const root=new T.Group(),body=new T.Group(),legs:T.Group[]=[],arms:T.Group[]=[]
  root.add(body)
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.14,.47,0);body.add(leg);legs.push(leg)
    block(leg,0,-.14,0,.19,.31,.18,'#604437')
    block(leg,0,-.36,.045,.20,.14,.28,'#473c32')
    const arm=new T.Group();arm.position.set(side*.28,1,0);body.add(arm);arms.push(arm)
    block(arm,0,-.14,0,.18,.28,.19,'#e6cda0');block(arm,0,-.32,.015,.12,.15,.13,'#ba845b')
  }
  block(body,0,.74,0,.44,.55,.32,'#efe0b1')
  block(body,0,.53,0,.43,.13,.34,'#a35c3c')
  block(body,0,1.18,0,.34,.36,.30,'#c58e60')
  for(const x of [-.095,.095])block(body,x,1.21,.158,.035,.045,.018,'#473726')
  block(body,0,1.27,-.14,.36,.17,.11,'#5b3c2c')
  block(body,0,.80,-.24,.43,.47,.20,'#924832');block(body,0,.94,-.35,.46,.18,.055,'#b8603d')
  for(const x of [-.14,.14]){block(body,x,.82,.164,.048,.43,.032,'#955b38');block(body,x,.79,-.35,.045,.25,.04,'#daa864')}
  cylinder(body,0,1.38,0,.47,.50,.065,'#e5b859',20)
  cylinder(body,0,1.405,0,.33,.45,.045,'#edc46c',20)
  for(const radius of [.37,.42,.465]){
    const weave=object(body,new T.TorusGeometry(radius,.006,3,30),paper('#b88845'),0,1.413-(radius-.37)*.23,0)
    weave.rotation.x=Math.PI/2
  }
  cylinder(body,0,1.51,0,.235,.30,.20,'#d8a44f',16)
  cylinder(body,0,1.46,0,.288,.302,.062,'#ad633a',16)
  cylinder(body,0,1.61,0,.19,.235,.045,'#ecc372',16)
  return {root,body,legs,arms}
}
