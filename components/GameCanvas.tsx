
import React, { useEffect, useRef, useState } from 'react';
import { 
  Entity, Player, EntityType, Direction, Vector2, DamageNumber, Quest,
  GameMode, Item, ItemType, Gender, Job, ChatMessage 
} from '../types';
import { 
  GRAVITY, FRICTION, MOVE_SPEED, MAX_SPEED, JUMP_FORCE, FLOOR_Y, 
  ATTACK_COOLDOWN, SPAWN_RATE, WORLD_WIDTH, VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT, KEY_MAPPING, ITEM_DB, TOWN_BORDER_X, BOT_MESSAGES,
  SKILL_COOLDOWN, SKILL_MP_COST, SKILL_RANGE, AUTO_HUNT_DETECT_RANGE,
  AUTO_POTION_HP_THRESHOLD, AUTO_POTION_MP_THRESHOLD, POTION_COOLDOWN,
  WEAPON_ENHANCE_BASE_COST, POTION_MASTERY_COST, JOB_STATS, BOSS_VARIANTS
} from '../constants';
import { UIOverlay } from './UIOverlay';
import { generateQuest } from '../services/geminiService';
import { generateId } from '../App';
import { initAudio, playSfx, toggleBgm, SfxType } from '../utils/audio';
import { saveGame, loadGame } from '../utils/storage';

