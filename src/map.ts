import {bounds,bridgeStart,bridgeEnd,groundSize,riverZ,riverRadius,type Landmark} from './layout'

export function createMap(ground:HTMLCanvasElement,landmarks:Landmark[],signal:AbortSignal,onToggle:()=>void){
  const dialog=document.querySelector<HTMLDialogElement>('#map')!
  const canvas=dialog.querySelector('canvas')!,ctx=canvas.getContext('2d')!
  const count=dialog.querySelector('output')!
  const cell=2,seen=new Set<string>()
  let x=0,z=0,lastCol=Infinity,lastRow=Infinity
  function visit(px:number,pz:number){
    x=px;z=pz
    const col=Math.floor(x/cell),row=Math.floor(z/cell)
    if(col===lastCol&&row===lastRow)return
    lastCol=col;lastRow=row
    for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
      if(i*i+j*j>10)continue
      const cx=(col+i)*cell,cz=(row+j)*cell
      if(cx<bounds.right&&cx+cell>bounds.left&&cz<bounds.bottom&&cz+cell>bounds.top)seen.add([col+i,row+j].join(','))
    }
  }
  function draw(){
    if(!dialog.open)return
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2)
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)
    const scale=Math.min(w/(bounds.right-bounds.left+3),h/(bounds.bottom-bounds.top+2))
    ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*w/2,dpr*(h/2-(bounds.bottom+bounds.top)*.5*scale))
    ctx.lineCap='round';ctx.lineJoin='round'
    const tiles=new Path2D(),edge=new Path2D()
    for(const key of seen){
      const [i,j]=key.split(',').map(Number),a=i*cell,b=j*cell
      tiles.rect(a,b,cell,cell)
      for(const [di,dj,x1,z1,x2,z2] of [[0,-1,a,b,a+cell,b],[0,1,a,b+cell,a+cell,b+cell],[-1,0,a,b,a,b+cell],[1,0,a+cell,b,a+cell,b+cell]]){
        if(!seen.has([i+di,j+dj].join(','))){edge.moveTo(x1,z1);edge.lineTo(x2,z2)}
      }
    }
    ctx.save();ctx.beginPath();ctx.rect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);ctx.clip()
    ctx.clip(tiles)
    ctx.drawImage(ground,-groundSize/2,-groundSize/2,groundSize,groundSize)
    ctx.beginPath()
    for(let i=-64;i<=64;i++){const a=i/4;ctx.lineTo(a,riverZ(a)-riverRadius(a))}
    for(let i=64;i>=-64;i--){const a=i/4;ctx.lineTo(a,riverZ(a)+riverRadius(a))}
    ctx.closePath();ctx.fillStyle='#7fa69a';ctx.fill();ctx.strokeStyle='#ebe0b3';ctx.lineWidth=.13;ctx.stroke()
    ctx.fillStyle='#c99d69';ctx.strokeStyle='#785b3d';ctx.lineWidth=.09
    ctx.fillRect(-1,bridgeStart,2,bridgeEnd-bridgeStart);ctx.strokeRect(-1,bridgeStart,2,bridgeEnd-bridgeStart)
    for(let b=bridgeStart+.32;b<bridgeEnd;b+=.36){ctx.beginPath();ctx.moveTo(-1,b);ctx.lineTo(1,b);ctx.stroke()}
    for(const obj of landmarks){
      ctx.save();ctx.translate(obj.x,obj.z);ctx.rotate(-(obj.rotation??0));ctx.strokeStyle='#745337';ctx.lineWidth=.09
      if(obj.kind==='house'){
        ctx.fillStyle='#b96345';ctx.fillRect(-obj.w,-obj.d,2*obj.w,2*obj.d);ctx.strokeRect(-obj.w,-obj.d,2*obj.w,2*obj.d)
        ctx.beginPath();ctx.moveTo(0,-obj.d);ctx.lineTo(0,obj.d);ctx.stroke()
      }else if(obj.kind==='tree'||obj.kind==='pine'){
        ctx.fillStyle=obj.kind==='pine'?'#6c8055':'#c9904f'
        ctx.beginPath()
        if(obj.kind==='pine'){ctx.moveTo(0,-.68);ctx.lineTo(.46,.4);ctx.lineTo(-.46,.4);ctx.closePath()}
        else ctx.ellipse(0,-.12,.49,.53,.3,0,Math.PI*2)
        ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,.02);ctx.lineTo(0,.67);ctx.stroke()
      }else{ctx.fillStyle='#806040';ctx.fillRect(-obj.w,-obj.d,2*obj.w,2*obj.d)}
      ctx.restore()
    }
    ctx.strokeStyle='#806845';ctx.lineWidth=.16;ctx.stroke(edge);ctx.restore()
    ctx.translate(x,z);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-1.18);ctx.strokeStyle='#763c2c';ctx.lineWidth=.14;ctx.stroke()
    ctx.beginPath();ctx.arc(0,-1.28,.42,0,Math.PI*2);ctx.fillStyle='#b33d30';ctx.fill();ctx.strokeStyle='#fff2c9';ctx.lineWidth=.09;ctx.stroke()
    count.value=String(seen.size)
  }
  function toggle(){
    onToggle()
    if(dialog.open)dialog.close()
    else{dialog.showModal();draw()}
  }
  const opts={signal}
  document.querySelector('#showMap')!.addEventListener('click',toggle,opts)
  dialog.querySelector('button')!.addEventListener('click',toggle,opts)
  dialog.addEventListener('cancel',onToggle,opts)
  window.addEventListener('resize',draw,opts)
  return {dialog,visit,toggle}
}
