# Script de sound design (Python + numpy/scipy + imageio-ffmpeg) qui a fabriqué les sons de src/assets/sfx
# à partir des packs CC0 listés dans le README. Les chemins /tmp/... pointent vers les packs téléchargés.
import numpy as np, subprocess, os, sys
from scipy import signal
sys.path.insert(0,'/tmp'); from an import load as _load
FF=__import__('imageio_ffmpeg').get_ffmpeg_exe()
SR=44100; S='/tmp/snd/'; F='/tmp/fs/'; RP=S+'rpg_sound_pack/RPG Sound Pack/'; KI=S+'kenney_impact-sounds/Audio/'; KS=S+'kenney_sci-fi-sounds/Audio/'; R8=S+'80-CC0-RPG-SFX_0/'; C1=S+'100-CC0-SFX_0/'; KU=S+'ki/Audio/'
rng=np.random.default_rng(3)
def L(fn,start=None,dur=None,auto=True):
    m=_load(fn).mean(1).astype(np.float64)
    if auto and start is None:
        pk=np.abs(m).max()+1e-9; i=np.argmax(np.abs(m)>pk*0.03); start=max(0,i/SR-0.005)
    s=int((start or 0)*SR); m=m[s:]
    if dur: m=m[:int(dur*SR)]
    pk=np.abs(m).max()+1e-9
    return m/pk
def pitch(x,r):  # r>1 higher & shorter
    n=int(len(x)/r); return signal.resample(x,n) if n>0 else x
def lp(x,f,o=4): b,a=signal.butter(o,f/(SR/2)); return signal.lfilter(b,a,x)
def hp(x,f,o=2): b,a=signal.butter(o,f/(SR/2),'high'); return signal.lfilter(b,a,x)
def fade(x,fi=0.003,fo=0.05):
    x=x.copy(); a=int(fi*SR); b=int(fo*SR)
    if a: x[:a]*=np.linspace(0,1,a)
    if b and b<len(x): x[-b:]*=np.linspace(1,0,b)**2
    return x
def db(d): return 10**(d/20)
def mix(*parts):  # (signal, offset_s, gain_db)
    n=max(int(o*SR)+len(s) for s,o,g in parts); out=np.zeros(n)
    for s,o,g in parts: i=int(o*SR); out[i:i+len(s)]+=s*db(g)
    return out
def sub(f0=55,dur=0.35,drop=0.5,click=True):
    t=np.arange(int(dur*SR))/SR; f=f0*(1+drop*np.exp(-t*25)); ph=2*np.pi*np.cumsum(f)/SR
    x=np.sin(ph)*np.exp(-t*(4.5/dur))
    if click: x[:200]+=np.random.default_rng(1).normal(0,0.6,200)*np.linspace(1,0,200)
    return x
def noise(dur): return rng.normal(0,1,int(dur*SR))
def reverb(x,t=1.2,wet=0.25,bright=6000):
    n=int(t*SR); ir=noise(t)*np.exp(-np.arange(n)/SR*(6.9/t)); ir=lp(ir,bright,2); ir/=np.sqrt((ir**2).sum())
    w=signal.fftconvolve(x,ir)[:len(x)+n]; y=np.zeros(len(w)); y[:len(x)]=x
    return y*(1-wet)+w*wet*1.6
def limit(x,drive=1.4): return np.tanh(x*drive)/np.tanh(drive)
def trim_tail(x,thr=-55):
    e=np.abs(x)>db(thr)*np.abs(x).max(); idx=np.where(e)[0]
    return x[:idx[-1]+1] if len(idx) else x
