export const riverZ=(x:number)=>1.6+1.35*Math.sin(x*.20)+.26*Math.sin(x*.58)
export const riverRadius=(x:number)=>1.52+.17*Math.sin(x*.4)
export const bridgeStart=riverZ(0)-2.25,bridgeEnd=riverZ(0)+2.25
export const pathX=(z:number)=>z>bridgeEnd? .95*Math.sin((z-bridgeEnd)*.59):z<bridgeStart? 2.5*Math.sin((bridgeStart-z)*.32):0
export const sidePath=(x:number)=>-3.05+.30*Math.sin(x)

export const groundSize=64
export const bounds={left:-14.5,right:14.5,top:-16,bottom:15}
export type Landmark={kind:'house'|'tree'|'pine'|'sign'|'fence',x:number,z:number,w:number,d:number,rotation?:number}
