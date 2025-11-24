
// Advanced Web Audio API Synthesizer for RPG
// Features: Noise buffers for SFX, Melodic Sequencer for BGM

let audioCtx: AudioContext | null = null;
let bgmNodes: AudioNode[] = [];
let nextNoteTime = 0;
let timerID: number | null = null;
let isPlayingBgm = false;
let noiseBuffer: AudioBuffer | null = null;

// --- MELODY DATA (Adventurous Theme) ---
const TEMPO = 140;
const SECONDS_PER_BEAT = 60.0 / TEMPO;

// Pitch Mapping
const C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88;
const C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00, B5=987.77;

const MELODY = [
  // Part A
  { note: C4, dur: 0.5 }, { note: E4, dur: 0.5 }, { note: G4, dur: 0.5 }, { note: C5, dur: 1.0 },
  { note: G4, dur: 0.5 }, { note: E4, dur: 0.5 }, { note: C4, dur: 0.5 },
  { note: F4, dur: 0.5 }, { note: A4, dur: 0.5 }, { note: C5, dur: 0.5 }, { note: F5, dur: 1.0 },
  { note: C5, dur: 0.5 }, { note: A4, dur: 0.5 }, { note: F4, dur: 0.5 },
  
  // Part B
  { note: D4, dur: 0.5 }, { note: F4, dur: 0.5 }, { note: A4, dur: 0.5 }, { note: D5, dur: 1.0 },
  { note: A4, dur: 0.5 }, { note: F4, dur: 0.5 }, { note: D4, dur: 0.5 },
  { note: G4, dur: 0.5 }, { note: B4, dur: 0.5 }, { note: D5, dur: 0.5 }, { note: G5, dur: 1.0 },
  { note: G4, dur: 0.5 }, { note: B4, dur: 0.5 }, { note: D5, dur: 0.5 },

  // Part C (Climax)
  { note: C5, dur: 0.5 }, { note: D5, dur: 0.25 }, { note: E5, dur: 0.25 }, { note: F5, dur: 0.5 }, { note: E5, dur: 0.5 },
  { note: D5, dur: 0.5 }, { note: C5, dur: 0.5 }, { note: B4, dur: 0.5 }, { note: A4, dur: 0.5 },
  { note: G4, dur: 0.5 }, { note: F4, dur: 0.25 }, { note: E4, dur: 0.25 }, { note: D4, dur: 0.5 }, { note: C4, dur: 0.5 },
  { note: G4, dur: 1.0 }, { note: C5, dur: 2.0 }
];

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Create noise buffer for "Swoosh" sounds
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export type SfxType = 'JUMP' | 'ATTACK' | 'SKILL' | 'SKILL_WARRIOR' | 'SKILL_MAGE' | 'SKILL_THIEF' | 'SKILL_BEGINNER' | 'HIT' | 'COIN' | 'LEVELUP' | 'UI_CLICK' | 'ATTACK_MAGE' | 'ATTACK_THIEF' | 'ATTACK_BEGINNER' | 'BOSS_SPAWN';

