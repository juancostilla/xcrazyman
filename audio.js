'use strict';
// Original synthesized music and cartoon effects; no downloads or recorded voices.
window.gameAudio={
 ctx:null,master:null,music:null,next:0,step:0,loop:null,lastBoom:-10,lastLaugh:-10,
 unlock(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.65;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.gain.value=.32;this.music.connect(this.master);this.loop=setInterval(()=>this.schedule(),25)}this.ctx.resume();this.mute(muted)}catch{}},
 mute(off){if(this.ctx){this.master.gain.setTargetAtTime(off?0:.65,this.ctx.currentTime,.015);if(off)this.next=0}},
 tone(freq,time,duration,type='triangle',volume=.08,bus=this.master,end=freq){
 const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(Math.max(25,end),time+duration);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.02);
 },
 noise(time,duration,volume,cutoff){
 const c=this.ctx,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.setValueAtTime(cutoff,time);f.frequency.exponentialRampToValueAtTime(100,time+duration);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(time);s.stop(time+duration);
 },
 voice(freq,time,duration,end,volume=.13){
 const c=this.ctx,o=c.createOscillator(),filter=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(freq,time);
 for(let i=1;i<=12;i++){const p=i/12;o.frequency.linearRampToValueAtTime(freq+(end-freq)*p+Math.sin(i*2.4)*freq*.06,time+duration*p)}
 filter.type='bandpass';filter.frequency.value=950;filter.Q.value=.8;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.02);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(filter);filter.connect(g);g.connect(this.master);o.start(time);o.stop(time+duration+.02);
 },
 effect(kind){
 if(!this.ctx||muted||this.ctx.state!=='running')return;const t=this.ctx.currentTime;
 if(kind==='boom'){if(t-this.lastBoom<.06)return;this.lastBoom=t;this.noise(t,.24,.3,3200);this.tone(145,t,.24,'sine',.35,this.master,35);this.tone(420,t,.065,'triangle',.07,this.master,85)}
 if(kind==='laugh'){if(t-this.lastLaugh<.5)return;this.lastLaugh=t;[420,350,470].forEach((f,i)=>this.voice(f,t+i*.14,.12,f*.72,.17))}
 if(kind==='scream'){this.voice(480,t,.65,1150,.22);this.voice(1050,t+.6,.19,160,.15)}
 },
 schedule(){
 if(!this.ctx)return;
 const active=window.net?.active?['match','countdown','ending'].includes(window.net.phase):['playing','celebrating'].includes(state);
 const playing=active&&!muted&&!document.hidden;
 this.music.gain.setTargetAtTime(playing?.32:0,this.ctx.currentTime,.06);
 if(!playing||this.ctx.state!=='running'){this.next=0;return}
 const now=this.ctx.currentTime;if(this.next<now)this.next=now+.02;
 // 112 BPM, four-bar melody, alternating bass and a light drum groove.
 const melody=[76,79,83,79,74,78,81,78,72,76,79,76,74,78,81,83,76,79,83,86,74,78,81,78,72,76,79,83,74,78,76,71];
 const bass=[52,50,48,50];const beat=60/112/2;
 while(this.next<now+.12){const i=this.step%32,t=this.next;
 this.tone(440*2**((melody[i]-69)/12),t,beat*.72,'triangle',.1,this.music);
 if(i%2===0){this.tone(440*2**((bass[Math.floor(i/8)]-69)/12),t,beat*1.6,'triangle',.13,this.music);this.tone(85,t,.1,'sine',.12,this.music,38)}
 if(i%4===2)this.tone(180,t,.05,'square',.025,this.music,80);
 this.next+=beat;this.step++;
 }
 }
};
document.addEventListener('visibilitychange',()=>window.gameAudio.schedule());
