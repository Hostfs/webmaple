
import React, { useState, useEffect, useRef } from 'react';
import { Player, Quest, Item, ItemType, Job, ChatMessage } from '../types';
import { Scroll, Sword, Shield, X, Coins, ShoppingBag, LogOut, Zap, PlayCircle, PauseCircle, Hammer, FlaskConical, ShieldCheck, Sparkles, Footprints, Settings, ArrowBigUp, ArrowBigDown, ArrowBigLeft, ArrowBigRight, Crosshair, MessageCircle, Backpack } from 'lucide-react';
import { ITEM_DB, WEAPON_ENHANCE_BASE_COST, POTION_MASTERY_COST } from '../constants';

interface UIOverlayProps {
  player: Player;
  quest: Quest | null;
  onQuestClick: () => void;
  loadingQuest: boolean;
  showInventory: boolean;
  toggleInventory: () => void;
  onEquipItem: (item: Item) => void;
  onDropItem: (item: Item) => void;
  dialogue: { name: string; text: string; isShop?: boolean } | null;
  onCloseDialogue: () => void;
  showQuitModal: boolean;
  onQuit: () => void;
  onCancelQuit: () => void;
  onBuyItem: (itemKey: string) => void;
  onSellItem: (item: Item) => void;
  toggleAutoHunt: () => void;
  onEnhanceItem: (item: Item) => void;
  onUpgradeMastery: () => void;
  onChangeJob: (job: Job) => void;
  onUpdateSettings: (type: 'hp' | 'mp', val: number) => void;
  
  // Virtual Inputs for Mobile
  onVirtualInput: (key: string, pressed: boolean) => void;

  // Chat
  chatLog: ChatMessage[];
  isChatActive: boolean;
  onSendChat: (text: string) => void;
  onToggleChat: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  player, quest, onQuestClick, loadingQuest, 
  showInventory, toggleInventory, onEquipItem, onDropItem,
  dialogue, onCloseDialogue,
  showQuitModal, onQuit, onCancelQuit, onBuyItem, onSellItem,
  toggleAutoHunt, onEnhanceItem, onUpgradeMastery, onChangeJob,
  onUpdateSettings, onVirtualInput,
  chatLog, isChatActive, onSendChat, onToggleChat
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const expPercentage = Math.min(100, (player.currentExp / player.maxExp) * 100);

