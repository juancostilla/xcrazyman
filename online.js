/* Browser-hosted two-player versus. PeerJS handles signaling; game packets use WebRTC. */
'use strict';
const net={
 active:false,host:false,phase:'offline',players:[],readyFlags:[false,false],joined:false,slot:0,
 peer:null,conn:null,inputs:[{dir:null,bomb:false},{dir:null,bomb:false}],seq:0,lastSeen:0,
 timer:0,sendClock:0,beat:0,passwordKey:null,pending:null,attempts:[],generation:0,
 message(s){$('roomStatus').textContent=s},
 send(p){if(this.conn?.open)this.conn.send(p)},
 ui(){
 $('pause').disabled=this.active;
 $('roomIdentity').textContent=this.active?'Room code: '+this.code:'';
 $('roomPresence').textContent=this.active?'You: joined · Friend: '+(this.joined?'joined':'not joined'):'';
 $('roomReadyState').textContent=this.active?'You: '+(this.readyFlags[this.slot]?'READY':'not ready')+' · Friend: '+(this.joined?(this.readyFlags[1-this.slot]?'READY':'not ready'):'waiting to join'):'';
 $('readyRoom').disabled=!this.joined||!['lobby','result'].includes(this.phase);
 $('readyRoom').textContent=this.readyFlags[this.slot]?'Cancel ready':'I am ready';
 $('leaveRoom').hidden=!this.active;$('copyRoom').hidden=!this.active;
 $('roomForm').hidden=this.active;
 },
 async key(password,room){
 const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('xcrazyman/'+room),iterations:100000,hash:'SHA-256'},raw,{name:'HMAC',hash:'SHA-256',length:256},false,['sign','verify']);
 },
 async proof(key,nonce){return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(nonce)))).map(n=>n.toString(16).padStart(2,'0')).join('')},
 random(){return Array.from(crypto.getRandomValues(new Uint8Array(12))).map(n=>n.toString(16).padStart(2,'0')).join('')},
 load(){
 if(window.Peer)return Promise.resolve();
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';s.onload=()=>window.Peer?resolve():reject(Error('Connection library unavailable.'));s.onerror=()=>reject(Error('Cannot load online connection. Check your connection and try again.'));document.head.append(s)});
 },
 async enter(host){
 if(this.active)return;
 const password=$('roomPassword').value;
 let code=$('roomCode').value.trim().toLowerCase();
 if(password.length<6){this.message('Use a room password of at least 6 characters.');return}
 if(!host&&!/^[a-f0-9]{24}$/.test(code)){this.message('Paste the room code or open your friend’s invite link.');return}
 this.active=true;this.host=host;this.slot=host?0:1;this.phase='connecting';this.joined=false;this.readyFlags=[false,false];this.code=host?this.random():code;
 const generation=++this.generation;
 this.ui();this.message('Connecting…');state='lobby';keys=[];$('overlay').hidden=true;
 try{
 await this.load();this.passwordKey=await this.key(password,this.code);
 if(generation!==this.generation)return;
 $('roomPassword').value='';$('roomCode').value=this.code;
 this.peer=host?new Peer('xcrazyman-'+this.code):new Peer();
 this.connectTimeout=setTimeout(()=>{if(this.phase==='connecting')this.fail('Connection timed out. Try another network or create a new room.')},20000);
 this.peer.on('open',()=>{
 if(generation!==this.generation)return;
 if(host){clearTimeout(this.connectTimeout);this.phase='lobby';this.message('Room created. Share the invite and password separately. Waiting for your friend.');this.ui()}
 else this.wire(this.peer.connect('xcrazyman-'+this.code,{reliable:true}));
 });
 this.peer.on('connection',c=>{if(this.host)this.accept(c);else c.close()});
 this.peer.on('error',e=>{if(generation===this.generation)this.fail(e.type==='peer-unavailable'?'Room not found. Ask your friend to keep their room open.':'Connection problem: '+e.type+'. Try creating or joining again.')});
 }catch(e){if(generation===this.generation)this.fail(e.message)}
 },
 accept(c){
 const now=Date.now();this.attempts=this.attempts.filter(t=>now-t<60000);
 if(this.joined||this.pending||this.phase!=='lobby'||this.attempts.length>=8){c.on('open',()=>{c.send({type:'reject',message:'Room is full, busy, or temporarily locked. Try again in a minute.'});setTimeout(()=>c.close(),250)});return}
 this.attempts.push(now);this.pending=c;
 const nonce=this.random();let done=false;
 const timeout=setTimeout(()=>{if(!done){c.close();if(this.pending===c)this.pending=null}},10000);
 c.on('open',()=>c.send({type:'challenge',nonce}));
 c.on('close',()=>{clearTimeout(timeout);if(this.pending===c)this.pending=null});
 c.on('data',async packet=>{
 if(done||packet?.type!=='auth')return;done=true;
 const expected=await this.proof(this.passwordKey,nonce);
 clearTimeout(timeout);
 if(packet.proof!==expected){c.send({type:'reject',message:'Incorrect room password.'});setTimeout(()=>c.close(),250);if(this.pending===c)this.pending=null;return}
 if(this.pending!==c||!this.active||this.joined){c.close();return}
 this.pending=null;this.conn=c;this.joined=true;this.readyFlags=[false,false];this.wire(c,true);c.send({type:'accepted'});this.broadcastLobby();
 });
 },
 wire(c,authenticated=false){
 this.conn=c;
 c.on('data',async p=>{
 if(!p||typeof p.type!=='string')return;
 if(!this.host&&!this.joined){
 if(p.type==='challenge'&&typeof p.nonce==='string'&&p.nonce.length===24)c.send({type:'auth',proof:await this.proof(this.passwordKey,p.nonce)});
 else if(p.type==='reject')this.fail(p.message);
 else if(p.type==='accepted'){clearTimeout(this.connectTimeout);this.joined=true;this.phase='lobby';this.lastSeen=Date.now();this.message('Friend joined. Both players must be ready.');this.ui()}
 return;
 }
 this.lastSeen=Date.now();
 if(this.host){
 if(p.type==='ready'&&['lobby','result'].includes(this.phase)){this.readyFlags[1]=p.value===true;this.broadcastLobby();this.maybeStart()}
 if(p.type==='input'&&this.phase==='match'){this.inputs[1].dir=Number.isInteger(p.dir)&&p.dir>=0&&p.dir<4?p.dir:null;if(p.bomb===true)this.inputs[1].bomb=true}
 }else{
 if(p.type==='lobby'){this.readyFlags=p.ready;this.phase=p.phase;this.ui();this.message('Friend joined. Both players must be ready.')}
 if(p.type==='snapshot')this.receive(p);
 }
 });
 c.on('close',()=>{if(this.active&&this.conn===c)this.fail('Your friend disconnected. The match has stopped. Create or join a new room.')});
 c.on('error',()=>{if(this.active)this.fail('Connection lost. Create or join a new room.')});
 if(authenticated){this.lastSeen=Date.now();this.message('Friend joined! Waiting for both players to be ready.');this.ui()}
 },
 broadcastLobby(){this.send({type:'lobby',ready:this.readyFlags,phase:this.phase});this.ui()},
 ready(){
 if(!this.joined||!['lobby','result'].includes(this.phase))return;
 this.readyFlags[this.slot]=!this.readyFlags[this.slot];
 if(this.host){this.broadcastLobby();this.maybeStart()}else this.send({type:'ready',value:this.readyFlags[1]});
 this.ui();
 },
 maybeStart(){
 if(!this.joined||!this.readyFlags.every(Boolean)||!['lobby','result'].includes(this.phase))return;
 sector=1;score=0;setup();
 this.players=[{...player,id:0,alive:true,cool:0},{x:11,y:9,capacity:1,range:2,speed:.105,id:1,alive:true,cool:0}];
 bots=[{x:11,y:1,cool:1,dir:2}];board[1][11]=0;
 this.players.forEach(p=>{board[p.y][p.x]=0;for(const [dx,dy]of dirs)if(board[p.y+dy]?.[p.x+dx]===2)board[p.y+dy][p.x+dx]=0});
 this.inputs=[{dir:null,bomb:false},{dir:null,bomb:false}];keys=[];this.phase='countdown';this.timer=3;this.readyFlags=[true,true];this.winner=null;
 player=this.players[0];state='playing';this.seq++;this.ui();this.snapshot();
 },
 input(dir,bomb=false){if(this.phase!=='match')return;if(bomb)this.inputs[this.slot].bomb=true;else this.inputs[this.slot].dir=dir;if(!this.host){this.send({type:'input',dir:this.inputs[1].dir,bomb});this.inputs[1].bomb=false}},
 simulate(dt){
 clock+=dt;animateEnemyDeaths(dt);flames=flames.filter(f=>(f.ttl-=dt)>0);
 for(const b of [...bombs]){b.fuse-=dt;if(b.fuse<=0)explode(b)}
 const deadBots=bots.filter(b=>danger(b.x,b.y));deadBots.forEach(enemyDeath);bots=bots.filter(b=>!deadBots.includes(b));
 const check=()=>this.players.forEach(p=>{if(p.alive&&(danger(p.x,p.y)||bots.some(b=>same(b,p)))){p.alive=false;enemyDeath(p)}});
 check();
 for(const p of this.players){
 p.cool=Math.max(0,p.cool-dt);
 if(p.snack){p.snack.time+=dt;if(p.snack.time>.85)p.snack=null}
 if(!p.alive)continue;
 player=p;snack=p.snack||null;
 const input=this.inputs[p.id];
 if(input.dir!==null&&p.cool<=0){
 const [dx,dy]=dirs[input.dir],x=p.x+dx,y=p.y+dy;
 if(!this.players.some(other=>other!==p&&other.alive&&other.x===x&&other.y===y))move(input.dir);
 p.cool=p.speed;p.snack=snack;
 }
 if(input.bomb&&bombs.filter(b=>b.owner===p.id).length<p.capacity&&!bombs.some(b=>same(b,p))){bombs.push({x:p.x,y:p.y,range:p.range,fuse:2,owner:p.id});sound(180)}
 input.bomb=false;updateTrappedReaction();
 }
 for(const b of bots){
 b.cool-=dt;if(b.cool>0)continue;b.cool=.38+Math.random()*.1;
 let choices=dirs.map(([dx,dy],d)=>({x:b.x+dx,y:b.y+dy,d})).filter(p=>open(p.x,p.y)&&!danger(p.x,p.y));
 const safe=choices.filter(p=>!botThreat(p.x,p.y));if(safe.length)choices=safe;
 const target=this.players.filter(p=>p.alive).sort((a,c)=>(Math.abs(a.x-b.x)+Math.abs(a.y-b.y))-(Math.abs(c.x-b.x)+Math.abs(c.y-b.y)))[0];
 if(target&&choices.length){choices.sort((a,c)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y))-(Math.abs(c.x-target.x)+Math.abs(c.y-target.y)));const next=Math.random()<.5?choices[0]:choices[rnd(choices.length)];glide(b,next.x,next.y,b.cool);b.dir=next.d}
 }
 check();player=this.players[0];snack=player.snack||null;
 if(this.players.filter(p=>p.alive).length<2){this.winner=this.players[0].alive?0:this.players[1].alive?1:null;this.phase='ending';this.timer=1.5;this.inputs.forEach(i=>{i.dir=null;i.bomb=false})}
 },
 snapshot(){this.send({type:'snapshot',seq:this.seq,phase:this.phase,timer:this.timer,winner:this.winner,ready:this.readyFlags,board,bombs,flames,drops,bots,players:this.players,enemyDeaths,clock})},
 receive(p){
 if(!Array.isArray(p.players)||p.players.length!==2||!Array.isArray(p.board)||p.board.length!==H)return;
 if(p.seq!==this.seq){keys=[];this.seq=p.seq}
 const previous=this.players;
 this.players=p.players.map((a,i)=>{const old=previous[i];if(old&&this.phase==='match'){a.visualX=old.visualX??old.x;a.visualY=old.visualY??old.y;a.fromX=a.visualX;a.fromY=a.visualY;a.travel=0;a.duration=.05}return a});
 this.readyFlags=p.ready||this.readyFlags;this.phase=p.phase;this.timer=p.timer;this.winner=p.winner;board=p.board;bombs=p.bombs;flames=p.flames;drops=p.drops;bots=p.bots;enemyDeaths=p.enemyDeaths;clock=p.clock;
 player=this.players[1];snack=player.snack||null;state='playing';this.ui();
 },
 frame(dt){
 this.beat+=dt;
 if(this.joined&&this.beat>.5){this.beat=0;this.send({type:'ping'});if(Date.now()-this.lastSeen>15000){this.fail('Connection interrupted. Match stopped; please rejoin.');return}}
 if(this.host){
 if(this.phase==='countdown'){this.timer-=dt;if(this.timer<=0)this.phase='match'}
 else if(this.phase==='match')this.simulate(dt);
 else if(this.phase==='ending'){animateEnemyDeaths(dt);this.timer-=dt;if(this.timer<=0){this.phase='result';this.readyFlags=[false,false];this.broadcastLobby()}}
 this.sendClock+=dt;if(this.joined&&this.sendClock>=.04&&this.players.length){this.sendClock=0;this.snapshot()}
 }
 if(this.players.length){player=this.players[this.slot];snack=player.snack||null;for(const p of this.players){animateEyes(p,dt);animateActor(p,dt)}for(const b of bots){animateEyes(b,dt);animateActor(b,dt)}updateHud()}
 if(this.phase==='countdown'){overlay('Ready… '+Math.max(1,Math.ceil(this.timer)),'Two players. One bot. Last player standing wins.','Both players ready','VERSUS');$('play').disabled=true}
 else if(this.phase==='result'){this.message('Match complete. Both players must be ready for a rematch.');const label=this.winner===null?'A spectacular draw!':this.winner===this.slot?'You win!':'Your friend wins!';overlay(label,'Choose Ready in the lobby for a rematch. Both players must agree.','Ready for rematch','MATCH COMPLETE');$('play').disabled=false}
 else {$('overlay').hidden=true;$('play').disabled=false}
 if(this.phase==='match'){$('status').textContent='YOU ARE PLAYER '+(this.slot+1)+' · LAST PLAYER STANDING WINS';this.message('Match in progress. Keep the host’s tab open.')}
 draw();
 },
 drawOther(actor){
 if(this.players.length!==2)return;
 const current=player,savedSnack=snack,other=this.players[1-this.slot];player=other;snack=other.snack||null;
 if(other.alive)actor(other,true);player=current;snack=savedSnack;
 },
 fail(message){this.leave();this.message(message)},
 leave(){
 this.active=false;this.generation++;clearTimeout(this.connectTimeout);this.pending?.close();this.pending=null;this.conn?.close();this.peer?.destroy();this.conn=null;this.peer=null;this.passwordKey=null;this.players=[];this.joined=false;this.phase='offline';this.readyFlags=[false,false];this.inputs=[{dir:null,bomb:false},{dir:null,bomb:false}];this.ui();state='ready';setup();$('play').disabled=false;overlay('Small fuse. Big energy.','Play solo or create a new room.','Play solo →','WELCOME BACK');this.message('Room closed.')
 }
};
window.net=net;
$('createRoom').onclick=()=>net.enter(true);$('joinRoom').onclick=()=>net.enter(false);$('readyRoom').onclick=()=>net.ready();$('leaveRoom').onclick=()=>net.leave();
$('copyRoom').onclick=async()=>{const url=new URL(location.href);url.hash='room='+net.code;try{await navigator.clipboard.writeText(url.href);net.message('Invite copied. Send your room password separately.')}catch{net.message('Invite: '+url.href)}};
const invite=new URLSearchParams(location.hash.slice(1)).get('room');if(invite&&/^[a-f0-9]{24}$/.test(invite)){$('roomCode').value=invite;$('roomPanel').open=true;net.message('Invite received. Enter the room password, then Join room.')}
net.ui();
