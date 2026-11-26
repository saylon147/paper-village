import * as T from 'three'
import {buildVillage,floorY,passable,traveler} from './village'
import './style.css'
import {createMap} from './map'

const host=document.querySelector<HTMLElement>('#world')!
function start(){
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap
  host.append(renderer.domElement)
  const scene=new T.Scene();scene.background=new T.Color('#dac89c')
  scene.fog=new T.Fog('#e0cdad',32,59)
  const cam=new T.OrthographicCamera(-10,10,7,-7,.1,95)
  const {world,water,updatePaper,landmarks,groundPrint}=buildVillage();scene.add(world)
  const player=traveler();scene.add(player.root)
  player.root.position.set(0,floorY(0,4.45),4.45);player.root.rotation.y=Math.PI
  scene.add(new T.HemisphereLight('#fff6e8','#c49e7a',1.48))
  const sun=new T.DirectionalLight('#fff1d1',2.28)
  sun.position.set(-12,21,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.1,far:65})
  sun.shadow.normalBias=.023;sun.shadow.bias=-.00018;scene.add(sun)
  const focus=new T.Vector3(0,0,.30),desired=new T.Vector3()
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)')
  let yaw=0,manualYaw=0,manualZoom=1,shotTime=0
  const offset=new T.Vector3()
  const renderTarget=new T.WebGLRenderTarget(1,1)
  renderTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType)
  const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1)
  const post=new T.ShaderMaterial({
    uniforms:{frame:{value:renderTarget.texture},depthMap:{value:renderTarget.depthTexture},
      pixel:{value:new T.Vector2(1,1)},focusDepth:{value:25},clip:{value:new T.Vector2(cam.near,cam.far)},maxBlur:{value:7}},
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 uv0; uniform sampler2D frame,depthMap; uniform vec2 pixel,clip;
      uniform float focusDepth,maxBlur;
      float distanceAt(vec2 uv){return mix(clip.x,clip.y,texture2D(depthMap,uv).r);}
      void main(){
        float depth=distanceAt(uv0);
        float radius=maxBlur*smoothstep(.9,8.0,abs(depth-focusDepth));
        vec3 c=texture2D(frame,uv0).rgb;
        if(radius>.45){
          float weight=1.;
          for(int i=0;i<32;i++){
            float t=(float(i)+.5)/32.;
            float a=float(i)*2.399963;
            vec2 uv=uv0+vec2(cos(a),sin(a))*sqrt(t)*pixel*radius;
            float w=(1.-.45*t)*(1.-smoothstep(.45,2.0,depth-distanceAt(uv)));
            c+=texture2D(frame,uv).rgb*w;weight+=w;
          }
          c/=weight;
        }
        c*=1.-.095*smoothstep(.28,.74,length(uv0-.5));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  })
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post))
  const observer=new ResizeObserver(()=>{
    const {width:w,height:h}=host.getBoundingClientRect();if(!w||!h)return
    const aspect=w/h,half=Math.max(7.25,4.7/aspect)
    cam.left=-half*aspect;cam.right=half*aspect;cam.top=half;cam.bottom=-half;cam.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(w,h,false)
    const size=renderer.getDrawingBufferSize(new T.Vector2())
    renderTarget.setSize(size.x,size.y);post.uniforms.pixel.value.set(1/size.x,1/size.y)
    post.uniforms.maxBlur.value=T.MathUtils.clamp(h*.012,5,12)*renderer.getPixelRatio()
  });observer.observe(host)
  const keys=new Set<string>(),allowed=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyR','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'])
  const events=new AbortController(),opt={signal:events.signal}
  const map=createMap(groundPrint,landmarks,events.signal,reset)
  map.visit(player.root.position.x,player.root.position.z)
  window.addEventListener('keydown',e=>{
    if(e.code==='KeyM'){e.preventDefault();if(!e.repeat)map.toggle();return}
    if(!map.dialog.open&&allowed.has(e.code)){e.preventDefault();keys.add(e.code)}
  },opt)
  window.addEventListener('keyup',e=>keys.delete(e.code),opt)
  renderer.domElement.addEventListener('wheel',e=>{
    e.preventDefault()
    const units=e.deltaMode===1?16:e.deltaMode===2?host.clientHeight:1
    manualZoom=T.MathUtils.clamp(manualZoom*Math.exp(-e.deltaY*units*.0014),.76,1.48)
  },{...opt,passive:false})
  const pad=document.querySelector<HTMLElement>('#pad')!,knob=pad.querySelector('b')!,stick=new T.Vector2()
  let pointer:number|null=null
  function drag(e:PointerEvent){
    if(e.pointerId!==pointer)return
    const r=pad.getBoundingClientRect()
    stick.set((e.clientX-r.left-r.width/2)/32,(e.clientY-r.top-r.height/2)/32).clampLength(0,1)
    knob.style.transform=`translate(${stick.x*31}px,${stick.y*31}px)`
  }
  function release(){pointer=null;stick.set(0,0);knob.style.transform=''}
  pad.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;pad.setPointerCapture(pointer);drag(e)},opt)
  pad.addEventListener('pointermove',drag,opt);pad.addEventListener('lostpointercapture',release,opt)
  function reset(){keys.clear();release()}
  window.addEventListener('blur',reset,opt);document.addEventListener('visibilitychange',reset,opt)
  let last=0,phase=0,blend=0
  const input=new T.Vector2(),facing=new T.Quaternion(),up=new T.Vector3(0,1,0)
  renderer.setAnimationLoop((ms:number)=>{
    const dt=Math.min(.05,(ms-last)/1000);last=ms
    if(map.dialog.open)return
    const pressed=(a:string,b:string)=>Number(keys.has(a)||keys.has(b))
    input.set(pressed('KeyD','ArrowRight')-pressed('KeyA','ArrowLeft')+stick.x,pressed('KeyS','ArrowDown')-pressed('KeyW','ArrowUp')+stick.y).clampLength(0,1)
    const screenX=input.x,screenZ=input.y
    input.set(screenX*Math.cos(yaw)+screenZ*Math.sin(yaw),-screenX*Math.sin(yaw)+screenZ*Math.cos(yaw))
    const pos=player.root.position,px=pos.x,pz=pos.z
    const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.5:2.7)
    if(passable(pos.x+input.x*step,pos.z))pos.x+=input.x*step
    if(passable(pos.x,pos.z+input.y*step))pos.z+=input.y*step
    const distance=Math.hypot(pos.x-px,pos.z-pz)
    if(distance>0)map.visit(pos.x,pos.z)
    pos.y=floorY(pos.x,pos.z);phase+=distance*7.3
    blend=T.MathUtils.damp(blend,distance>.0001?1:0,16,dt)
    if(input.lengthSq()>.001)player.root.quaternion.slerp(facing.setFromAxisAngle(up,Math.atan2(input.x,input.y)),1-Math.exp(-18*dt))
    for(let i=0;i<2;i++){
      const swing=Math.sin(phase+i*Math.PI)*blend
      player.legs[i].rotation.x=swing*.6;player.arms[i].rotation.x=-swing*.44
    }
    player.body.position.y=Math.abs(Math.cos(phase))*.044*blend
    shotTime+=dt
    const intro=reducedMotion.matches?0:1-T.MathUtils.smoothstep(shotTime,0,3.8)
    const bridgeShot=1-T.MathUtils.smoothstep(Math.hypot(pos.x,pos.z-1.6),1.2,6)
    const cottageShot=1-T.MathUtils.smoothstep(Math.hypot(pos.x+5.25,pos.z+5.08),2.5,7)
    const villageShot=T.MathUtils.smoothstep(-pos.z,-.5,6)
    const automaticYaw=reducedMotion.matches?0:.19*intro-.23*cottageShot+.12*villageShot
    manualYaw=T.MathUtils.clamp(manualYaw+(Number(keys.has('KeyE'))-Number(keys.has('KeyQ')))*dt*.65,-.46,.46)
    if(keys.has('KeyR')){manualYaw=0;manualZoom=1}
    yaw=T.MathUtils.damp(yaw,automaticYaw+manualYaw,3,dt)
    const shotZoom=reducedMotion.matches?1:1.03-.20*bridgeShot+.31*cottageShot+.12*villageShot-.23*intro
    const targetZoom=T.MathUtils.clamp(shotZoom*manualZoom,.72,1.85)
    cam.zoom=shotTime===dt?targetZoom:T.MathUtils.damp(cam.zoom,targetZoom,2.1,dt)
    cam.updateProjectionMatrix()
    offset.set(22.8*Math.sin(yaw),17.8,22.8*Math.cos(yaw))
    const lead=3.3/cam.zoom
    desired.set(pos.x-lead*Math.sin(yaw),pos.y*.45,pos.z-lead*Math.cos(yaw));focus.lerp(desired,1-Math.exp(-4.8*dt))
    cam.position.copy(focus).add(offset);cam.lookAt(focus)
    cam.updateMatrixWorld()
    desired.copy(pos);desired.y+=.8
    post.uniforms.focusDepth.value=-desired.applyMatrix4(cam.matrixWorldInverse).z
    updatePaper(pos.x,pos.z,dt)
    water.offset.x=(ms*.000011)%1
    renderer.setRenderTarget(renderTarget);renderer.render(scene,cam)
    renderer.setRenderTarget(null);renderer.render(postScene,postCam)
    host.dataset.ready='true';host.dataset.position=`${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)}`
  })
  window.addEventListener('pagehide',(e)=>{
    if(e.persisted)return
    renderer.setAnimationLoop(null);events.abort();observer.disconnect()
    const textures=new Set<T.Texture>(),mats=new Set<T.Material>(),geos=new Set<T.BufferGeometry>()
    for(const graph of [scene,postScene])graph.traverse(o=>{
      if(!(o instanceof T.Mesh))return
      geos.add(o.geometry);for(const m of [o.material].flat()){mats.add(m);if(m.map)textures.add(m.map)}
    })
    textures.forEach(t=>t.dispose());mats.forEach(m=>m.dispose());geos.forEach(g=>g.dispose())
    sun.shadow.dispose();renderTarget.dispose();renderer.dispose()
  },opt)
}
try{start()}catch(error){host.textContent='场景加载失败，请使用支持 WebGL 2 的浏览器刷新重试。';console.error(error)}



