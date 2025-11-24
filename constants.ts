

import { ItemType, Job } from './types';

// Physics
export const GRAVITY = 0.6;
export const FRICTION = 0.82;
export const MOVE_SPEED = 1.2;
export const MAX_SPEED = 5.5;
export const JUMP_FORCE = -13;
export const FLOOR_Y = 480;
export const ATTACK_RANGE = 100; // Default range (Warrior)
export const ATTACK_COOLDOWN = 25; 
export const SPAWN_RATE = 60; 

// Skills & Auto
export const SKILL_COOLDOWN = 120; 
export const SKILL_MP_COST = 15;
export const SKILL_RANGE = 400; // Increased for better visuals
export const AUTO_HUNT_DETECT_RANGE = 1200; // Increased significantly
export const AUTO_POTION_HP_THRESHOLD = 0.4; // 40%
export const AUTO_POTION_MP_THRESHOLD = 0.3; // 30%
export const POTION_COOLDOWN = 60; // Frames

// Job Specifics
export const JOB_STATS = {
  [Job.BEGINNER]: { attackDelay: 25, range: 80, speed: 1.2 },
  [Job.WARRIOR]: { attackDelay: 30, range: 130, speed: 1.1 },
  [Job.MAGE]: { attackDelay: 28, range: 400, speed: 1.15 },
  [Job.THIEF]: { attackDelay: 18, range: 250, speed: 1.45 },
};

// Upgrade Costs
export const WEAPON_ENHANCE_BASE_COST = 500;
export const POTION_MASTERY_COST = 1000;

// World
export const WORLD_WIDTH = 3000; 
export const VIEWPORT_WIDTH = 1024;
export const VIEWPORT_HEIGHT = 600;
export const TOWN_BORDER_X = 800;

// Keys
export const KEY_MAPPING = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  JUMP: 'Space',
  ATTACK: 'KeyZ',
  SKILL: 'KeyS',
  INTERACT: 'KeyX',
  INVENTORY: 'KeyI',
  ESCAPE: 'Escape',
  AUTO: 'KeyA',
  ENTER: 'Enter'
};

// Boss Variants
export const BOSS_VARIANTS = {
  MUSHMOM: { hp: 30000, damage: 200, width: 150, height: 150, exp: 5000, name: "머쉬맘" },
  KING_SLIME: { hp: 40000, damage: 250, width: 180, height: 140, exp: 8000, name: "킹슬라임" },
  BALROG: { hp: 50000, damage: 300, width: 200, height: 180, exp: 12000, name: "주니어 발록" }
};

// Items Database
export const ITEM_DB = {
  'red_potion': {
    id: 'red_potion',
    name: '빨간 포션',
    type: ItemType.CONSUMABLE,
    icon: '❤️',
    description: 'HP를 50 회복합니다.',
    stats: { heal: 50 },
    color: 'bg-red-500',
    price: 50
  },
  'blue_potion': {
    id: 'blue_potion',
    name: '파란 포션',
    type: ItemType.CONSUMABLE,
    icon: '💙',
    description: 'MP를 30 회복합니다.',
    stats: { mpHeal: 30 },
    color: 'bg-blue-500',
    price: 100
  },
  'wooden_sword': {
    id: 'wooden_sword',
    name: '목검',
    type: ItemType.WEAPON,
    icon: '🗡️',
    description: '초보자를 위한 연습용 검.',
    stats: { damage: 10 },
    color: 'bg-amber-700',
    price: 150
  },
  'iron_sword': {
    id: 'iron_sword',
    name: '강철검',
    type: ItemType.WEAPON,
    icon: '⚔️',
    description: '날카롭고 묵직한 검.',
    stats: { damage: 25 },
    color: 'bg-slate-400',
    price: 500
  },
  'golden_sword': {
    id: 'golden_sword',
    name: '황금검',
    type: ItemType.WEAPON,
    icon: '🔱',
    description: '찬란하게 빛나는 명검.',
    stats: { damage: 55 },
    color: 'bg-yellow-400',
    price: 2000
  },
  'magic_wand': {
    id: 'magic_wand',
    name: '나무 완드',
    type: ItemType.WEAPON,
    icon: '🪄',
    description: '마력을 증폭시키는 지팡이.',
    stats: { damage: 30 },
    color: 'bg-purple-400',
    price: 800
  },
  'thief_dagger': {
    id: 'thief_dagger',
    name: '단검',
    type: ItemType.WEAPON,
    icon: '🗡',
    description: '가볍고 날카로운 단검.',
    stats: { damage: 20 },
    color: 'bg-slate-600',
    price: 700
  },
  'slime_bubble': {
    id: 'slime_bubble',
    name: '슬라임 방울',
    type: ItemType.ETC,
    icon: '💧',
    description: '끈적끈적한 액체.',
    color: 'bg-green-300',
    price: 10
  },
  'mushroom_cap': {
    id: 'mushroom_cap',
    name: '버섯의 갓',
    type: ItemType.ETC,
    icon: '🍄',
    description: '쫄깃해보이는 버섯 갓.',
    color: 'bg-orange-300',
    price: 25
  }
};

export const BOT_MESSAGES = [
  "강철검 500골드에 팝니다@@",
  "파티 퀘스트 하실 분?",
  "님 쩔좀",
  "님 데미지 굿",
  "히든 스트리트 어디임?",
  "ㅎㅎㅋㅋ",
  "길드원 구해요~ 매너인만",
  "100골드만 기부좀요 ㅠㅠ",
  "@@@@@@@@@@"
];