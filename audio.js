'use strict';
// Sample-based audio. Sources, licenses and editing notes: audio-credits.html.
(() => {
 const musicDownload=Promise.all(Array.from({length:7},(_,i)=>fetch(`assets/audio/metalmania.${i}.part`).then(r=>{if(!r.ok)throw Error('music');return r.arrayBuffer()}))).then(parts=>URL.createObjectURL(new Blob(parts,{type:'audio/mpeg'}))).catch(()=>null);
 const files={boom:'explosion',boom2:'explosion2',boom3:'explosion3',boom4:'explosion4',boom5:'explosion5',drop:'drop',laugh:'laugh',scream:'scream'};
 const downloads=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,
  fetch(`assets/audio/${file}.mp3`).then(r=>{if(!r.ok)throw Error(file);return r.arrayBuffer()}).catch(()=>null)
 ]));
 window.gameAudio={
  ctx:null,master:null,music:null,track:null,buffers:{},last:{},lastExplosion:null,sources:new Set(),duckUntil:0,blocked:false,
  unlock(){
   try{
    if(!this.ctx){
     const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();
     this.master=c.createGain();this.master.gain.value=muted?0:.8;
     const limiter=c.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.2;
     this.master.connect(limiter);limiter.connect(c.destination);
     this.music=c.createGain();this.music.gain.value=0;this.music.connect(this.master);
     this.track=new Audio();musicDownload.then(url=>{if(url){this.track.src=url;this.schedule()}else this.report('Music could not load. Refresh to retry.')});this.track.loop=true;this.track.preload='auto';
     this.track.addEventListener('error',()=>this.report('Music could not load. Refresh to retry.'));
     c.createMediaElementSource(this.track).connect(this.music);
     this.ready=Promise.all(Object.entries(downloads).map(async([key,promise])=>{
      try{const data=await promise;if(!data)throw Error(key);this.buffers[key]=await c.decodeAudioData(data)}
      catch{this.report('Some sound effects could not load. Refresh to retry.')}
     }));
     this.loop=setInterval(()=>this.schedule(),50);
    }
    this.ctx.resume().catch(()=>{});this.blocked=false;
    // Start within the gesture, silently until the game enters an active phase.
    if(!muted)this.playMusic();
    this.mute(muted);
   }catch{this.report('Audio is unavailable in this browser.')}
  },
  report(message){const button=document.getElementById('sound');if(button)button.title=message},
  playMusic(){
   if(!this.track.src||this.pending||this.blocked||!this.track.paused)return;
   this.pending=true;
   this.track.play().catch(e=>{if(e.name!=='AbortError'){this.blocked=true;this.report('Click Sound to enable audio.')}}).finally(()=>{this.pending=false});
  },
  mute(off){
   if(!this.ctx)return;
   this.master.gain.setTargetAtTime(off?0:.8,this.ctx.currentTime,.015);
   if(off){this.track.pause();this.stopEffects()}
  },
  stopEffects(){for(const source of this.sources){try{source.stop()}catch{}}this.sources.clear()},
  effect(kind){
   if(!this.ctx||muted||document.hidden||this.ctx.state!=='running')return;
   const cue=kind==='cue',key=cue?'drop':kind;
   let sampleKey=key;
   if(key==='boom'){
    const available=['boom','boom2','boom3','boom4','boom5'].filter(k=>this.buffers[k]);
    const choices=available.filter(k=>k!==this.lastExplosion);
    const pool=choices.length?choices:available;
    sampleKey=pool[Math.floor(Math.random()*pool.length)];
   }
   const buffer=this.buffers[sampleKey];if(!buffer)return;
   const now=this.ctx.currentTime,cooldown={boom:.08,drop:.055,laugh:1.2,scream:.8,cue:.12}[kind]??.1;
   if(now-(this.last[kind]??-99)<cooldown||this.sources.size>=12)return;
   this.last[kind]=now;
   if(key==='boom')this.lastExplosion=sampleKey;
   const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
   source.playbackRate.value=key==='boom'?.96+Math.random()*.08:key==='drop'?.92+Math.random()*.16:1;
   gain.gain.value=cue?.18:{boom:1,drop:.65,laugh:.85,scream:.85}[key];
   source.connect(gain);gain.connect(this.master);this.sources.add(source);
   source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect()};source.start();
   if(['boom','laugh','scream'].includes(key))this.duckUntil=Math.max(this.duckUntil,now+(key==='boom'?.65:buffer.duration));
   this.schedule();
  },
  schedule(){
   if(!this.ctx)return;
   const active=window.net?.active?['match','countdown','ending'].includes(window.net.phase):['playing','celebrating','dying'].includes(state);
   const playing=active&&!muted&&!document.hidden;
   const volume=playing?(this.ctx.currentTime<this.duckUntil?.12:.3):0;
   this.music.gain.setTargetAtTime(volume,this.ctx.currentTime,volume<.3?.035:.25);
   if(playing)this.playMusic();else this.track.pause();
   if(document.hidden)this.stopEffects();
  }
 };
 document.addEventListener('visibilitychange',()=>window.gameAudio.schedule());
})();