def save(name,x,peak=-1.0,q=4,fo=0.04):
    x=trim_tail(np.asarray(x,dtype=np.float64)); x=fade(x,0.001,fo); x=x/(np.abs(x).max()+1e-9)*db(peak)
    raw=x.astype(np.float32).tobytes()
    out=f'/tmp/sfxout/{name}.ogg'
    subprocess.run([FF,'-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','libvorbis','-q:a',str(q),out],input=raw,check=True)
    print(name, round(len(x)/SR,2),'s', os.path.getsize(out)//1024,'KB')

if __name__=='__main__':
    # ---------- coups de lame / mouvements ----------
    save('swing_l1', L(F+'whoosh_light_0.mp3'))
    save('swing_l2', L(F+'whoosh_light_4.mp3'))
    save('swing_l3', mix((pitch(L(RP+'battle/swing2.wav'),1.05),0,0),(pitch(L(F+'whoosh_light_2.mp3'),1.1),0,-6)))
    save('swing_h1', lp(mix((pitch(L(F+'whoosh_heavy_0.mp3'),0.8),0,0),(pitch(L(RP+'battle/swing.wav'),0.7),0.03,-4)),7000))
    save('swing_h2', lp(pitch(L(F+'whoosh_heavy_3.mp3'),0.8),7000))
    for i,(p,b) in enumerate([('000','01'),('001','02'),('002','03')]):
        save(f'hit_{i+1}', limit(mix((L(KI+f'impactPunch_medium_{p}.ogg'),0,0),(lp(L(R8+f'blade_{b}.ogg'),9000),0,-7),(sub(95,0.15,0.6,False),0,-6)),1.3))
    for i,p in enumerate(['000','001']):
        save(f'hit_heavy_{i+1}', reverb(limit(mix((L(KI+f'impactPunch_heavy_{p}.ogg'),0,0),(sub(55,0.4),0,-2),(L(C1+f'slam_0{i+1}.ogg'),0,-9)),1.6),0.6,0.15))
    save('crit', reverb(limit(mix((L(KI+'impactPunch_heavy_002.ogg'),0,0),(lp(L(S+'sword_clash_-_starninjas_0/sword_clash.2.ogg'),8000),0,-5),(sub(50,0.5),0,-1)),1.8),0.9,0.2))
    save('block', mix((L(F+'shield_block_0.mp3'),0,0),(L(KI+'impactMetal_heavy_000.ogg'),0,-5)))
    # ---------- arc ----------
    save('bow_1', L(F+'bow_0.mp3',dur=0.6))
    save('bow_2', mix((pitch(L(F+'bow_0.mp3',dur=0.6),1.08),0,0),(L(F+'arrow_whoosh_0.mp3'),0.04,-4)))
    save('arrow_hit_1', mix((L(F+'bow2_0.mp3'),0,0),(L(KI+'impactPunch_medium_003.ogg'),0,-6)))
    save('arrow_hit_2', mix((pitch(L(F+'bow2_0.mp3'),0.9),0,0),(L(KI+'impactPunch_medium_004.ogg'),0,-5)))
    # ---------- magie ----------
    save('orb_cast', lp(pitch(L(F+'dark_magic_1.mp3',dur=1.0),0.85),9000))
    save('orb_hit', mix((L(F+'magic_impact_3.mp3',dur=1.2),0,0),(pitch(L(KS+'forceField_000.ogg'),0.7),0,-6),(sub(70,0.25,0.4,False),0,-8)))
    save('light_cast', mix((pitch(L(RP+'battle/magic1.wav'),1.2),0,0),(L(S+'magical_3.ogg'),0,-7)))
    save('heal', mix((L(F+'heal_0.mp3'),0,0),(L(S+'magical_2.ogg'),0.05,-5)))
    save('shield_up', mix((L(F+'shield_magic_1.mp3'),0,0),(pitch(L(KS+'forceField_001.ogg'),0.6),0,-3),(sub(60,0.5,0.2,False),0,-8)))
    save('blink', L(F+'teleport_0.mp3'))
    save('summon', reverb(mix((pitch(L(F+'dark_magic_5.mp3'),0.75),0,0),(L(F+'bones2_0.mp3'),0.25,-3),(sub(40,1.0,0.1,False),0,-6)),1.4,0.25))
    t=np.arange(int(1.8*SR))/SR; swarm=lp(hp(noise(1.8),900),5000)*(0.6+0.4*np.sin(2*np.pi*13*t))*np.minimum(1,t*4)*np.exp(-t*1.2)
    save('plague', reverb(mix((pitch(L(RP+'battle/spell.wav'),0.6),0,0),(pitch(L(F+'dark_magic_5.mp3'),0.6),0,-3),(swarm/np.abs(swarm).max(),0.05,-6)),1.5,0.3))
    save('fire_burst', reverb(limit(mix((L(F+'explosion_1.mp3'),0,0),(L(R8+'spell_fire_03.ogg'),0,-4),(sub(45,1.0,0.6),0,0)),1.5),1.6,0.2))
    save('explosion', limit(mix((L(F+'explosion_2.mp3'),0,0),(sub(40,0.9),0,-3)),1.3))
    save('land', reverb(limit(mix((L(KS+'lowFrequency_explosion_000.ogg'),0,0),(L(F+'thunder_hit_0.mp3'),0,-3),(L(KS+'explosionCrunch_002.ogg'),0,-6)),1.5),1.2,0.2))
    # ---------- cinématique d'ultime ----------
    save('ult_impact', L(F+'cine_impact_0.mp3',dur=3.2),fo=0.8)
    save('braam', L(F+'braam_2.mp3'),fo=0.3)
    save('riser', L(F+'riser_0.mp3'))
    save('cutin', L(F+'riser_2.mp3'))
    save('choir', L(F+'choir_0.mp3',start=2.0),fo=0.5)
    # pluie de flèches : salve de sifflements
    parts=[]
    for k in range(12):
        parts.append((pitch(L(F+'arrow_whoosh_0.mp3'),rng.uniform(0.8,1.25)),rng.uniform(0,0.9),rng.uniform(-8,-2)))
    for k in range(6):
        parts.append((pitch(L(F+'bow2_0.mp3'),rng.uniform(0.85,1.15)),rng.uniform(0.35,1.2),rng.uniform(-9,-4)))
    save('arrow_rain', reverb(mix(*parts),0.8,0.2))
    save('stun', pitch(L(C1+'bell_01.ogg',dur=0.9),1.5))
    save('ult_ready', L(S+'magical_1_0.ogg'),q=3)
    # ---------- ennemis ----------
    save('ghoul_atk', L(F+'growl2_0.mp3'))
    save('ghoul_die', L(R8+'creature_die_01.ogg'))
    save('skel_atk', L(F+'bones2_3.mp3'))
    save('skel_die', L(F+'bones2_0.mp3'))
    save('boss_roar', L(F+'roar_0.mp3',dur=2.4),fo=0.5)
    save('boss_windup', pitch(L(RP+'NPC/giant/giant1.wav'),0.9))
    save('boss_slam', reverb(limit(mix((L(KI+'impactPunch_heavy_003.ogg'),0,0),(L(KS+'lowFrequency_explosion_001.ogg'),0,-1),(L(C1+'slam_03.ogg'),0,-6)),1.6),1.0,0.2))
    save('boss_die', reverb(mix((pitch(L(F+'roar_2.mp3'),0.8),0,0),(L(F+'explosion_3.mp3'),0.4,-3)),1.5,0.25),fo=0.6)
    save('hero_down', mix((L(F+'thunder_hit_0.mp3'),0,0),(sub(48,0.8,0.2,False),0,-5)))
    save('defeat', pitch(L(F+'braam_1.mp3',dur=3.6),0.85),fo=1.0)
    # ---------- interface ----------
    save('ui_click', L(KU+'click_002.ogg'),q=3)
    save('ui_hover', L(KU+'tick_001.ogg'),peak=-6,q=3)
    save('ui_open', L(KU+'maximize_006.ogg'),q=3)
    save('ui_close', L(KU+'minimize_006.ogg'),q=3)
    save('ui_confirm', L(KU+'confirmation_002.ogg'),q=3)
    save('coins', L(R8+'item_coins_01.ogg'),q=3)
    save('star', L(R8+'item_gem_01.ogg'),q=3)