// --- SFX ENGINE ---
export const playSfx = (type: SfxType) => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  
  const t = audioCtx.currentTime;

  switch (type) {
    case 'JUMP': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(400, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.15);
        break;
    }
    case 'ATTACK': {
        // Warrior Slash
        if (noiseBuffer) {
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(600, t);
            noiseFilter.frequency.linearRampToValueAtTime(100, t + 0.2);
            
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(audioCtx.destination);
            noise.start();
            noise.stop(t + 0.2);
        }
        break;
    }
    case 'ATTACK_MAGE': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.15);
        break;
    }
    case 'ATTACK_THIEF': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.1);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.1);
        break;
    }
    case 'ATTACK_BEGINNER': {
        // Bonk sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.1);
        break;
    }
    case 'SKILL': // Fallback
    case 'SKILL_WARRIOR': {
        // Heavy Impact
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.4);
        break;
    }
    case 'SKILL_MAGE': {
        // Electric Zap
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(2000, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        const lfo = audioCtx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 50;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        lfo.stop(t + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.3);
        break;
    }
    case 'SKILL_THIEF': {
        // High speed woosh
        if (noiseBuffer) {
             const noise = audioCtx.createBufferSource();
             noise.buffer = noiseBuffer;
             const filter = audioCtx.createBiquadFilter();
             filter.type = 'bandpass';
             filter.frequency.setValueAtTime(2000, t);
             filter.frequency.linearRampToValueAtTime(5000, t + 0.2);
             const nGain = audioCtx.createGain();
             nGain.gain.setValueAtTime(0.3, t);
             nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
             noise.connect(filter);
             filter.connect(nGain);
             nGain.connect(audioCtx.destination);
             noise.start();
             noise.stop(t+0.2);
        }
        break;
    }
    case 'SKILL_BEGINNER': {
        // Cute sounds
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.1);
        osc.frequency.linearRampToValueAtTime(400, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.2);
        break;
    }
    case 'HIT': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.1);
        break;
    }
    case 'COIN': {
        const osc1 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, t);
        osc1.frequency.setValueAtTime(1600, t + 0.05);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc1.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(t + 0.3);
        break;
    }
    case 'LEVELUP': {
        const notes = [C4, E4, G4, C5, G4, C5];
        notes.forEach((freq, i) => {
            const osc = audioCtx!.createOscillator();
            const gain = audioCtx!.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const st = t + i * 0.1;
            gain.gain.setValueAtTime(0.05, st);
            gain.gain.linearRampToValueAtTime(0, st + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx!.destination);
            osc.start(st);
            osc.stop(st + 0.15);
        });
        break;
    }
    case 'UI_CLICK': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 0.05);
        break;
    }
    case 'BOSS_SPAWN': {
        // Ominous deep sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.linearRampToValueAtTime(30, t + 2);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(t + 2);
    }
  }
};

// --- BGM ENGINE (Sequencer) ---
const scheduleNote = (noteFreq: number, duration: number, time: number) => {
    if (!audioCtx || noteFreq === 0) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Dual oscillator for richer sound (Square + Triangle)
    osc.type = 'square'; 
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';

    osc.frequency.value = noteFreq;
    osc2.frequency.value = noteFreq;
    
    // ADSR Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.02, time + 0.05); // Attack
    gain.gain.setValueAtTime(0.02, time + duration - 0.05); // Sustain
    gain.gain.linearRampToValueAtTime(0, time + duration); // Release
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(time);
    osc.stop(time + duration);
    osc2.start(time);
    osc2.stop(time + duration);
    
    bgmNodes.push(osc);
    bgmNodes.push(osc2);
    bgmNodes.push(gain);
};

const scheduler = () => {
    if (!audioCtx) return;
    
    // Schedule ahead
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        // Play current note in melody loop
        const currentNote = MELODY[melodyCursor];
        scheduleNote(currentNote.note, currentNote.dur * SECONDS_PER_BEAT, nextNoteTime);
        
        nextNoteTime += currentNote.dur * SECONDS_PER_BEAT;
        melodyCursor = (melodyCursor + 1) % MELODY.length;
    }
    timerID = window.setTimeout(scheduler, 25);
};

let melodyCursor = 0;

export const toggleBgm = (play: boolean) => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    if (play && !isPlayingBgm) {
        isPlayingBgm = true;
        nextNoteTime = audioCtx.currentTime + 0.1;
        melodyCursor = 0;
        scheduler();
    } else if (!play && isPlayingBgm) {
        isPlayingBgm = false;
        if (timerID) window.clearTimeout(timerID);
        // Stop all playing nodes
        bgmNodes.forEach(node => {
            try { (node as any).stop(); } catch(e){}
            node.disconnect();
        });
        bgmNodes = [];
    }
};
