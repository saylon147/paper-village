import * as T from 'three'

export function seeded(seed:number) {
  return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296 }
}
export type Ink = CanvasRenderingContext2D
export function sheet(w:number,h:number,paint:(c:Ink)=>void) {
  const canvas=document.createElement('canvas')
  canvas.width=w; canvas.height=h
  paint(canvas.getContext('2d')!)
  const tex=new T.CanvasTexture(canvas)
  tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=4
  return tex
}
function path(c:Ink,d:string,fill:string,stroke?:string,line=2) {
  const p=new Path2D(d); c.fillStyle=fill; c.fill(p)
  if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke(p)}
}
export function grain(c:Ink,w:number,h:number,r:()=>number,amount:number) {
  c.save();c.globalCompositeOperation='source-atop'
  for(let i=0;i<amount;i++){
    c.fillStyle=r()>.48?'rgba(255,244,204,.18)':'rgba(79,48,27,.11)'
    c.fillRect(r()*w,r()*h,1+r()*3,.5+r()*1.7)
  }
  c.restore()
}
function leaf(c:Ink,x:number,y:number,angle:number,len:number,width:number,color:string,vein=true){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(width,len)
  path(c,'M0 0 Q-1.05 -.40 0 -1 Q.92 -.44 0 0',color)
  if(vein)path(c,'M0 -.05 L-.025 -.72 L.045 -.20 Z','#e9af60')
  c.restore()
}
export function maple(seed:number){
  const r=seeded(seed),gold=seed%3===0
  return sheet(384,448,c=>{
    const base=gold?'#d7ae58':'#df8342',light=gold?'#ead286':'#efa962'
    const shape=new Path2D()
    for(let i=0;i<72;i++){
      const a=i*Math.PI/36, scallop=1+.045*Math.cos(a*12)+.025*Math.sin(a*7+seed)
      const x=192+161*Math.cos(a)*scallop*(1+.14*Math.sin(a)),y=189+166*Math.sin(a)*scallop
      if(!i)shape.moveTo(x,y);else shape.lineTo(x,y)
    }
    shape.closePath();c.fillStyle='#814429';c.fill(shape);c.lineWidth=5;c.strokeStyle='#f2cf8c';c.stroke(shape)
    c.save();c.clip(shape);c.fillStyle=base;c.fillRect(0,0,384,448)
    c.fillStyle=light;c.globalAlpha=.45;c.beginPath();c.moveTo(190,0);c.lineTo(204,365);c.lineTo(0,370);c.lineTo(0,0);c.fill();c.globalAlpha=1
    const colors=gold?['#a2582f','#b37839','#bf5430','#e6bd65']:['#ac3821','#c15030','#9b3c29','#da642e','#efb65b']
    for(let i=0;i<84;i++){const x=r()*384,y=r()*360;leaf(c,x,y,(r()-.5)*2,6+r()*16,5+r()*7,colors[i%colors.length],false)}
    c.restore()
    path(c,'M175 445 Q187 329 178 247 L183 129 Q192 204 196 231 L207 109 Q210 211 200 280 L207 444 Z','#773b27','#d29a57',2)
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const y=303-i*47+(side===1?18:0), reach=140-i*21, endX=192+side*reach
      path(c,`M190 ${y+11} Q${192+side*33} ${y-16} ${endX} ${y-53} Q${192+side*58} ${y-49} 190 ${y-8}Z`,'#813e26')
      for(let j=1;j<=4;j++){
        const t=j/4,x=192+side*reach*t,yy=y-50*t
        leaf(c,x,yy,side*(.38+r()*.3),27+r()*12,13+r()*6,colors[(i+j)%3])
        leaf(c,x,yy,side*1.65,19+r()*8,11,colors[(i+j+1)%3])
      }
    }
    grain(c,384,448,r,22000)
  })
}
export function shrub(seed:number,kind:'bush'|'grass'|'pine'){
  const r=seeded(seed)
  return sheet(256,256,c=>{
    if(kind==='pine'){
      path(c,'M118 255 L124 90 L136 93 L141 255Z','#885136','#dfb16d')
      for(let j=0;j<4;j++){
        const y=207-48*j,w=113-22*j
        path(c,`M128 ${y-78} Q${128-w*.66} ${y-12} ${128-w} ${y} Q${128-w*.48} ${y+9} 125 ${y-10} Q${132+w*.42} ${y+11} ${128+w} ${y} Q${128+w*.5} ${y-20} 128 ${y-78}Z`,['#455840','#61704a','#748054','#89905b'][j],'#d6bd7d',3)
        for(let k=0;k<17;k++){const t=(r()-.5)*1.65;leaf(c,128+t*w,y-4-r()*11,t*.8+3.14,8,2,'#c7aa6e',false)}
      }
    }else if(kind==='bush'){
      const palette=seed%2?['#335f51','#46775d','#618761']:['#9f442f','#c25736','#d16d45']
      for(let i=0;i<7;i++){
        const x=28+i*33,y=165+Math.cos(i*1.2)*16
        c.beginPath();c.ellipse(x,y,37,39+r()*24,-.2,0,Math.PI*2);c.fillStyle=palette[i%3];c.fill();c.strokeStyle='#e2b674';c.lineWidth=2;c.stroke()
      }
      c.clearRect(0,201,256,55)
      for(let i=0;i<52;i++){const x=10+r()*236,y=162+r()*38;leaf(c,x,y,(r()-.5)*2,7+r()*11,4,'#e8bd78',false)}
    }else{
      for(let i=0;i<28;i++){
        const x=45+r()*165,y=244-r()*12
        leaf(c,x,y,(x-128)/94+(r()-.5)*.7,56+r()*85,11+r()*12,['#677141','#879051','#b39352','#63754c'][i%4])
      }
      for(let i=0;i<6;i++){
        const x=42+r()*169,y=103+r()*65
        path(c,`M125 237 Q${x} ${y+30} ${x} ${y} L${x+2} ${y} Q${x+4} ${y+32} 129 237Z`,'#716b3e')
        for(let k=0;k<5;k++)leaf(c,x,y,k*1.256,13,11,seed%2?'#c53724':'#efbb54',false)
        c.fillStyle='#eac77a';c.fillRect(x-3,y-3,6,6)
      }
    }
    grain(c,256,256,r,9200)
  })
}
