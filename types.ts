

export enum Direction {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  OTHER_PLAYER = 'OTHER_PLAYER',
  SLIME = 'SLIME',
  MUSHROOM = 'MUSHROOM',
  PIG = 'PIG',
  BOSS = 'BOSS',
  NPC = 'NPC',
  ITEM_DROP = 'ITEM_DROP',
  GOLD_DROP = 'GOLD_DROP',
  PROJECTILE = 'PROJECTILE',
  EFFECT = 'EFFECT' // Added for Hit Visuals
}

export enum GameMode {
  TITLE = 'TITLE',
  SINGLE = 'SINGLE',
  MULTI = 'MULTI'
}

export enum ItemType {
  WEAPON = 'WEAPON',
  CONSUMABLE = 'CONSUMABLE',
  ETC = 'ETC'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum Job {
  BEGINNER = 'BEGINNER',
  WARRIOR = 'WARRIOR',
  MAGE = 'MAGE',
  THIEF = 'THIEF'
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'SYSTEM' | 'USER' | 'BOT';
  timestamp: number;
}

export interface Item {
  id: string;
  dbId: string;
  name: string;
  type: ItemType;
  icon: string;
  description: string;
  stats?: {
    damage?: number;
    heal?: number;
    mpHeal?: number;
  };
  color: string;
  price: number;
  enhancement?: number; // +1, +2...
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  direction: Direction;
  isGrounded: boolean;
  state: 'IDLE' | 'WALK' | 'JUMP' | 'ATTACK' | 'SKILL' | 'HIT' | 'DEAD';
  hp: number;
  maxHp: number;
  damage: number;
  expValue: number;
  color: string;
  name?: string;
  chatMessage?: string;
  chatTimer?: number;
  value?: number;
  
  // AI Props
  aiTimer?: number;
  aiAction?: 'IDLE' | 'WALK' | 'JUMP_WALK' | 'CHASE' | 'ATTACK_RANGED';
  targetId?: string;
  bossType?: string;
  deathTimer?: number;
  
  // Projectile Props
  pierce?: number;
  hitIds?: string[];
  
  // Effect Props
  lifeTime?: number;
  maxLifeTime?: number;
}

export interface PlayerSettings {
  autoHpThreshold: number; // 0.0 to 1.0
  autoMpThreshold: number; // 0.0 to 1.0
}

export interface Player extends Entity {
  gender: Gender;
  job: Job; // New Job field
  level: number;
  currentExp: number;
  maxExp: number;
  mp: number;
  maxMp: number;
  iframe: number;
  gold: number;
  skillCooldown: number;
  
  // Automation & Mastery
  autoHunt: boolean;
  potionMastery: number; // Level of potion efficiency
  potionCooldown: number;
  settings: PlayerSettings; // New Settings

  inventory: Item[];
  equipment: {
    weapon: Item | null;
  };
  stats: {
    baseDamage: number;
    str: number;
    dex: number;
    int: number; // Added INT for Mage
    luk: number; // Added LUK for Thief
  };
}

export interface DamageNumber {
  id: string;
  value: number;
  position: Vector2;
  life: number;
  isCrit: boolean;
  type: 'DAMAGE' | 'HEAL' | 'MP_HEAL' | 'EXP' | 'GOLD';
}

export interface Quest {
  title: string;
  description: string;
  isActive: boolean;
  rewardExp: number;
  isCompleted: boolean;
}