interface GameCanvasProps {
  mode: GameMode;
  gender: Gender;
  shouldLoad: boolean;
  onBack: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ mode, gender, shouldLoad, onBack }) => {
  // --- INITIAL STATE ---
  const getInitialPlayer = (): Player => {
    if (shouldLoad) {
        const saved = loadGame();
        if (saved) {
             if (!saved.settings) saved.settings = { autoHpThreshold: 0.4, autoMpThreshold: 0.3 };
             return saved;
        }
    }
    return {
        id: 'player',
        type: EntityType.PLAYER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: 0 },
        width: 50,
        height: 70,
        direction: Direction.RIGHT,
        isGrounded: false,
        state: 'IDLE',
        job: Job.BEGINNER,
        hp: 150, maxHp: 150,
        mp: 100, maxMp: 100,
        damage: 0, expValue: 0, color: 'bg-blue-500',
        level: 1, currentExp: 0, maxExp: 100,
        name: mode === GameMode.MULTI ? '나' : '초보모험가',
        iframe: 0,
        gold: 500,
        skillCooldown: 0,
        gender: gender,
        autoHunt: false,
        potionMastery: 1,
        potionCooldown: 0,
        settings: { autoHpThreshold: 0.4, autoMpThreshold: 0.3 },
        inventory: [
            { ...ITEM_DB['red_potion'], dbId: ITEM_DB['red_potion'].id, id: generateId() },
            { ...ITEM_DB['blue_potion'], dbId: ITEM_DB['blue_potion'].id, id: generateId() }
        ],
        equipment: { weapon: null },
        stats: { baseDamage: 10, str: 5, dex: 5, int: 5, luk: 5 }
    };
  };

  const [playerState, setPlayerState] = useState<Player>(getInitialPlayer());
  const [enemies, setEnemies] = useState<Entity[]>([]);
  const [items, setItems] = useState<Entity[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<Entity[]>([]);
  const [projectiles, setProjectiles] = useState<Entity[]>([]); 
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [hitEffects, setHitEffects] = useState<Entity[]>([]);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loadingQuest, setLoadingQuest] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [dialogue, setDialogue] = useState<{name: string, text: string, isShop?: boolean} | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  
  // Dynamic Scaling State
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ w: VIEWPORT_WIDTH, h: VIEWPORT_HEIGHT });

  const [chatLog, setChatLog] = useState<ChatMessage[]>([{ id: 'welcome', sender: 'System', text: '게임에 오신 것을 환영합니다! [Enter]키로 채팅을 시작하세요.', type: 'SYSTEM', timestamp: Date.now() }]);
  const [isChatActive, setIsChatActive] = useState(false);

  // --- REFS ---
  const playerRef = useRef<Player>(playerState);
  const enemiesRef = useRef<Entity[]>([]);
  const itemsRef = useRef<Entity[]>([]);
  const otherPlayersRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Entity[]>([]);
  const hitEffectsRef = useRef<Entity[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const frameRef = useRef<number>(0);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const lastAttackFrame = useRef<number>(0);
  const lastSkillFrame = useRef<number>(0);
  const skillCastPosRef = useRef<Vector2>({ x: 0, y: 0 }); 
  const hasInitializedAudio = useRef(false);
  const saveTimerRef = useRef<number>(0);
  const autoHuntStuckTimerRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const killCountRef = useRef<number>(0);
  const bossActiveRef = useRef<boolean>(false);
  
  // Hit Stop Logic
  const hitStopRef = useRef<number>(0);
  const isChatActiveRef = useRef(false);

  // --- STARTUP & SCALING ---
  useEffect(() => {
    const handleResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        if (window.visualViewport) {
            width = window.visualViewport.width;
            height = window.visualViewport.height;
        }

        // Use origin-top-left scaling to ensure it fills the container.
        const targetHeight = VIEWPORT_HEIGHT; 
        const newScale = height / targetHeight;
        const newWidth = width / newScale;

        setScale(newScale);
        setDimensions({ w: newWidth, h: targetHeight });
    };
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
    }
    handleResize();

    const initialEnemies: Entity[] = [];
    for(let i=0; i<4; i++) initialEnemies.push(createEnemy(TOWN_BORDER_X + 300 + i * 300));
    enemiesRef.current = initialEnemies;
    setEnemies(initialEnemies);

    if (mode === GameMode.MULTI) {
        const bots: Entity[] = [];
        for(let i=0; i<3; i++) {
            bots.push(createBot(i));
        }
        otherPlayersRef.current = bots;
        setOtherPlayers(bots);
    }

    const handleKeyDown = (e: KeyboardEvent) => { 
        if (!hasInitializedAudio.current) {
            initAudio();
            hasInitializedAudio.current = true;
            toggleBgm(true);
        }
        
        if (e.code === KEY_MAPPING.ENTER) {
            e.preventDefault(); 
            setIsChatActive(prev => {
                const newVal = !prev;
                isChatActiveRef.current = newVal;
                return newVal;
            });
            return;
        }

        if (isChatActiveRef.current) return;

        if (e.code === KEY_MAPPING.AUTO) { toggleAutoHunt(); return; }
        keysRef.current[e.code] = true; 
        if (e.code === KEY_MAPPING.INVENTORY) { playSfx('UI_CLICK'); setShowInventory(prev => !prev); }
        if (e.code === KEY_MAPPING.ESCAPE) {
            if (showInventory || dialogue) { setShowInventory(false); setDialogue(null); } 
            else { saveGame(playerRef.current); setShowQuitModal(true); playSfx('UI_CLICK'); }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game Loop
    let animationFrameId: number;
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Cap timeScale to prevent teleporting on lag spikes (max 2.0x speed)
      const timeScale = Math.min(dt / 16.6667, 2.0); 

      if (!showQuitModal) update(timeScale);
      
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      toggleBgm(false);
      saveGame(playerRef.current); 
    };
  }, []); 

  // --- CREATION HELPERS ---
  const createBot = (idx: number): Entity => ({
    id: `bot-${idx}`, type: EntityType.OTHER_PLAYER,
    position: { x: 200 + Math.random() * 400, y: FLOOR_Y - 70 },
    velocity: { x: 0, y: 0 }, width: 50, height: 70,
    direction: Math.random() > 0.5 ? Direction.RIGHT : Direction.LEFT,
    isGrounded: true, state: 'IDLE',
    hp: 100, maxHp: 100, damage: 0, expValue: 0, color: 'bg-slate-400',
    name: `유저${Math.floor(Math.random()*999)}`, chatTimer: 0
  });

  const createEnemy = (x: number): Entity => {
    const rand = Math.random();
    const type = rand > 0.6 ? EntityType.SLIME : (rand > 0.3 ? EntityType.MUSHROOM : EntityType.PIG);
    let stats = { hp: 50, dmg: 8, exp: 15, w: 50, h: 40 };
    if (type === EntityType.MUSHROOM) stats = { hp: 120, dmg: 20, exp: 40, w: 50, h: 60 };
    if (type === EntityType.PIG) stats = { hp: 250, dmg: 35, exp: 80, w: 70, h: 50 };

    return {
      id: generateId(), type,
      position: { x, y: 100 }, velocity: { x: 0, y: 0 },
      width: stats.w, height: stats.h,
      direction: Math.random() > 0.5 ? Direction.LEFT : Direction.RIGHT,
      isGrounded: false, state: 'IDLE',
      hp: stats.hp, maxHp: stats.hp, damage: stats.dmg, expValue: stats.exp, color: '',
      aiTimer: Math.floor(Math.random() * 100) + 50, aiAction: 'IDLE'
    };
  };

  const createBoss = (x: number): Entity => {
      playSfx('BOSS_SPAWN');
      addDamageNumber(0, x, FLOOR_Y - 200, true, 'DAMAGE'); 
      const variants = Object.values(BOSS_VARIANTS);
      const variant = variants[Math.floor(Math.random() * variants.length)];
      
      return {
          id: generateId(), type: EntityType.BOSS,
          position: { x, y: 0 }, velocity: { x: 0, y: 0},
          width: variant.width, height: variant.height,
          direction: Direction.LEFT, isGrounded: false, state: 'IDLE',
          hp: variant.hp, maxHp: variant.hp, damage: variant.damage, expValue: variant.exp, color: 'bg-red-900',
          name: variant.name, aiTimer: 100, bossType: variant.name
      }
  }

  const addDamageNumber = (val: number, x: number, y: number, isCrit: boolean, type: 'DAMAGE' | 'HEAL' | 'MP_HEAL' | 'EXP' | 'GOLD' = 'DAMAGE') => {
    damageNumbersRef.current.push({
        id: generateId(), value: val, position: { x, y: y - 30 }, life: 60, isCrit, type
    });
  };

  const spawnHitEffect = (x: number, y: number, type: 'SLASH' | 'STAB' | 'BLAST' | 'SPARK') => {
      hitEffectsRef.current.push({
          id: generateId(), type: EntityType.EFFECT,
          position: { x, y }, velocity: { x: 0, y: 0},
          width: 60, height: 60, direction: Direction.RIGHT, isGrounded: false, state: 'IDLE',
          hp: 1, maxHp: 1, damage: 0, expValue: 0, color: type, lifeTime: 10, maxLifeTime: 10
      });
  }

  const spawnDrop = (x: number, y: number, isBoss: boolean = false) => {
      const count = isBoss ? 10 : 1;
      for(let i=0; i<count; i++) {
        const rand = Math.random();
        const offset = (i - count/2) * 20;
        if (rand > 0.7 || isBoss) { 
            const goldAmount = (Math.floor(Math.random() * 50) + 10) * (isBoss ? 10 : 1);
            itemsRef.current.push({
                id: generateId(), type: EntityType.GOLD_DROP,
                position: { x: x + offset, y }, velocity: { x: (Math.random() - 0.5) * 6, y: -5 - Math.random()*3 },
                width: 20, height: 20, direction: Direction.LEFT, isGrounded: false, state: 'IDLE',
                hp: 1, maxHp: 1, damage: 0, expValue: 0, color: 'bg-yellow-400', name: 'Gold', value: goldAmount
            });
            continue;
        }
        let itemKey = 'slime_bubble';
        if (rand < 0.1) itemKey = 'iron_sword';
        else if (rand < 0.15) itemKey = 'magic_wand';
        else if (rand < 0.2) itemKey = 'thief_dagger';
        else if (rand < 0.3) itemKey = 'mushroom_cap';
        else if (rand < 0.45) itemKey = 'red_potion';
        else if (rand < 0.55) itemKey = 'blue_potion';
        
        const dbItem = ITEM_DB[itemKey as keyof typeof ITEM_DB];
        if (!dbItem) return;
        itemsRef.current.push({
            id: generateId(), type: EntityType.ITEM_DROP,
            position: { x: x + offset, y }, velocity: { x: (Math.random() - 0.5) * 4, y: -4 },
            width: 30, height: 30, direction: Direction.LEFT, isGrounded: false, state: 'IDLE',
            hp: 1, maxHp: 1, damage: 0, expValue: 0, color: 'bg-white', name: itemKey 
        });
      }
  };

  const toggleAutoHunt = () => {
      playerRef.current.autoHunt = !playerRef.current.autoHunt;
      playSfx('UI_CLICK');
      setPlayerState({...playerRef.current});
  };

  const handleSendChat = (text: string) => {
      playerRef.current.chatMessage = text;
      playerRef.current.chatTimer = 300; 
      setChatLog(prev => [...prev, { id: generateId(), sender: playerRef.current.name || '나', text, type: 'USER', timestamp: Date.now() }]);
      setIsChatActive(false);
      isChatActiveRef.current = false;
  };

  // --- GAME LOGIC UPDATE ---
  const update = (timeScale: number) => {
    if (hitStopRef.current > 0) {
        hitStopRef.current -= 1 * timeScale;
        setPlayerState({...playerRef.current});
        return; 
    }

    frameRef.current++; 
    const player = playerRef.current;
    const keys = keysRef.current;
    const jobStats = JOB_STATS[player.job] || JOB_STATS[Job.BEGINNER];

    if (player.chatTimer && player.chatTimer > 0) {
        player.chatTimer -= 1 * timeScale;
        if (player.chatTimer <= 0) player.chatMessage = undefined;
    }

    saveTimerRef.current += timeScale;
    if (saveTimerRef.current > 600) { saveGame(player); saveTimerRef.current = 0; }

    if (screenShakeRef.current > 0) {
        screenShakeRef.current -= 1 * timeScale;
    }

    if (frameRef.current % 120 === 0 && player.mp < player.maxMp) player.mp = Math.min(player.maxMp, player.mp + 2);
    if (player.potionCooldown > 0) player.potionCooldown -= 1 * timeScale;

    // --- AUTO POTION ---
    if (player.potionCooldown <= 0) {
        const hpRatio = player.hp / player.maxHp;
        const mpRatio = player.mp / player.maxMp;
        if (hpRatio < player.settings.autoHpThreshold) {
            const potIdx = player.inventory.findIndex(i => i.dbId === 'red_potion');
            if (potIdx !== -1) {
                const pot = player.inventory[potIdx];
                const healAmt = (pot.stats?.heal || 0) * (1 + player.potionMastery * 0.1);
                player.hp = Math.min(player.maxHp, player.hp + healAmt);
                player.inventory.splice(potIdx, 1);
                player.potionCooldown = POTION_COOLDOWN;
                addDamageNumber(Math.floor(healAmt), player.position.x, player.position.y, false, 'HEAL');
                playSfx('UI_CLICK');
            }
        } 
        if (mpRatio < player.settings.autoMpThreshold && player.potionCooldown <= 0) {
            const potIdx = player.inventory.findIndex(i => i.dbId === 'blue_potion');
            if (potIdx !== -1) {
                const pot = player.inventory[potIdx];
                const healAmt = (pot.stats?.mpHeal || 0) * (1 + player.potionMastery * 0.1);
                player.mp = Math.min(player.maxMp, player.mp + healAmt);
                player.inventory.splice(potIdx, 1);
                player.potionCooldown = POTION_COOLDOWN;
                addDamageNumber(Math.floor(healAmt), player.position.x, player.position.y, false, 'MP_HEAL');
            }
        }
    }

    // --- AUTO HUNT LOGIC ---
    let autoLeft = false; let autoRight = false; let autoJump = false; let autoAttack = false; let autoSkill = false;
    
    if (player.autoHunt && player.hp > 0 && !isChatActiveRef.current) {
        let closestDist = AUTO_HUNT_DETECT_RANGE;
        let target: Entity | null = null;
        
        enemiesRef.current.forEach(e => {
            if (e.hp <= 0 || e.state === 'DEAD') return;
            const dist = Math.abs(player.position.x - e.position.x);
            if (dist < closestDist) { closestDist = dist; target = e; }
        });

        if (target) {
            const dist = closestDist;
            const attackRange = jobStats.range;
            const targetDir = target.position.x > player.position.x ? Direction.RIGHT : Direction.LEFT;
            const isFacing = player.direction === targetDir;

            if (player.mp >= SKILL_MP_COST && frameRef.current - lastSkillFrame.current > SKILL_COOLDOWN && dist < SKILL_RANGE) {
                autoSkill = true;
                player.direction = targetDir;
            } 
            else if (dist < attackRange) {
                if (!isFacing) {
                     if (targetDir === Direction.RIGHT) autoRight = true; else autoLeft = true;
                } else {
                     autoAttack = true;
                }
            } 
            else if (dist > 15) {
                if (targetDir === Direction.RIGHT) autoRight = true;
                else autoLeft = true;
            }
            
            if ((autoLeft || autoRight)) {
                if (Math.abs(player.velocity.x) < 0.2) {
                    autoHuntStuckTimerRef.current += timeScale;
                } else {
                    autoHuntStuckTimerRef.current = Math.max(0, autoHuntStuckTimerRef.current - timeScale);
                }

                if ((autoHuntStuckTimerRef.current > 30 || (target.position.y < player.position.y - 50)) && player.isGrounded) {
                     autoJump = true;
                     autoHuntStuckTimerRef.current = 0;
                }
            } else {
                 autoHuntStuckTimerRef.current = 0;
            }
        } else {
            if (player.position.x < TOWN_BORDER_X + 200) autoRight = true;
            else if (player.position.x > WORLD_WIDTH - 200) autoLeft = true;
            if (Math.random() < 0.005) autoJump = true;
        }
    }

    const moveLeft = keys[KEY_MAPPING.LEFT] || autoLeft;
    const moveRight = keys[KEY_MAPPING.RIGHT] || autoRight;
    const doJump = keys[KEY_MAPPING.JUMP] || autoJump;
    const doAttack = keys[KEY_MAPPING.ATTACK] || autoAttack;
    const doSkill = keys[KEY_MAPPING.SKILL] || autoSkill;
    
    // --- PHYSICS (Scaled) ---
    if (player.state !== 'ATTACK' && player.state !== 'SKILL' && player.state !== 'HIT') { 
        if (moveLeft) {
            player.velocity.x -= (MOVE_SPEED * jobStats.speed) * timeScale; player.direction = Direction.LEFT; player.state = 'WALK';
        } else if (moveRight) {
            player.velocity.x += (MOVE_SPEED * jobStats.speed) * timeScale; player.direction = Direction.RIGHT; player.state = 'WALK';
        } else {
            player.state = player.isGrounded ? 'IDLE' : 'JUMP';
        }
    } else {
        if (player.isGrounded && (player.state === 'ATTACK' || player.state === 'SKILL')) {
            player.velocity.x *= 0.5; 
        }
    }
    
    player.velocity.x *= Math.pow(FRICTION, timeScale); 
    player.velocity.x = Math.max(Math.min(player.velocity.x, MAX_SPEED), -MAX_SPEED);
    player.velocity.y += GRAVITY * timeScale;

    if ((doJump || keys[KEY_MAPPING.UP]) && player.isGrounded) {
        player.velocity.y = JUMP_FORCE; player.isGrounded = false; player.state = 'JUMP'; playSfx('JUMP');
    }

    player.position.x += player.velocity.x * timeScale;
    player.position.y += player.velocity.y * timeScale;
    
    if (player.position.y + player.height >= FLOOR_Y) {
        player.position.y = FLOOR_Y - player.height; player.velocity.y = 0; player.isGrounded = true;
        if(player.state === 'JUMP' || player.state === 'HIT') player.state = 'IDLE';
    }
    if (player.position.x < 0) player.position.x = 0;
    if (player.position.x > WORLD_WIDTH - player.width) player.position.x = WORLD_WIDTH - player.width;

    // --- COMBAT ---
    const weapon = player.equipment.weapon;
    const weaponDmg = weapon ? (weapon.stats?.damage || 0) + (weapon.enhancement || 0) : 0;
    const totalDmg = player.stats.baseDamage + weaponDmg;
    const ATTACK_DURATION = jobStats.attackDelay; 
    const SKILL_DURATION = 45; 

    // Attack
    if (doAttack && player.state !== 'ATTACK' && player.state !== 'SKILL' && frameRef.current - lastAttackFrame.current > ATTACK_COOLDOWN) {
        if (player.position.x >= TOWN_BORDER_X) {
            lastAttackFrame.current = frameRef.current;
            player.state = 'ATTACK';
            
            if (player.job === Job.MAGE) playSfx('ATTACK_MAGE');
            else if (player.job === Job.THIEF) playSfx('ATTACK_THIEF');
            else if (player.job === Job.BEGINNER) playSfx('ATTACK_BEGINNER');
            else playSfx('ATTACK'); 

            if (player.job === Job.MAGE) {
                projectilesRef.current.push({
                    id: generateId(), type: EntityType.PROJECTILE,
                    position: { x: player.position.x + (player.width/2), y: player.position.y + 20 },
                    velocity: { x: player.direction === Direction.RIGHT ? 8 : -8, y: 0 },
                    width: 20, height: 20, direction: player.direction, isGrounded: false,
                    state: 'IDLE', hp: 1, maxHp: 1, damage: totalDmg, expValue: 0, color: 'bg-blue-300', pierce: 5, hitIds: []
                });
            } else if (player.job === Job.THIEF) {
                projectilesRef.current.push({
                    id: generateId(), type: EntityType.PROJECTILE,
                    position: { x: player.position.x + (player.width/2), y: player.position.y + 25 },
                    velocity: { x: player.direction === Direction.RIGHT ? 12 : -12, y: 0 },
                    width: 24, height: 24, direction: player.direction, isGrounded: false,
                    state: 'IDLE', hp: 1, maxHp: 1, damage: totalDmg, expValue: 0, color: 'bg-slate-700', pierce: 3, hitIds: []
                });
            } else if (player.job === Job.BEGINNER) {
                 projectilesRef.current.push({
                    id: generateId(), type: EntityType.PROJECTILE,
                    position: { x: player.position.x + (player.width/2), y: player.position.y + 30 },
                    velocity: { x: player.direction === Direction.RIGHT ? 7 : -7, y: -2 },
                    width: 16, height: 14, direction: player.direction, isGrounded: false,
                    state: 'IDLE', hp: 1, maxHp: 1, damage: Math.max(1, Math.floor(totalDmg * 0.8)), expValue: 0, color: 'bg-lime-600', pierce: 1, hitIds: []
                });
            } else {
                if (player.isGrounded) player.velocity.x = player.direction === Direction.RIGHT ? 6 : -6; 
                const attackCenter = player.position.x + (player.width/2) + (player.direction === Direction.RIGHT ? jobStats.range/2 : -jobStats.range/2);
                let hitAny = false;
                enemiesRef.current.forEach(enemy => {
                    if (Math.abs(enemy.position.x - attackCenter) < jobStats.range && Math.abs(enemy.position.y - player.position.y) < 80) {
                        const isCrit = Math.random() > 0.8;
                        const finalDmg = Math.floor(totalDmg * (isCrit ? 1.5 : 1));
                        enemy.hp -= finalDmg; enemy.velocity.x = player.direction === Direction.RIGHT ? 6 : -6; enemy.velocity.y = -5; enemy.state = 'HIT'; enemy.aiTimer = 40;
                        addDamageNumber(finalDmg, enemy.position.x, enemy.position.y, isCrit);
                        spawnHitEffect(enemy.position.x, enemy.position.y, 'SLASH');
                        playSfx('HIT');
                        hitAny = true;
                    }
                });
                if (hitAny) {
                    // Warrior feels heavier
                    hitStopRef.current = player.job === Job.WARRIOR ? 8 : 4; 
                    screenShakeRef.current = player.job === Job.WARRIOR ? 6 : 2;
                }
            }
        }
    }

    // Skills
    if (doSkill && player.state !== 'ATTACK' && player.state !== 'SKILL') {
        if (frameRef.current - lastSkillFrame.current > SKILL_COOLDOWN && player.mp >= SKILL_MP_COST) {
             lastSkillFrame.current = frameRef.current; 
             player.state = 'SKILL'; 
             player.mp -= SKILL_MP_COST; 
             
             skillCastPosRef.current = { ...player.position };
             if (player.isGrounded) player.velocity.x = 0;
             screenShakeRef.current = 15;

             if (player.job === Job.WARRIOR) playSfx('SKILL_WARRIOR');
             else if (player.job === Job.MAGE) playSfx('SKILL_MAGE');
             else if (player.job === Job.THIEF) playSfx('SKILL_THIEF');
             else playSfx('SKILL_BEGINNER');

             if (player.job === Job.THIEF) {
                 setTimeout(() => {
                    projectilesRef.current.push({
                        id: generateId(), type: EntityType.PROJECTILE,
                        position: { x: playerRef.current.position.x, y: playerRef.current.position.y + 10 },
                        velocity: { x: playerRef.current.direction === Direction.RIGHT ? 15 : -15, y: 0 },
                        width: 50, height: 50, direction: playerRef.current.direction, isGrounded: false,
                        state: 'IDLE', hp: 1, maxHp: 1, damage: Math.floor(totalDmg * 2.5), expValue: 0, color: 'bg-slate-800', pierce: 10, hitIds: []
                    });
                 }, 100);
             } else if (player.job === Job.BEGINNER) {
                 for (let i = -1; i <= 1; i++) {
                      setTimeout(() => {
                        projectilesRef.current.push({
                            id: generateId(), type: EntityType.PROJECTILE,
                            position: { x: playerRef.current.position.x, y: playerRef.current.position.y + 10 + (i*10) },
                            velocity: { x: playerRef.current.direction === Direction.RIGHT ? 10 : -10, y: i * 1 },
                            width: 20, height: 18, direction: playerRef.current.direction, isGrounded: false,
                            state: 'IDLE', hp: 1, maxHp: 1, damage: Math.floor(totalDmg * 1.5), expValue: 0, color: 'bg-green-700', pierce: 1, hitIds: []
                        });
                      }, (i+1) * 100);
                 }
             } else if (player.job === Job.WARRIOR) {
                 setTimeout(() => {
                    const attackCenter = skillCastPosRef.current.x + (playerRef.current.direction === Direction.RIGHT ? 120 : -120);
                    screenShakeRef.current = 25; 
                    hitStopRef.current = 12; // Heavy Hit Stop for Warrior Skill
                    enemiesRef.current.forEach(enemy => {
                        if (Math.abs(enemy.position.x - attackCenter) < 200) {
                            const finalDmg = Math.floor(totalDmg * 4.0);
                            enemy.hp -= finalDmg; enemy.velocity.y = -12; enemy.state = 'HIT'; enemy.aiTimer = 80;
                            addDamageNumber(finalDmg, enemy.position.x, enemy.position.y, true);
                            spawnHitEffect(enemy.position.x, enemy.position.y, 'BLAST');
                        }
                    });
                 }, 350);
             } else {
                 hitStopRef.current = 6;
                 enemiesRef.current.forEach(enemy => {
                    if (Math.abs(enemy.position.x - player.position.x) < SKILL_RANGE) {
                        const finalDmg = Math.floor(totalDmg * 3.0);
                        enemy.hp -= finalDmg; enemy.velocity.y = -8; enemy.state = 'HIT'; enemy.aiTimer = 60;
                        addDamageNumber(finalDmg, enemy.position.x, enemy.position.y, true);
                        spawnHitEffect(enemy.position.x, enemy.position.y, 'SPARK');
                    }
                 });
             }
        }
    }

    // --- ITEM MAGNET ---
    itemsRef.current.forEach(item => {
        const dx = player.position.x - item.position.x;
        const dy = player.position.y - item.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 300) {
            item.velocity.x += (dx / dist) * 4.0 * timeScale; 
            item.velocity.y += (dy / dist) * 4.0 * timeScale;
            item.velocity.x *= 0.8; 
            item.velocity.y *= 0.8;
        }

        if (dist < 80) {
             if (item.type === EntityType.GOLD_DROP) {
                player.gold += (item.value || 0);
                addDamageNumber(item.value || 0, player.position.x, player.position.y - 40, false, 'GOLD');
                playSfx('COIN'); item.state = 'DEAD'; 
            } else if (item.type === EntityType.ITEM_DROP) {
                 const dbItem = ITEM_DB[item.name as keyof typeof ITEM_DB];
                 if (dbItem) {
                     player.inventory.push({ ...dbItem, dbId: dbItem.id, id: generateId() });
                     playSfx('COIN'); addDamageNumber(1, player.position.x, player.position.y - 40, false, 'HEAL'); item.state = 'DEAD';
                 }
            }
        }
    });
    itemsRef.current = itemsRef.current.filter(i => i.state !== 'DEAD');
    
    if (keys[KEY_MAPPING.INTERACT] && player.position.x < TOWN_BORDER_X && Math.abs(player.position.x - 150) < 80 && !dialogue) {
        setDialogue({ name: "잡화상인 촌장", text: "어서오게! 좋은 물건이 많다네.", isShop: true });
        playSfx('UI_CLICK');
    }

    // --- MOB & BOSS UPDATE ---
    const aliveEnemies: Entity[] = [];
    const newProjectiles: Entity[] = [];

    enemiesRef.current.forEach(enemy => {
        if (enemy.hp <= 0) {
             if (enemy.state !== 'DEAD') {
                if (!enemy.deathTimer) {
                    player.currentExp += enemy.expValue;
                    spawnDrop(enemy.position.x, enemy.position.y, enemy.type === EntityType.BOSS);
                    
                    if (enemy.type === EntityType.BOSS) {
                         bossActiveRef.current = false;
                         screenShakeRef.current = 30;
                         addDamageNumber(99999, enemy.position.x, enemy.position.y - 100, true, 'EXP');
                         setChatLog(prev => [...prev, {id: generateId(), sender:'System', text:`${enemy.name}을(를) 처치했습니다!`, type:'SYSTEM', timestamp: Date.now()}]);
                    } else {
                         killCountRef.current += 1;
                    }

                    if (player.currentExp >= player.maxExp) {
                        player.level++; player.currentExp -= player.maxExp; player.maxExp = Math.floor(player.maxExp * 1.2);
                        player.maxHp += 50; player.hp = player.maxHp; player.maxMp += 20; player.mp = player.maxMp;
                        player.stats.baseDamage += 5; player.stats.str += 2;
                        addDamageNumber(9999, player.position.x, player.position.y - 50, true, 'HEAL');
                        playSfx('LEVELUP');
                    }
                    enemy.deathTimer = 30; // 30 frames animation
                    enemy.velocity.y = -5; // Hop
                }
             }
             if (enemy.deathTimer && enemy.deathTimer > 0) {
                 enemy.deathTimer -= 1 * timeScale;
                 enemy.velocity.y += GRAVITY * timeScale;
                 enemy.position.y += enemy.velocity.y * timeScale;
                 aliveEnemies.push(enemy); // Keep rendering
             }
             return;
        }

        if (enemy.state !== 'HIT') {
            if (!enemy.aiTimer) enemy.aiTimer = 0;
            enemy.aiTimer -= 1 * timeScale;
            const distToPlayer = player.position.x - enemy.position.x;
            const distAbs = Math.abs(distToPlayer);

            if (enemy.type === EntityType.BOSS) {
                 if (distAbs < 800) {
                     enemy.direction = distToPlayer > 0 ? Direction.RIGHT : Direction.LEFT;
                     if (Math.random() < 0.05 && enemy.isGrounded) {
                         enemy.velocity.y = -15; enemy.velocity.x = distToPlayer > 0 ? 5 : -5; enemy.state = 'JUMP';
                     } else {
                         enemy.velocity.x = distToPlayer > 0 ? 2 : -2; enemy.state = 'WALK';
                     }
                 }
            } else if (enemy.type === EntityType.SLIME) {
                if (enemy.aiTimer <= 0) {
                    if (Math.random() < 0.1 && enemy.isGrounded) {
                         enemy.velocity.y = -10; enemy.velocity.x = distToPlayer > 0 ? 3 : -3; enemy.state = 'JUMP';
                    } else { enemy.velocity.x = Math.random() > 0.5 ? 1 : -1; enemy.state = 'WALK'; }
                    enemy.aiTimer = 40 + Math.random() * 40;
                }
            } else if (enemy.type === EntityType.MUSHROOM) {
                if (distAbs < 400) {
                    enemy.velocity.x = 0; enemy.direction = distToPlayer > 0 ? Direction.RIGHT : Direction.LEFT;
                    if (enemy.aiTimer <= 0) {
                        enemy.state = 'ATTACK';
                        newProjectiles.push({
                            id: generateId(), type: EntityType.PROJECTILE,
                            position: { x: enemy.position.x + (enemy.width/2), y: enemy.position.y + 20 },
                            velocity: { x: enemy.direction === Direction.RIGHT ? 6 : -6, y: -2 },
                            width: 15, height: 15, direction: enemy.direction, isGrounded: false,
                            state: 'IDLE', hp: 1, maxHp: 1, damage: 15, expValue: 0, color: 'bg-purple-500'
                        });
                        enemy.aiTimer = 120;
                    }
                } else { enemy.velocity.x = distToPlayer > 0 ? 1.5 : -1.5; enemy.state = 'WALK'; enemy.aiTimer = 10; }
            } else if (enemy.type === EntityType.PIG) {
                if (distAbs < 300 && distAbs > 50) {
                    enemy.state = 'WALK'; enemy.velocity.x = distToPlayer > 0 ? 4 : -4; enemy.direction = distToPlayer > 0 ? Direction.RIGHT : Direction.LEFT;
                } else {
                     if (enemy.aiTimer <= 0) { enemy.velocity.x = Math.random() > 0.5 ? 1 : -1; enemy.aiTimer = 60; }
                }
            }
        } else { enemy.aiTimer -= 1 * timeScale; enemy.velocity.x *= 0.95; if (enemy.aiTimer <= 0) enemy.state = 'IDLE'; }

        enemy.velocity.y += GRAVITY * timeScale; 
        enemy.position.x += enemy.velocity.x * timeScale; 
        enemy.position.y += enemy.velocity.y * timeScale;
        
        // --- STRICT BOUNDS CLAMPING ---
        if (enemy.position.x < TOWN_BORDER_X + 50) { 
            enemy.position.x = TOWN_BORDER_X + 50; 
            if (enemy.velocity.x < 0) enemy.velocity.x *= -1; 
        }
        if (enemy.position.x > WORLD_WIDTH - enemy.width) { 
            enemy.position.x = WORLD_WIDTH - enemy.width; 
            if (enemy.velocity.x > 0) enemy.velocity.x *= -1; 
        }

        if (enemy.position.y + enemy.height >= FLOOR_Y) { enemy.position.y = FLOOR_Y - enemy.height; enemy.velocity.y = 0; enemy.isGrounded = true; }

        if (player.iframe <= 0 && player.position.x > TOWN_BORDER_X && 
            Math.abs(player.position.x - enemy.position.x) < enemy.width/2 + 20 && Math.abs(player.position.y - enemy.position.y) < enemy.height/2 + 20 && enemy.hp > 0) {
             takeDamage(enemy.damage);
             player.velocity.y = -6; player.velocity.x = enemy.position.x < player.position.x ? 6 : -6;
        }
        aliveEnemies.push(enemy);
    });
    
    // Boss Spawn Check
    if (killCountRef.current > 0 && killCountRef.current % 10 === 0 && !bossActiveRef.current) {
         bossActiveRef.current = true;
         aliveEnemies.push(createBoss(TOWN_BORDER_X + 500));
         killCountRef.current++; 
         setChatLog(prev => [...prev, {id: generateId(), sender:'System', text:'강력한 보스가 출현했습니다!', type:'SYSTEM', timestamp: Date.now()}]);
    }

    // Regular Spawn
    if (frameRef.current % SPAWN_RATE === 0 && aliveEnemies.length < 15) {
        aliveEnemies.push(createEnemy(TOWN_BORDER_X + 100 + Math.random() * (WORLD_WIDTH - TOWN_BORDER_X - 200)));
    }
    enemiesRef.current = aliveEnemies;

    const activeProjectiles: Entity[] = [];
    [...projectilesRef.current, ...newProjectiles].forEach(proj => {
        proj.position.x += proj.velocity.x * timeScale; 
        proj.position.y += proj.velocity.y * timeScale;
        if (proj.type !== EntityType.PROJECTILE) proj.velocity.y += 0.1 * timeScale; 

        if (proj.color === 'bg-blue-300' || proj.color === 'bg-slate-800' || proj.color === 'bg-slate-700' || proj.color === 'bg-lime-600' || proj.color === 'bg-green-700') {
            let hit = false;
            enemiesRef.current.forEach(enemy => {
                const alreadyHit = proj.hitIds?.includes(enemy.id);
                if (!alreadyHit && enemy.hp > 0 && Math.abs(proj.position.x - enemy.position.x) < (proj.width + enemy.width/2) && Math.abs(proj.position.y - enemy.position.y) < 80) {
                    hit = true;
                    const isCrit = Math.random() > 0.5;
                    enemy.hp -= proj.damage;
                    enemy.velocity.y = -4; enemy.state = 'HIT'; enemy.aiTimer = 30;
                    addDamageNumber(proj.damage, enemy.position.x, enemy.position.y, isCrit);
                    playSfx('HIT');
                    if (!proj.hitIds) proj.hitIds = [];
                    proj.hitIds.push(enemy.id);

                    // Effect
                    const fxType = proj.color === 'bg-blue-300' ? 'SPARK' : (proj.color === 'bg-green-700' ? 'STAR' : 'STAB');
                    spawnHitEffect(enemy.position.x, enemy.position.y, fxType as any);
                    
                    // Hit Stop / Shake based on Projectile Type
                    if (proj.color === 'bg-slate-800') { // Thief Skill
                        hitStopRef.current = 4;
                        screenShakeRef.current = 5;
                    } else if (proj.color === 'bg-blue-300') { // Mage Basic
                        hitStopRef.current = 3;
                        screenShakeRef.current = 2;
                    } else {
                        hitStopRef.current = 2; // Fast projectiles
                    }
                }
            });
            if (proj.pierce && proj.hitIds && proj.hitIds.length >= proj.pierce) return;
        } else {
            if (player.iframe <= 0 && 
                Math.abs(proj.position.x - (player.position.x + player.width/2)) < 20 && 
                Math.abs(proj.position.y - (player.position.y + player.height/2)) < 30) {
                takeDamage(proj.damage); return;
            }
        }
        if (proj.position.y > FLOOR_Y + 100 || proj.position.x < -100 || proj.position.x > WORLD_WIDTH + 100) return;
        activeProjectiles.push(proj);
    });
    projectilesRef.current = activeProjectiles;

    // Hit Effects Logic
    const activeEffects: Entity[] = [];
    hitEffectsRef.current.forEach(fx => {
        if (!fx.lifeTime) fx.lifeTime = 0;
        fx.lifeTime -= 1 * timeScale;
        if (fx.lifeTime > 0) activeEffects.push(fx);
    });
    hitEffectsRef.current = activeEffects;

    // Bots
    if (mode === GameMode.MULTI) {
        otherPlayersRef.current.forEach(bot => {
            if (Math.random() < 0.01) {
                bot.velocity.x = (Math.random() - 0.5) * 4; bot.direction = bot.velocity.x > 0 ? Direction.RIGHT : Direction.LEFT; bot.state = 'WALK';
            }
            if (Math.abs(bot.velocity.x) < 0.1) bot.state = 'IDLE'; else bot.state = 'WALK';
            bot.position.x += bot.velocity.x * timeScale;
            if (bot.position.x < 50) bot.position.x = 50; if (bot.position.x > 600) bot.position.x = 600;
            if (bot.chatTimer && bot.chatTimer > 0) bot.chatTimer -= 1 * timeScale;
            if (!bot.chatTimer && Math.random() < 0.002) {
                const msg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
                bot.chatMessage = msg; bot.chatTimer = 300;
                setChatLog(prev => [...prev.slice(-15), {id: generateId(), sender: bot.name || 'Bot', text: msg, type: 'BOT', timestamp: Date.now()}]);
            }
            if (bot.chatTimer && bot.chatTimer <= 1) bot.chatMessage = undefined;
        });
        setOtherPlayers([...otherPlayersRef.current]);
    }

    // Cleanup
    itemsRef.current.forEach(item => {
        item.velocity.y += GRAVITY * timeScale; 
        item.position.y += item.velocity.y * timeScale; 
        item.position.x += item.velocity.x * timeScale;
        item.velocity.x *= 0.9;
        if (item.position.y + item.height >= FLOOR_Y) {
            item.position.y = FLOOR_Y - item.height; item.velocity.y = -item.velocity.y * 0.5;
            if (Math.abs(item.velocity.y) < 1) item.velocity.y = 0;
        }
    });
    damageNumbersRef.current = damageNumbersRef.current.filter(dn => { dn.life -= 1 * timeScale; dn.position.y -= 0.5 * timeScale; return dn.life > 0; });
    if (player.iframe > 0) player.iframe -= 1 * timeScale;
    if (player.state === 'ATTACK' && frameRef.current - lastAttackFrame.current > ATTACK_DURATION) player.state = 'IDLE';
    if (player.state === 'SKILL' && frameRef.current - lastSkillFrame.current > SKILL_DURATION) player.state = 'IDLE';
    
    setPlayerState({...player});
    setItems([...itemsRef.current]);
    setProjectiles([...projectilesRef.current]);
    setDamageNumbers([...damageNumbersRef.current]);
    setHitEffects([...hitEffectsRef.current]);
    setEnemies([...enemiesRef.current]); 
  };

  const takeDamage = (dmg: number) => {
    const player = playerRef.current;
    const actualDmg = Math.max(1, dmg - (player.stats.dex / 3)); 
    player.hp -= actualDmg; player.iframe = 90; 
    addDamageNumber(Math.floor(actualDmg), player.position.x, player.position.y, false);
    playSfx('HIT'); player.state = 'HIT';
  };

  const handleEnhance = (item: Item) => {
      if (playerRef.current.gold >= WEAPON_ENHANCE_BASE_COST) {
          playerRef.current.gold -= WEAPON_ENHANCE_BASE_COST;
          if (!item.enhancement) item.enhancement = 0;
          item.enhancement += 1;
          playSfx('LEVELUP');
          addDamageNumber(1, playerRef.current.position.x, playerRef.current.position.y - 50, true, 'EXP');
          setPlayerState({...playerRef.current});
      }
  };
  const handleUpgradeMastery = () => {
      if (playerRef.current.gold >= POTION_MASTERY_COST) {
          playerRef.current.gold -= POTION_MASTERY_COST; playerRef.current.potionMastery += 1;
          playSfx('LEVELUP'); setPlayerState({...playerRef.current});
      }
  };
  const handleQuestRequest = async () => {
    playSfx('UI_CLICK'); setLoadingQuest(true);
    const newQuest = await generateQuest(playerRef.current.level, 'Green Plains');
    setQuest(newQuest); setLoadingQuest(false);
    if (newQuest.rewardExp) playerRef.current.currentExp += newQuest.rewardExp;
  };
  const handleEquip = (item: Item) => {
      playSfx('UI_CLICK');
      if (item.type === ItemType.WEAPON) {
          const oldWeapon = playerRef.current.equipment.weapon;
          playerRef.current.equipment.weapon = item;
          playerRef.current.inventory = playerRef.current.inventory.filter(i => i.id !== item.id);
          if (oldWeapon) playerRef.current.inventory.push(oldWeapon);
      } else if (item.type === ItemType.CONSUMABLE) {
          const masteryMult = 1 + playerRef.current.potionMastery * 0.1;
          if (item.stats?.heal) {
            playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + item.stats.heal * masteryMult);
            addDamageNumber(item.stats.heal * masteryMult, playerRef.current.position.x, playerRef.current.position.y, false, 'HEAL');
          }
          if (item.stats?.mpHeal) {
            playerRef.current.mp = Math.min(playerRef.current.maxMp, playerRef.current.mp + item.stats.mpHeal * masteryMult);
            addDamageNumber(item.stats.mpHeal * masteryMult, playerRef.current.position.x, playerRef.current.position.y, false, 'MP_HEAL');
          }
          playerRef.current.inventory = playerRef.current.inventory.filter(i => i.id !== item.id);
      }
      setPlayerState({...playerRef.current});
  };
  const handleBuy = (itemKey: string) => {
      const dbItem = ITEM_DB[itemKey as keyof typeof ITEM_DB];
      if (playerRef.current.gold >= dbItem.price && playerRef.current.inventory.length < 25) {
          playerRef.current.gold -= dbItem.price;
          playerRef.current.inventory.push({...dbItem, dbId: dbItem.id, id: generateId()});
          playSfx('COIN'); setPlayerState({...playerRef.current});
      }
  };
  const handleSell = (item: Item) => {
      const sellValue = Math.floor(item.price / 2);
      playerRef.current.gold += sellValue;
      playerRef.current.inventory = playerRef.current.inventory.filter(i => i.id !== item.id);
      playSfx('COIN'); setPlayerState({...playerRef.current});
  };

  const cameraX = Math.max(0, Math.min(playerState.position.x - dimensions.w / 2, WORLD_WIDTH - dimensions.w));
  const isAttacking = playerState.state === 'ATTACK';
  const isSkilling = playerState.state === 'SKILL';
  const attackFrame = frameRef.current - lastAttackFrame.current;
  const skillFrame = frameRef.current - lastSkillFrame.current;
  
  const walkBob = playerState.state === 'WALK' ? Math.sin(frameRef.current * 0.5) * 3 : 0;
  const hairBob = playerState.state === 'WALK' || playerState.state === 'JUMP' ? Math.cos(frameRef.current * 0.5) * 2 : 0;
  
  const lungeX = isAttacking && playerState.job !== Job.THIEF && playerState.job !== Job.MAGE && playerState.job !== Job.BEGINNER && attackFrame < 10 
    ? (playerState.direction === Direction.RIGHT ? 10 : -10) : 0;
  
  const shakeStyle = screenShakeRef.current > 0 ? { transform: `translate3d(${Math.random()*screenShakeRef.current - screenShakeRef.current/2}px, ${Math.random()*screenShakeRef.current - screenShakeRef.current/2}px, 0)` } : {};

  // Warrior Sword Logic (World Space)
  const warriorSwordProgress = Math.min(1, skillFrame / 20);
  const warriorSwordY = -800 + (warriorSwordProgress * (FLOOR_Y + 800));
  const warriorImpact = skillFrame >= 20;

  // RENDER --------------------------------
  return (
    <div 
        className="absolute top-0 left-0 bg-black font-sans cursor-crosshair select-none focus:outline-none origin-top-left"
        style={{ 
            width: dimensions.w, height: dimensions.h, 
            transform: `scale(${scale})`,
            touchAction: 'none' 
        }}
        tabIndex={0}
    >
        <div className="absolute inset-0 bg-sky-200" style={shakeStyle}>
            <UIOverlay 
                player={playerState} quest={quest} onQuestClick={handleQuestRequest} loadingQuest={loadingQuest}
                showInventory={showInventory} toggleInventory={() => setShowInventory(!showInventory)}
                onEquipItem={handleEquip} onDropItem={() => {}} dialogue={dialogue} onCloseDialogue={() => setDialogue(null)}
                showQuitModal={showQuitModal} onQuit={onBack} onCancelQuit={() => setShowQuitModal(false)}
                onBuyItem={handleBuy} onSellItem={handleSell}
                toggleAutoHunt={toggleAutoHunt} onEnhanceItem={handleEnhance} onUpgradeMastery={handleUpgradeMastery}
                onChangeJob={(job) => {playerRef.current.job = job; playSfx('LEVELUP'); setPlayerState({...playerRef.current});}}
                onUpdateSettings={(type, val) => {
                    const ratio = val / 100;
                    if (type === 'hp') playerRef.current.settings.autoHpThreshold = ratio;
                    else playerRef.current.settings.autoMpThreshold = ratio;
                    setPlayerState({...playerRef.current});
                }}
                onVirtualInput={(key, pressed) => keysRef.current[key] = pressed}
                chatLog={chatLog}
                isChatActive={isChatActive}
                onSendChat={handleSendChat}
                onToggleChat={() => {
                    setIsChatActive(prev => {
                        const newVal = !prev;
                        isChatActiveRef.current = newVal;
                        return newVal;
                    });
                }}
            />

            {(isSkilling && (playerState.job === Job.MAGE || (playerState.job === Job.WARRIOR && warriorImpact && skillFrame < 25))) && (
                <div className="absolute inset-0 bg-white/80 mix-blend-overlay pointer-events-none z-40 animate-pulse"></div>
            )}
            
            {bossActiveRef.current && (
                <div className="absolute top-20 left-0 w-full text-center z-10 pointer-events-none animate-bounce">
                     <h1 className="text-4xl font-black text-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">WARNING</h1>
                     <p className="text-red-400 font-bold">강력한 보스가 출현했습니다!</p>
                </div>
            )}

            {/* --- LEVEL UP OVERLAY --- */}
            {playerState.level > 1 && frameRef.current % 100 < 20 && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-bounce">
                </div>
            )}

            <div className="absolute inset-0" style={{ transform: `translate3d(-${cameraX}px, 0, 0)` }}>
                
                {/* PARALLAX LAYERS */}
                <div className="absolute top-0 left-0 w-[3000px] h-full pointer-events-none" style={{ transform: `translate3d(${cameraX * 0.2}px, 0, 0)` }}>
                    <div className="absolute top-20 left-40 text-white text-8xl opacity-60">☁️</div>
                    <div className="absolute top-10 left-[600px] text-white text-9xl opacity-60">☁️</div>
                </div>
                <div className="absolute top-0 left-0 w-[3000px] h-full pointer-events-none" style={{ transform: `translate3d(${cameraX * 0.5}px, 0, 0)` }}>
                    <div className="absolute left-0 w-[800px] h-full bg-gradient-to-b from-indigo-200/50 to-indigo-100/50"></div>
                    <div className="absolute left-[800px] w-[2200px] h-full bg-gradient-to-b from-sky-300/50 to-sky-100/50">
                        <div className="absolute bottom-32 left-[900px] text-[150px] opacity-30 blur-[2px]">🌲</div>
                    </div>
                </div>

                {/* GROUND */}
                <div className="absolute left-0 h-[120px] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-green-600 border-t-8 border-green-800 shadow-inner"
                    style={{ top: FLOOR_Y, width: WORLD_WIDTH }}></div>
                <div className="absolute top-0 h-full w-2 bg-white/20 dashed-line" style={{ left: TOWN_BORDER_X }}></div>
                
                {/* NPC */}
                <div className="absolute flex flex-col items-center" style={{ left: 150, top: FLOOR_Y - 70 }}>
                    <div className="bg-black/60 text-white text-[10px] px-2 rounded mb-1">잡화상인</div>
                    <div className="text-5xl filter drop-shadow-lg animate-bounce-slow">🧙‍♂️</div>
                </div>

                {/* DROPS */}
                {items.map(item => (
                    <div key={item.id} className="absolute animate-float-item will-change-transform"
                        style={{ left: item.position.x, top: item.position.y + Math.sin(frameRef.current * 0.1) * 5 }}>
                        {item.type === EntityType.GOLD_DROP ? <div className="text-2xl drop-shadow-md text-yellow-400">🪙</div> : 
                        <div className="text-2xl drop-shadow-md">{ITEM_DB[item.name as keyof typeof ITEM_DB]?.icon || '❓'}</div>}
                    </div>
                ))}

                {/* ENEMIES */}
                {enemies.map(enemy => (
                    <div key={enemy.id} className={`absolute transition-all duration-300 will-change-transform`}
                        style={{
                            left: enemy.position.x, top: enemy.position.y, width: enemy.width, height: enemy.height,
                            transform: `scaleX(${enemy.direction === Direction.LEFT ? 1 : -1}) ${enemy.state === 'HIT' ? 'brightness(200%)' : ''}`,
                            opacity: enemy.deathTimer ? (enemy.deathTimer / 30) : 1,
                            filter: enemy.deathTimer ? 'grayscale(100%)' : 'none'
                        }}>
                        {enemy.type === EntityType.BOSS && (
                            <div className="w-full h-full relative animate-bounce-slow">
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-700 text-white font-black text-xs px-2 rounded border border-red-400">BOSS</div>
                                <div className="w-full h-[80%] bg-orange-500 rounded-t-[50%] rounded-b-[20%] absolute bottom-0 border-4 border-orange-700 shadow-2xl"></div>
                                <div className="absolute top-[30%] left-[20%] w-8 h-10 bg-black rounded-full border-2 border-white"><div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full"></div></div>
                                <div className="absolute top-[30%] right-[20%] w-8 h-10 bg-black rounded-full border-2 border-white"><div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full"></div></div>
                                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-16 h-4 bg-red-900 rounded-full"></div>
                            </div>
                        )}
                        {enemy.type === EntityType.SLIME && (
                            <div className="w-full h-full relative animate-bounce-slow">
                                <div className="w-full h-[80%] bg-lime-400 rounded-t-[50%] rounded-b-[20%] absolute bottom-0 border-2 border-lime-600 shadow-inner"></div>
                                <div className="absolute top-[30%] left-[25%] w-3 h-4 bg-black rounded-full"><div className="absolute top-1 left-0.5 w-1 h-1 bg-white rounded-full"></div></div>
                                <div className="absolute top-[30%] right-[25%] w-3 h-4 bg-black rounded-full"><div className="absolute top-1 left-0.5 w-1 h-1 bg-white rounded-full"></div></div>
                                <div className="absolute top-[50%] left-[15%] w-2 h-1 bg-red-400/30 rounded-full"></div>
                                <div className="absolute top-[50%] right-[15%] w-2 h-1 bg-red-400/30 rounded-full"></div>
                            </div>
                        )}
                        {enemy.type === EntityType.MUSHROOM && (
                            <div className="w-full h-full relative">
                                <div className="absolute top-0 w-full h-[65%] bg-orange-500 rounded-t-full border-2 border-orange-700 z-10 flex items-center justify-center overflow-hidden">
                                    <div className="absolute top-1 left-2 w-3 h-3 bg-orange-300/50 rounded-full"></div>
                                    <div className="absolute top-4 right-3 w-4 h-4 bg-orange-300/50 rounded-full"></div>
                                </div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-amber-100 border-2 border-amber-200 rounded-b-xl"></div>
                                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-full flex justify-center gap-4 z-20">
                                    <div className="w-1.5 h-3 bg-black rounded-full"></div>
                                    <div className="w-1.5 h-3 bg-black rounded-full"></div>
                                </div>
                            </div>
                        )}
                        {enemy.type === EntityType.PIG && (
                            <div className="w-full h-full relative">
                                <div className="w-full h-[80%] bg-pink-300 rounded-2xl border-2 border-pink-400 absolute bottom-0"></div>
                                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-8 h-5 bg-pink-400 rounded-full border border-pink-500 flex items-center justify-center gap-1">
                                    <div className="w-1.5 h-2 bg-black rounded-full"></div>
                                    <div className="w-1.5 h-2 bg-black rounded-full"></div>
                                </div>
                                <div className="absolute top-[30%] left-[15%] w-1.5 h-1.5 bg-black rounded-full"></div>
                                <div className="absolute top-[30%] right-[15%] w-1.5 h-1.5 bg-black rounded-full"></div>
                            </div>
                        )}
                        <div className="absolute -top-4 w-full h-1.5 bg-slate-800 rounded overflow-hidden border border-black">
                            <div className="h-full bg-red-500" style={{width: `${(enemy.hp/enemy.maxHp)*100}%`}}></div>
                        </div>
                    </div>
                ))}

                {/* HIT EFFECTS */}
                {hitEffects.map(fx => (
                     <div key={fx.id} className="absolute pointer-events-none z-50 will-change-transform" style={{ left: fx.position.x, top: fx.position.y }}>
                         {fx.color === 'SLASH' && (
                             <div className="w-20 h-2 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 animate-ping"></div>
                         )}
                         {fx.color === 'BLAST' && (
                             <div className="w-32 h-32 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-yellow-300 opacity-50 animate-ping"></div>
                         )}
                         {fx.color === 'SPARK' && (
                             <div className="absolute top-0 left-0">
                                 <div className="w-16 h-1 bg-cyan-400 absolute rotate-45"></div>
                                 <div className="w-16 h-1 bg-cyan-400 absolute -rotate-45"></div>
                             </div>
                         )}
                         {fx.color === 'STAB' && (
                            <div className="w-8 h-8 bg-slate-200 rounded-full animate-ping opacity-80"></div>
                         )}
                         {fx.color === 'STAR' && (
                            <div className="text-4xl text-yellow-300 animate-spin-slow">⭐</div>
                         )}
                     </div>
                ))}

                {/* WORLD SPACE SKILL EFFECTS (Warrior) */}
                {isSkilling && playerState.job === Job.WARRIOR && (
                    <div className="absolute z-40 pointer-events-none" 
                         style={{ 
                             left: skillCastPosRef.current.x + (playerState.direction === Direction.RIGHT ? 120 : -120),
                             top: warriorSwordY - 300, 
                             width: 256, height: 800,
                             transform: 'translateX(-50%)'
                         }}>
                        <svg viewBox="0 0 100 400" className="w-full h-full overflow-visible">
                             <defs>
                                 <linearGradient id="goldBladeWorld" x1="0" y1="0" x2="1" y2="0">
                                     <stop offset="0%" stopColor="#fffbeb" />
                                     <stop offset="50%" stopColor="#fbbf24" />
                                     <stop offset="100%" stopColor="#b45309" />
                                 </linearGradient>
                             </defs>
                             <path d="M50 400 L30 80 L30 50 L10 50 L10 30 L30 30 L30 10 L70 10 L70 30 L90 30 L90 50 L70 50 L70 80 Z" fill="url(#goldBladeWorld)" stroke="#78350f" strokeWidth="3" />
                             <rect x="45" y="30" width="10" height="350" fill="#fff" fillOpacity="0.4" />
                             <circle cx="50" cy="40" r="10" fill="#0ea5e9" stroke="white" strokeWidth="3" className="animate-pulse" />
                        </svg>
                        {warriorImpact && (
                             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-32 flex justify-center items-end pointer-events-none">
                                 <div className="absolute bottom-0 w-full h-1 bg-yellow-400 animate-ping"></div>
                                 <div className="absolute bottom-0 w-32 h-32 bg-orange-500/50 blur-3xl animate-pulse"></div>
                                 <svg viewBox="0 0 200 50" className="w-full h-full overflow-visible">
                                      <path d="M20 45 L60 25 L100 45 L140 20 L180 45" stroke="#451a03" strokeWidth="6" fill="none" className="animate-pulse"/>
                                 </svg>
                             </div>
                        )}
                    </div>
                )}

                {/* PROJECTILES */}
                {projectiles.map(proj => (
                    <div key={proj.id} 
                        className={`absolute rounded-full shadow-lg ${proj.color}
                            ${proj.type === EntityType.PROJECTILE ? 'animate-spin' : ''} z-30 will-change-transform`}
                        style={{ 
                            left: proj.position.x, top: proj.position.y,
                            width: proj.width, height: proj.height,
                            border: '2px solid rgba(0,0,0,0.2)'
                        }}>
                         {(proj.color === 'bg-slate-800' || proj.color === 'bg-slate-700' || proj.color === 'bg-lime-600') && ( 
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">
                                {proj.color === 'bg-slate-800' ? '⚡' : (proj.color === 'bg-lime-600' ? '@' : '✦')}
                            </div>
                        )}
                    </div>
                ))}

                {/* PLAYER */}
                <div className={`absolute transition-transform duration-75 z-20 will-change-transform`}
                    style={{
                        left: playerState.position.x + lungeX, top: playerState.position.y,
                        width: playerState.width, height: playerState.height,
                        opacity: playerState.iframe > 0 && frameRef.current % 4 < 2 ? 0.5 : 1
                    }}>
                    
                    {/* LEVEL UP EFFECT */}
                    {playerState.level > 1 && frameRef.current % 300 < 60 && (
                        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-48 text-center pointer-events-none animate-in slide-in-from-bottom-5 duration-500">
                             <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-t from-yellow-300 to-white drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">LEVEL UP!</div>
                             <div className="w-full h-full absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-ping"></div>
                        </div>
                    )}

                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap border border-white/20 z-10">
                        {playerState.name}
                    </div>

                    {playerState.chatMessage && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-3 py-1.5 rounded-2xl border-2 border-slate-300 whitespace-nowrap animate-in zoom-in z-50 shadow-lg">
                            {playerState.chatMessage}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r-2 border-b-2 border-slate-300"></div>
                        </div>
                    )}

                    <div className={`w-full h-full relative ${playerState.direction === Direction.LEFT ? 'scale-x-[-1]' : ''}`}>
                        {playerState.equipment.weapon && !(playerState.job === Job.THIEF && isAttacking) && !(playerState.job === Job.BEGINNER && isAttacking) && (
                            <div className="absolute origin-bottom-left transition-transform duration-[50ms] z-20"
                                style={{ 
                                    top: 25 + walkBob, left: 15,
                                    fontSize: '36px',
                                    transform: `rotate(${isAttacking ? (attackFrame < 4 ? -45 : attackFrame < 10 ? 110 : 60) : 0}deg)`
                                }}>
                                {playerState.equipment.weapon.icon}
                                {isAttacking && attackFrame >= 4 && attackFrame <= 10 && (
                                    <div className="absolute top-0 left-0 w-full h-full opacity-50 blur-sm" 
                                        style={{ transform: 'rotate(-30deg) scale(1.2)' }}>
                                        <div className="w-1 h-16 bg-white/80 absolute -top-10 left-4 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {(playerState.job === Job.THIEF || playerState.job === Job.BEGINNER) && isAttacking && (
                            <div className="absolute z-20 transition-transform" 
                                 style={{ 
                                     top: 30, left: 20, 
                                     transform: `translateX(${attackFrame * 3}px) rotate(${attackFrame * 15}deg)` 
                                 }}>
                                <div className="w-4 h-4 bg-slate-900 rounded-full relative">
                                    <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-black/20 rounded-full blur-sm"></div>

                        {/* --- MALE --- */}
                        {gender === Gender.MALE && (
                            <div style={{ transform: `translate(-50%, ${walkBob}px)` }} className="absolute bottom-2 left-1/2">
                                <div className="w-8 h-8 bg-blue-600 rounded-t-md rounded-b-sm border border-blue-800 shadow-inner relative z-10">
                                    <div className="absolute top-0 w-full h-1 bg-black/10"></div> 
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/10 rounded-full blur-[1px]"></div> 
                                </div>
                                <div className="absolute top-7 left-0 w-full h-4 flex gap-0.5">
                                    <div className="w-3.5 h-full bg-slate-700 rounded-b-sm border-l border-b border-slate-900"></div>
                                    <div className="w-3.5 h-full bg-slate-700 rounded-b-sm border-r border-b border-slate-900"></div>
                                </div>
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 w-12 h-11 bg-amber-100 rounded-xl border border-amber-200 shadow-md z-20">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6">
                                        <div className="w-full h-full bg-slate-800 rounded-t-lg clip-spikes"></div>
                                        <div className="absolute top-2 -left-1 w-2 h-4 bg-slate-800 rotate-[-30deg]"></div>
                                        <div className="absolute top-2 -right-1 w-2 h-4 bg-slate-800 rotate-[30deg]"></div>
                                        <div className="absolute -top-1 left-2 w-3 h-4 bg-slate-800 rotate-[-10deg]"></div>
                                        <div className="absolute -top-1 right-2 w-3 h-4 bg-slate-800 rotate-[10deg]"></div>
                                    </div>
                                    <div className="absolute top-4 left-3 w-1 h-2 bg-black rounded-full"></div>
                                    <div className="absolute top-4 right-3 w-1 h-2 bg-black rounded-full"></div>
                                    {isAttacking ? (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-red-800 rounded-b-full"></div>
                                    ) : (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/20 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- FEMALE --- */}
                        {gender === Gender.FEMALE && (
                            <div style={{ transform: `translate(-50%, ${walkBob}px)` }} className="absolute bottom-2 left-1/2">
                                <div className="w-10 h-9 bg-gradient-to-b from-pink-400 to-pink-500 rounded-t-xl rounded-b-[1rem] border border-pink-600 shadow-md relative z-10 overflow-hidden">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-white/20"></div>
                                    <div className="absolute bottom-0 w-full h-2 bg-white/30 border-t border-white/20"></div> 
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full border border-yellow-500 shadow-sm z-20"></div> 
                                </div>
                                <div className="absolute top-8 left-1 w-2.5 h-3 bg-amber-100 border-l border-amber-200"></div>
                                <div className="absolute top-8 right-1 w-2.5 h-3 bg-amber-100 border-r border-amber-200"></div>
                                <div className="absolute top-10 left-0.5 w-3 h-2 bg-red-500 rounded-sm"></div>
                                <div className="absolute top-10 right-0.5 w-3 h-2 bg-red-500 rounded-sm"></div>

                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-14 h-13 bg-amber-50 rounded-2xl border border-amber-200 shadow-md z-20">
                                    <div className="absolute -top-3 -left-4 w-[150%] h-20 pointer-events-none z-[-1]">
                                        <div className="w-full h-full bg-yellow-200 rounded-t-3xl rounded-b-3xl border border-yellow-300 shadow-sm"
                                            style={{ transform: `rotate(${hairBob * 0.5}deg)` }}></div>
                                    </div>
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[110%] h-6 bg-yellow-100 rounded-t-xl border-b border-yellow-200"></div>
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-6 z-30">
                                        <div className="absolute left-0 w-6 h-6 bg-red-500 rounded-full border border-red-600 transform -rotate-12"></div>
                                        <div className="absolute right-0 w-6 h-6 bg-red-500 rounded-full border border-red-600 transform rotate-12"></div>
                                        <div className="absolute left-1/2 -translate-x-1/2 top-1 w-4 h-4 bg-red-400 rounded-full border border-red-500"></div>
                                    </div>
                                    <div className="absolute top-5 left-2 w-3 h-4 bg-slate-900 rounded-full overflow-hidden">
                                        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-blue-400 rounded-full opacity-50"></div>
                                    </div>
                                    <div className="absolute top-5 right-2 w-3 h-4 bg-slate-900 rounded-full overflow-hidden">
                                        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-blue-400 rounded-full opacity-50"></div>
                                    </div>
                                    <div className="absolute top-8 left-1.5 w-3 h-1.5 bg-pink-300/50 rounded-full blur-[1px]"></div>
                                    <div className="absolute top-8 right-1.5 w-3 h-1.5 bg-pink-300/50 rounded-full blur-[1px]"></div>
                                    
                                    {isAttacking ? (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-400 rounded-full border border-red-500"></div>
                                    ) : (
                                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-amber-600/30 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {isSkilling && (
                        <div className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none
                                ${playerState.direction === Direction.RIGHT ? 'left-1/2' : 'right-1/2 translate-x-1/2'}`}
                            style={{ width: 600, height: 600 }}>
                            
                            {playerState.job === Job.MAGE && (
                                <div className="w-full h-full relative -top-32 -left-32" style={{width: 800, height: 800}}>
                                    <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_#3b82f6]" viewBox="0 0 200 200" preserveAspectRatio="none">
                                        <path d="M100 0 L90 40 L120 60 L80 100 L110 130 L90 200" stroke="white" strokeWidth="4" fill="none" className="animate-pulse" />
                                        <path d="M120 0 L100 50 L140 70 L110 200" stroke="#60a5fa" strokeWidth="3" fill="none" className="animate-pulse delay-75" />
                                        <path d="M80 0 L60 30 L90 50 L50 200" stroke="#93c5fd" strokeWidth="2" fill="none" className="animate-pulse delay-100" />
                                        <circle cx="100" cy="180" r="40" fill="#60a5fa" fillOpacity="0.3" className="animate-ping" />
                                    </svg>
                                </div>
                            )}

                            {playerState.job === Job.THIEF && (
                                <div className="w-full h-full flex justify-center items-center" style={{ transform: `translateX(${playerState.direction === Direction.RIGHT ? 100 : -100}px)` }}>
                                    <div className="w-72 h-72 relative animate-spin-super-fast opacity-95">
                                        <div className="absolute inset-0 animate-pulse opacity-50 blur-md">
                                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                                                <path d="M50 0 L65 35 L100 50 L65 65 L50 100 L35 65 L0 50 L35 35 Z" fill="#7e22ce" />
                                            </svg>
                                        </div>
                                        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                                            <defs>
                                                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#e2e8f0" />
                                                    <stop offset="50%" stopColor="#64748b" />
                                                    <stop offset="100%" stopColor="#0f172a" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M50 0 L65 35 L100 50 L65 65 L50 100 L35 65 L0 50 L35 35 Z" fill="url(#metalGrad)" stroke="#334155" strokeWidth="1" />
                                            <circle cx="50" cy="50" r="12" fill="#1e1b4b" stroke="#a5b4fc" strokeWidth="2" />
                                            <circle cx="50" cy="50" r="6" fill="#a5b4fc" className="animate-pulse"/>
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isAttacking && attackFrame > 2 && attackFrame < 12 && playerState.job !== Job.MAGE && playerState.job !== Job.THIEF && playerState.job !== Job.BEGINNER && (
                        <div className={`absolute -top-16 -right-20 w-48 h-48 pointer-events-none z-30 ${playerState.direction === Direction.LEFT ? 'scale-x-[-1] -left-20' : ''}`}>
                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-lg">
                                <path d="M 20 80 Q 60 10 90 20" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" className="opacity-80" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* DAMAGE NUMBERS */}
                {damageNumbers.map(dn => (
                    <div key={dn.id} className={`absolute font-black pointer-events-none whitespace-nowrap text-center animate-bounce-damage will-change-transform
                            ${dn.type === 'HEAL' ? 'text-green-400' : dn.type === 'MP_HEAL' ? 'text-blue-400' : dn.type === 'GOLD' ? 'text-yellow-300' : (dn.isCrit ? 'text-red-500 text-4xl' : 'text-white text-2xl')}
                        `}
                        style={{ left: dn.position.x, top: dn.position.y, textShadow: '2px 2px 0px #000', transform: `translateY(${dn.life < 50 ? (50 - dn.life) * -1 : 0}px)`, opacity: dn.life / 40 }}>
                        {dn.type === 'HEAL' || dn.type === 'GOLD' || dn.type === 'MP_HEAL' ? '+' : ''}{dn.value}{dn.type === 'GOLD' && 'G'}{dn.isCrit && '!'}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
