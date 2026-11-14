// Render the original eight-bar loop: node compose.cjs <output.wav>
const fs = require('node:fs');
const rate = 24000, beat = 60 / 76, frames = Math.round(32 * beat * rate);
const channels = [new Float32Array(frames), new Float32Array(frames)];
const chords = [[50,57,60,64,65],[43,55,59,62,69],[48,55,59,62,64],[45,55,60,64,67]];
const melody = [[69,67,64],[71,69,67],[67,64,62],[64,60,62],[69,72,76],[74,71,69],[67,71,69],[67,64,62]];
function note(at, midi, seconds, voice, volume, pan) {
  const f = 440 * 2 ** ((midi-69)/12), first = Math.round(at*beat*rate);
  for(let i=0;i<seconds*rate;i++){
    const t=i/rate, phase=2*Math.PI*f*t;
    const pad=voice==='pad', bass=voice==='bass';
    const attack=pad?.5:bass?.08:.018, release=pad?.68:.26;
    const env=(1-Math.exp(-t/attack))*Math.min(1,(seconds-t)/release)**2;
    const wave=pad ? (Math.sin(phase)+.38*Math.sin(phase*1.0016)+.16*Math.sin(2*phase))/1.54 :
      bass ? Math.sin(phase)+.12*Math.sin(phase*2) :
      Math.sin(phase+.65*Math.exp(-3*t)*Math.sin(phase*2))+.18*Math.exp(-2*t)*Math.sin(3*phase);
    const value=volume*env*wave*Math.exp(-t*(pad?.16:bass?.62:1.65));
    const j=(first+i)%frames;
    channels[0][j]+=value*Math.sqrt((1-pan)/2);
    channels[1][j]+=value*Math.sqrt((1+pan)/2);
  }
}
for(let bar=0;bar<8;bar++){
  const chord=chords[bar%4], start=bar*4;
  note(start,chord[0],2.8,'bass',.13,0);
  chord.slice(1).forEach((n,i)=>note(start+i*.055,n,3.35,'pad',.043,(i-1.5)*.28));
  melody[bar].forEach((n,i)=>{
    const at=start+[.55,2.05,3.35][i];
    note(at,n,1.8,'keys',.105,-.14);note(at+.48,n,1.5,'keys',.024,.56);
  });
}
const out=Buffer.alloc(44+frames*4);
out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);
out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*4,28);
out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(frames*4,40);
for(let i=0;i<frames;i++)for(let c=0;c<2;c++)out.writeInt16LE(Math.round(channels[c][i]*32767),44+4*i+2*c);
fs.writeFileSync(process.argv[2],out);