  useEffect(() => {
      const checkMobile = () => window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
      setIsMobile(checkMobile());
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isChatActive && chatInputRef.current) {
        chatInputRef.current.focus();
    }
  }, [isChatActive]);

  useEffect(() => {
      if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatLog]);

  const handleChatSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (chatInput.trim()) {
          onSendChat(chatInput);
          setChatInput("");
      } else {
          onToggleChat(); // Close if empty
      }
  };

  const getJobIcon = (job: Job) => {
      switch(job) {
          case Job.WARRIOR: return <ShieldCheck size={12} />;
          case Job.MAGE: return <Sparkles size={12} />;
          case Job.THIEF: return <Footprints size={12} />;
          default: return <Sword size={12} />;
      }
  };

  const getJobName = (job: Job) => {
      switch(job) {
          case Job.WARRIOR: return '전사';
          case Job.MAGE: return '마법사';
          case Job.THIEF: return '도적';
          default: return '초보자';
      }
  };

  // Count potions
  const redPotions = player.inventory.filter(i => i.dbId === 'red_potion').length;
  const bluePotions = player.inventory.filter(i => i.dbId === 'blue_potion').length;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-50 overflow-hidden"
         style={{
             paddingLeft: 'env(safe-area-inset-left)',
             paddingRight: 'env(safe-area-inset-right)',
             paddingTop: 'env(safe-area-inset-top)',
             paddingBottom: 'env(safe-area-inset-bottom)'
         }}>
      
      {/* --- TOP CENTER GOLD --- */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <div className="bg-slate-900/90 px-4 py-1 md:px-6 md:py-2 rounded-full border-2 border-yellow-500 flex items-center gap-2 shadow-lg animate-in slide-in-from-top-4 scale-90 md:scale-100 origin-top">
              <Coins className="text-yellow-400 animate-pulse" size={16} />
              <span className="text-yellow-300 font-bold text-lg font-mono">{player.gold.toLocaleString()} G</span>
          </div>
      </div>

      {/* --- TOP HUD CONTAINER --- */}
      <div className="flex justify-between items-start p-2 md:p-4 w-full">
        
        {/* LEFT SIDE: STATS + POTIONS */}
        <div className="flex items-start gap-2 scale-90 md:scale-100 origin-top-left">
            {/* Player Stats */}
            <div className="bg-slate-900/90 p-2 md:p-3 rounded-xl border-2 border-slate-600/50 backdrop-blur-sm w-56 md:w-72 pointer-events-auto shadow-lg">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-amber-100 rounded-lg border-2 border-amber-300 overflow-hidden relative shadow-inner shrink-0">
                    {/* Simple Portrait */}
                    {player.gender === 'FEMALE' ? (
                        <>
                            <div className="absolute -top-1 -left-1 w-14 h-12 bg-pink-200/30 rounded-full mix-blend-multiply"></div>
                            <div className="absolute top-4 left-2.5 w-1.5 h-2 bg-black rounded-full"></div>
                            <div className="absolute top-4 right-2.5 w-1.5 h-2 bg-black rounded-full"></div>
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-3 h-1 bg-red-300 rounded-full"></div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-4 left-3 w-1 h-3 bg-black rounded-full"></div>
                            <div className="absolute top-4 right-3 w-1 h-3 bg-black rounded-full"></div>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/20 rounded-full"></div>
                        </>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end">
                        <h2 className="font-bold text-amber-400 text-base md:text-lg leading-none drop-shadow-sm truncate">{player.name}</h2>
                        <span className="text-xs text-slate-400 font-mono bg-slate-800 px-1 rounded whitespace-nowrap">Lv.{player.level}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <div className="text-[10px] text-slate-300 flex items-center gap-1">
                            {getJobIcon(player.job)} {getJobName(player.job)}
                        </div>
                        <div className="text-[10px] text-green-400 flex items-center gap-1" title="물약 효율">
                            <FlaskConical size={10} /> Lv.{player.potionMastery}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* HP Bar */}
            <div className="space-y-1 mb-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>HP</span>
                    <span>{Math.floor(player.hp)}/{player.maxHp}</span>
                </div>
                <div className="relative h-2 md:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200"
                        style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
                    ></div>
                    <div className="absolute top-0 w-full h-full flex items-center justify-end px-1">
                        {player.settings.autoHpThreshold > 0 && <div className="h-full w-0.5 bg-white/50" style={{position:'absolute', left: `${player.settings.autoHpThreshold * 100}%`}}></div>}
                    </div>
                </div>
            </div>

            {/* MP Bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>MP</span>
                    <span>{Math.floor(player.mp)}/{player.maxMp}</span>
                </div>
                <div className="relative h-2 md:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-200"
                        style={{ width: `${Math.max(0, (player.mp / player.maxMp) * 100)}%` }}
                    ></div>
                    <div className="absolute top-0 w-full h-full flex items-center justify-end px-1">
                        {player.settings.autoMpThreshold > 0 && <div className="h-full w-0.5 bg-white/50" style={{position:'absolute', left: `${player.settings.autoMpThreshold * 100}%`}}></div>}
                    </div>
                </div>
            </div>

            {/* JOB SELECTOR */}
            <div className="mt-2 flex gap-1 justify-between">
                {[Job.BEGINNER, Job.WARRIOR, Job.MAGE, Job.THIEF].map(job => (
                    <button 
                        key={job}
                        onClick={() => onChangeJob(job)}
                        className={`flex-1 py-1 text-[9px] rounded border ${player.job === job ? 'bg-amber-500 text-black border-amber-300 font-bold' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                    >
                        {getJobName(job).slice(0,2)}
                    </button>
                ))}
            </div>
            </div>

            {/* POTION SLOTS (Moved here) */}
            <div className="flex flex-col gap-2 pointer-events-auto">
                <button className={`relative group active:scale-95 transition-transform ${player.potionCooldown > 0 ? 'opacity-50' : ''}`}>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900/90 border-2 border-slate-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                        <span className="text-xl md:text-2xl">❤️</span>
                        <span className="absolute bottom-0 right-1 text-[10px] md:text-xs font-bold text-white drop-shadow-md">x{redPotions}</span>
                        {/* Cooldown Overlay */}
                        {player.potionCooldown > 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                                {Math.ceil(player.potionCooldown/60)}
                            </div>
                        )}
                    </div>
                    {!isMobile && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 text-[10px] bg-black/80 px-1.5 py-0.5 rounded text-white whitespace-nowrap hidden group-hover:block z-10">
                            자동 {Math.floor(player.settings.autoHpThreshold * 100)}%
                        </div>
                    )}
                </button>
                <button className={`relative group active:scale-95 transition-transform ${player.potionCooldown > 0 ? 'opacity-50' : ''}`}>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900/90 border-2 border-slate-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                        <span className="text-xl md:text-2xl">💙</span>
                        <span className="absolute bottom-0 right-1 text-[10px] md:text-xs font-bold text-white drop-shadow-md">x{bluePotions}</span>
                        {/* Cooldown Overlay */}
                        {player.potionCooldown > 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                                {Math.ceil(player.potionCooldown/60)}
                            </div>
                        )}
                    </div>
                    {!isMobile && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 text-[10px] bg-black/80 px-1.5 py-0.5 rounded text-white whitespace-nowrap hidden group-hover:block z-10">
                            자동 {Math.floor(player.settings.autoMpThreshold * 100)}%
                        </div>
                    )}
                </button>
            </div>
        </div>

        {/* Right Side Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 scale-90 md:scale-100 origin-top-right">
            {/* Settings Button */}
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-slate-800 border-2 border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
                <Settings size={20} />
            </button>

            {/* Auto Hunt Button */}
            {!isMobile && (
                <button 
                    onClick={toggleAutoHunt}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-bold border-b-4 shadow-lg transition-all active:border-b-0 active:translate-y-1 text-sm md:text-base
                        ${player.autoHunt 
                            ? 'bg-red-600 hover:bg-red-500 border-red-800 text-white animate-pulse' 
                            : 'bg-slate-700 hover:bg-slate-600 border-slate-900 text-slate-300'
                        }`}
                >
                    {player.autoHunt ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    <span className="hidden md:inline">{player.autoHunt ? '자동사냥 ON' : '자동사냥 OFF'}</span>
                </button>
            )}

            <button 
                onClick={onQuestClick}
                disabled={loadingQuest}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 rounded-lg font-bold border-b-4 border-indigo-800 shadow-lg active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 text-sm md:text-base"
            >
                <Scroll size={18} />
                <span className="hidden md:inline">{loadingQuest ? '수신 중...' : '퀘스트'}</span>
            </button>

            {quest && quest.isActive && (
                <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 p-4 rounded-lg shadow-xl w-64 md:w-72 animate-in slide-in-from-right-10 duration-300 relative">
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-amber-50 border-l-2 border-b-2 border-amber-200 transform rotate-45"></div>
                    <h3 className="font-bold text-sm mb-1 flex justify-between items-center border-b border-amber-200 pb-1">
                        {quest.title}
                        <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full border border-green-200">EXP +{quest.rewardExp}</span>
                    </h3>
                    <p className="text-xs italic opacity-80 leading-relaxed mt-1">"{quest.description}"</p>
                </div>
            )}
        </div>
      </div>

      {/* --- CHAT LOG (BOTTOM LEFT) --- */}
      <div className={`absolute left-4 z-40 w-80 max-h-48 flex flex-col justify-end pointer-events-auto ${isMobile ? 'bottom-56 w-60' : 'bottom-16'}`}>
         <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-2 overflow-y-auto max-h-40 shadow-xl mask-fade-top scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
             {chatLog.map((msg) => (
                 <div key={msg.id} className="text-xs mb-1 last:mb-0 break-words leading-relaxed animate-in slide-in-from-left-2 duration-200">
                     {msg.type === 'SYSTEM' ? (
                         <span className="text-yellow-400 font-bold">[시스템] {msg.text}</span>
                     ) : msg.type === 'BOT' ? (
                         <span className="text-slate-300"><span className="text-blue-400 font-bold">{msg.sender}:</span> {msg.text}</span>
                     ) : (
                         <span className="text-white"><span className="text-amber-400 font-bold">{msg.sender}:</span> {msg.text}</span>
                     )}
                 </div>
             ))}
             <div ref={chatEndRef}></div>
         </div>
         
         {/* INPUT */}
         {isChatActive && (
            <form onSubmit={handleChatSubmit} className="mt-2 relative">
                <input 
                    ref={chatInputRef}
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    onBlur={() => { if (!chatInput) onToggleChat(); }}
                    className="w-full bg-slate-800/90 text-white border border-amber-500 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-lg"
                    placeholder="메시지 입력 (Enter로 전송)"
                    onKeyDown={(e) => e.stopPropagation()} // Stop game input
                />
            </form>
         )}
         {!isChatActive && (
             <div className="mt-1 text-[10px] text-slate-500 bg-black/40 px-2 py-0.5 rounded w-fit backdrop-blur-sm">
                 [Enter] 키를 눌러 채팅
             </div>
         )}
      </div>

      {/* --- VIRTUAL CONTROLS (MOBILE ONLY) --- */}
      {isMobile && (
          <div className="absolute bottom-10 left-0 w-full h-40 px-6 pb-2 flex justify-between items-end pointer-events-auto z-50 select-none touch-none bg-gradient-to-t from-black/80 to-transparent">
              {/* D-PAD */}
              <div className="relative w-36 h-36 mb-2">
                  <div className="absolute inset-0 bg-black/20 rounded-full blur-md"></div>
                  <button className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-14 bg-slate-800/90 rounded-t-lg border border-slate-600 flex items-center justify-center active:bg-amber-500"
                    onPointerDown={() => onVirtualInput('ArrowUp', true)} onPointerUp={() => onVirtualInput('ArrowUp', false)} onPointerLeave={() => onVirtualInput('ArrowUp', false)}>
                      <ArrowBigUp size={28} className="text-white"/>
                  </button>
                  <button className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-14 bg-slate-800/90 rounded-b-lg border border-slate-600 flex items-center justify-center active:bg-amber-500"
                    onPointerDown={() => onVirtualInput('ArrowDown', true)} onPointerUp={() => onVirtualInput('ArrowDown', false)} onPointerLeave={() => onVirtualInput('ArrowDown', false)}>
                      <ArrowBigDown size={28} className="text-white"/>
                  </button>
                  <button className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-12 bg-slate-800/90 rounded-l-lg border border-slate-600 flex items-center justify-center active:bg-amber-500"
                    onPointerDown={() => onVirtualInput('ArrowLeft', true)} onPointerUp={() => onVirtualInput('ArrowLeft', false)} onPointerLeave={() => onVirtualInput('ArrowLeft', false)}>
                      <ArrowBigLeft size={28} className="text-white"/>
                  </button>
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-12 bg-slate-800/90 rounded-r-lg border border-slate-600 flex items-center justify-center active:bg-amber-500"
                    onPointerDown={() => onVirtualInput('ArrowRight', true)} onPointerUp={() => onVirtualInput('ArrowRight', false)} onPointerLeave={() => onVirtualInput('ArrowRight', false)}>
                      <ArrowBigRight size={28} className="text-white"/>
                  </button>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 rounded-full"></div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-6 items-end mb-4 pr-4">
                   {/* Utilities */}
                   <div className="flex flex-col gap-5 mb-2 mr-2">
                      <button onClick={toggleInventory} className="w-14 h-14 bg-slate-700/80 rounded-full border-2 border-slate-500 flex items-center justify-center active:scale-95 text-white shadow-lg backdrop-blur-sm">
                          <Backpack size={24} />
                      </button>
                      <button onClick={toggleAutoHunt} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center active:scale-95 text-white shadow-lg backdrop-blur-sm ${player.autoHunt ? 'bg-red-600/80 border-red-400 animate-pulse' : 'bg-slate-700/80 border-slate-500'}`}>
                          <PlayCircle size={24} />
                      </button>
                   </div>
                   
                   {/* Actions */}
                  <div className="flex gap-4 items-end">
                      <div className="flex flex-col gap-4 pb-2">
                        <button className="w-16 h-16 bg-indigo-600/90 rounded-full border-2 border-indigo-400 flex items-center justify-center active:bg-indigo-400 active:scale-95 shadow-lg relative overflow-hidden"
                            onPointerDown={() => onVirtualInput('KeyS', true)} onPointerUp={() => onVirtualInput('KeyS', false)} onPointerLeave={() => onVirtualInput('KeyS', false)}>
                            <span className="font-bold text-white text-xl">S</span>
                            {/* MP check overlay */}
                            {player.mp < 15 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-blue-300">MP부족</div>}
                        </button>
                         <button className="w-16 h-16 bg-green-600/90 rounded-full border-2 border-green-400 flex items-center justify-center active:bg-green-400 active:scale-95 shadow-lg"
                            onPointerDown={() => onVirtualInput('KeyX', true)} onPointerUp={() => onVirtualInput('KeyX', false)} onPointerLeave={() => onVirtualInput('KeyX', false)}>
                            <span className="font-bold text-white text-xs">PICK</span>
                        </button>
                      </div>
                      <div className="flex flex-col gap-4">
                        <button className="w-24 h-24 bg-red-600/90 rounded-full border-4 border-red-400 flex items-center justify-center active:bg-red-400 active:scale-95 shadow-xl"
                            onPointerDown={() => onVirtualInput('KeyZ', true)} onPointerUp={() => onVirtualInput('KeyZ', false)} onPointerLeave={() => onVirtualInput('KeyZ', false)}>
                            <Sword size={48} className="text-white"/>
                        </button>
                        <button className="w-24 h-24 bg-amber-500/90 rounded-full border-4 border-amber-300 flex items-center justify-center active:bg-amber-400 active:scale-95 shadow-xl"
                            onPointerDown={() => onVirtualInput('Space', true)} onPointerUp={() => onVirtualInput('Space', false)} onPointerLeave={() => onVirtualInput('Space', false)}>
                            <span className="font-bold text-white text-lg">JUMP</span>
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 pointer-events-auto p-4">
              <div className="bg-slate-800 p-6 rounded-xl border-2 border-slate-500 shadow-2xl w-full max-w-xs">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold flex items-center gap-2"><Settings size={20}/> 게임 설정</h3>
                      <button onClick={() => setShowSettings(false)}><X className="text-slate-400 hover:text-white" /></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs text-red-400 font-bold mb-1 block">자동 HP 물약 사용 ({Math.floor(player.settings.autoHpThreshold * 100)}%)</label>
                          <input 
                            type="range" min="0" max="90" step="5" 
                            value={player.settings.autoHpThreshold * 100}
                            onChange={(e) => onUpdateSettings('hp', parseInt(e.target.value))}
                            className="w-full accent-red-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-blue-400 font-bold mb-1 block">자동 MP 물약 사용 ({Math.floor(player.settings.autoMpThreshold * 100)}%)</label>
                          <input 
                            type="range" min="0" max="90" step="5" 
                            value={player.settings.autoMpThreshold * 100}
                            onChange={(e) => onUpdateSettings('mp', parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                  </div>
                  <div className="mt-6 text-center text-[10px] text-slate-500">
                      144Hz/120Hz 지원됨
                  </div>
              </div>
          </div>
      )}

      {/* --- DIALOGUE / SHOP MODAL --- */}
      {dialogue && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-[1px] p-4">
              <div className="bg-white w-full max-w-xl rounded-xl border-4 border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                  <div className="bg-slate-800 text-white px-4 py-2 font-bold flex justify-between items-center shrink-0">
                      <span>{dialogue.name}</span>
                      <button onClick={onCloseDialogue} className="text-slate-400 hover:text-white"><X size={16}/></button>
                  </div>
                  <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 overflow-y-auto">
                      <div className="w-20 h-20 bg-purple-100 rounded-full border-4 border-purple-300 shrink-0 flex items-center justify-center text-4xl shadow-inner self-center md:self-start">🧙‍♂️</div>
                      <div className="flex-1">
                         <p className="text-slate-800 text-base md:text-lg font-medium leading-relaxed mb-4">{dialogue.text}</p>
                         
                         {/* SHOP UI */}
                         {dialogue.isShop && (
                             <div className="flex flex-col gap-4">
                                 {/* Mastery Upgrade */}
                                 <div className="bg-green-50 p-3 rounded border border-green-200 flex flex-col md:flex-row justify-between items-center gap-2">
                                     <div className="text-center md:text-left">
                                         <div className="font-bold text-green-800 flex items-center justify-center md:justify-start gap-1"><FlaskConical size={16}/> 물약 마스터리</div>
                                         <div className="text-xs text-green-600">현재 레벨: {player.potionMastery} (회복량 +{player.potionMastery * 10}%)</div>
                                     </div>
                                     <button 
                                        onClick={onUpgradeMastery}
                                        disabled={player.gold < POTION_MASTERY_COST}
                                        className={`px-3 py-1 rounded text-xs font-bold border-b-2 w-full md:w-auto ${player.gold >= POTION_MASTERY_COST ? 'bg-green-500 hover:bg-green-400 text-white border-green-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                                     >
                                         업그레이드 ({POTION_MASTERY_COST} G)
                                     </button>
                                 </div>

                                 {/* Item List */}
                                 <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                                     <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><ShoppingBag size={16}/> 상점 물품</h4>
                                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                         {['red_potion', 'blue_potion', 'iron_sword', 'magic_wand', 'thief_dagger'].map(key => {
                                             const item = ITEM_DB[key as keyof typeof ITEM_DB];
                                             const canAfford = player.gold >= item.price;
                                             return (
                                                 <button 
                                                    key={key}
                                                    onClick={() => onBuyItem(key)}
                                                    disabled={!canAfford}
                                                    className={`p-2 rounded border flex flex-col items-center gap-1 text-xs transition-all
                                                        ${canAfford ? 'bg-white hover:bg-amber-50 border-slate-300 hover:border-amber-400 cursor-pointer' : 'bg-slate-200 border-slate-200 opacity-50 cursor-not-allowed'}
                                                    `}
                                                 >
                                                     <span className="text-xl">{item.icon}</span>
                                                     <span className="font-bold truncate w-full text-center">{item.name}</span>
                                                     <span className="text-yellow-600 font-mono bg-yellow-100 px-1 rounded flex items-center gap-0.5">
                                                         <Coins size={8} /> {item.price}
                                                     </span>
                                                 </button>
                                             )
                                         })}
                                     </div>
                                 </div>
                             </div>
                         )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- INVENTORY MODAL --- */}
      {showInventory && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-50">
            <div className="bg-slate-800 border-4 border-slate-600 rounded-xl shadow-2xl w-[90vw] max-w-[400px] overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-slate-900 p-3 flex justify-between items-center border-b border-slate-700 shrink-0">
                    <h3 className="text-white font-bold tracking-wide flex items-center gap-2"><Sword size={16} /> 인벤토리</h3>
                    <div className="flex items-center gap-4">
                         <div className="text-yellow-400 font-mono text-sm flex items-center gap-1"><Coins size={14} /> {player.gold.toLocaleString()}</div>
                         <button onClick={toggleInventory} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                </div>
                
                {/* Equipment Section */}
                <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex gap-4 shrink-0">
                    <div className="w-16 h-16 bg-slate-900 border-2 border-slate-700 rounded-lg flex items-center justify-center relative group shrink-0">
                        {player.equipment.weapon ? (
                            <span className="text-2xl">{player.equipment.weapon.icon}</span>
                        ) : (
                            <Sword size={20} className="text-slate-700" />
                        )}
                        <span className="absolute bottom-0 right-0 bg-slate-700 text-[8px] text-white px-1 rounded-tl">무기</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="text-xs text-slate-400 space-y-1">
                            <div className="flex justify-between"><span>스공:</span> <span className="text-white font-bold">{player.stats.baseDamage + (player.equipment.weapon?.stats?.damage || 0)}</span></div>
                            <div className="flex justify-between"><span>힘(STR):</span> <span className="text-white font-bold">{player.stats.str}</span></div>
                        </div>
                        
                        {/* Enhance Button */}
                        {player.equipment.weapon && (
                            <button 
                                onClick={() => onEnhanceItem(player.equipment.weapon!)}
                                disabled={player.gold < WEAPON_ENHANCE_BASE_COST}
                                className={`mt-2 flex items-center justify-center gap-1 text-[10px] py-1 rounded border-b-2 font-bold
                                    ${player.gold >= WEAPON_ENHANCE_BASE_COST 
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-800' 
                                        : 'bg-slate-600 text-slate-400 border-slate-700 cursor-not-allowed'}`}
                            >
                                <Hammer size={10} /> 강화 ({WEAPON_ENHANCE_BASE_COST}G)
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="p-4 grid grid-cols-5 gap-2 bg-slate-700/30 overflow-y-auto flex-1 max-h-[40vh] scrollbar-thin scrollbar-thumb-slate-500">
                    {player.inventory.map((item, idx) => (
                        <div 
                            key={item.id} 
                            onClick={() => dialogue?.isShop ? onSellItem(item) : onEquipItem(item)}
                            className="aspect-square bg-slate-900 border border-slate-600 rounded hover:border-amber-400 hover:bg-slate-800 cursor-pointer flex items-center justify-center text-xl relative group transition-colors"
                        >
                            {item.icon}
                            {item.enhancement ? <span className="absolute top-0 right-0 text-[8px] bg-red-500 text-white px-0.5 rounded-bl font-bold">+{item.enhancement}</span> : null}
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-black/90 text-white text-xs p-2 rounded pointer-events-none hidden group-hover:block z-20 border border-slate-600 shadow-xl">
                                <div className="font-bold text-amber-400 border-b border-slate-700 pb-1 mb-1">
                                    {item.name} {item.enhancement ? `(+${item.enhancement})` : ''}
                                </div>
                                <div className="italic text-slate-300 mb-1">{item.description}</div>
                                {item.stats?.damage && <div className="text-red-300">공격력: +{item.stats.damage}</div>}
                                <div className="text-yellow-400 mb-1">가격: {Math.floor(item.price / 2)} G</div>
                            </div>
                        </div>
                    ))}
                    {/* Empty Slots filler */}
                    {Array.from({ length: Math.max(0, 25 - player.inventory.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-slate-900/50 border border-slate-700/50 rounded"></div>
                    ))}
                </div>
                <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-500 shrink-0">
                    {dialogue?.isShop ? "아이템을 클릭하여 50% 가격에 판매" : "아이템을 클릭하여 사용/장착"}
                </div>
            </div>
        </div>
      )}

      {/* --- QUIT MODAL --- */}
      {showQuitModal && (
          <div className="absolute inset-0 bg-black/70 z-[100] pointer-events-auto flex items-center justify-center">
              <div className="bg-slate-800 p-6 rounded-xl border-4 border-slate-600 text-center shadow-2xl animate-in zoom-in duration-200">
                  <h2 className="text-2xl font-bold text-white mb-4 flex flex-col items-center gap-2">
                      <LogOut size={48} className="text-red-400" />
                      게임 종료
                  </h2>
                  <p className="text-slate-400 mb-6">자동으로 저장되었습니다.</p>
                  <div className="flex gap-4 justify-center">
                      <button onClick={onQuit} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold border-b-4 border-red-800 active:border-b-0 active:translate-y-1">
                          나가기
                      </button>
                      <button onClick={onCancelQuit} className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded font-bold border-b-4 border-slate-800 active:border-b-0 active:translate-y-1">
                          취소
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- BOTTOM BAR (EXP) --- */}
      <div className={`w-full bg-slate-900 border-t-4 border-slate-700 relative shadow-[0_-4px_10px_rgba(0,0,0,0.5)] pointer-events-auto shrink-0 z-50 ${isMobile ? 'pb-2' : ''}`}>
        <div className="flex items-center h-4 md:h-6 lg:h-8">
            <div className="w-10 md:w-16 bg-slate-800 h-full flex items-center justify-center text-slate-400 text-[8px] md:text-xs font-bold border-r border-slate-700 shrink-0">EXP</div>
            <div className="flex-1 h-full relative bg-slate-900">
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-b from-yellow-300 to-amber-500 transition-all duration-300" 
                    style={{ width: `${expPercentage}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-white drop-shadow-md tracking-widest">
                    {Math.floor(expPercentage)}%
                </div>
            </div>
        </div>
        
        {/* Controls / Menu */}
        {!isMobile && (
            <div className="hidden lg:flex justify-between items-center px-4 py-1 bg-slate-950 text-[10px] text-slate-500 font-mono">
                <div className="flex gap-4">
                    <span>[Z] 공격</span>
                    <span>[S] 스킬</span>
                    <span>[A] 자동사냥</span>
                    <span>[I] 인벤토리</span>
                    <span>[SPACE] 점프</span>
                    <span>[ENTER] 채팅</span>
                </div>
                <div>MapleReact v5.0 (Impact & Mobile)</div>
            </div>
        )}
      </div>
    </div>
  );
};
