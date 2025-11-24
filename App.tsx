
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameMode, Gender } from './types';
import { Play, Users, Save, RotateCcw, User, UserCheck, Smartphone } from 'lucide-react';
import { hasSaveFile } from './utils/storage';

export const generateId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TITLE);
  const [selectedGender, setSelectedGender] = useState<Gender>(Gender.MALE);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
        // Simple check: if height > width, it's likely portrait on mobile
        setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handleStart = (mode: GameMode) => {
    setShouldLoad(false);
    setGameMode(mode);
  };

  const handleLoad = () => {
    if (hasSaveFile()) {
        setShouldLoad(true);
        setGameMode(GameMode.SINGLE);
    } else {
        alert('저장된 파일이 없습니다!');
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-slate-950 overflow-hidden relative">
      
      {/* --- PORTRAIT WARNING OVERLAY --- */}
      {isPortrait && (
          <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center text-center p-8 text-white animate-in fade-in duration-300">
              <div className="mb-8 animate-bounce">
                  <Smartphone size={64} className="rotate-90" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-amber-400">가로 모드 권장</h2>
              <p className="text-slate-300 leading-relaxed">
                  원활한 게임 플레이를 위해<br/>
                  화면을 <span className="text-yellow-300 font-bold">가로로 회전</span>해주세요.
              </p>
          </div>
      )}

      {gameMode === GameMode.TITLE ? (
        <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-600 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center scale-90 md:scale-100">
            <div className="mb-8 text-center">
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-orange-600 drop-shadow-[0_5px_0_rgba(0,0,0,0.5)] tracking-tight transform -rotate-2">
                메이플 리액트
                </h1>
                <p className="text-slate-400 mt-2 font-mono text-sm tracking-widest">브라우저 RPG 어드벤처</p>
            </div>

            {/* Gender Selector */}
            <div className="mb-8 flex gap-4 bg-slate-800/50 p-2 rounded-full border border-slate-700">
                <button 
                    onClick={() => setSelectedGender(Gender.MALE)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${selectedGender === Gender.MALE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <User size={16} /> 남성
                </button>
                <button 
                    onClick={() => setSelectedGender(Gender.FEMALE)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${selectedGender === Gender.FEMALE ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <UserCheck size={16} /> 여성
                </button>
            </div>

            <div className="flex flex-col gap-3 w-72">
                {hasSaveFile() && (
                    <button 
                    onClick={handleLoad}
                    className="group relative bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border-2 border-slate-600 hover:border-green-400 transition-all shadow-xl flex items-center gap-4"
                >
                    <div className="bg-green-500 p-2 rounded-lg text-slate-900 group-hover:scale-110 transition-transform">
                    <Save size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                    <div className="font-bold text-lg">이어하기</div>
                    <div className="text-[10px] text-slate-400">저장된 게임 불러오기</div>
                    </div>
                </button>
                )}

                <button 
                onClick={() => handleStart(GameMode.SINGLE)}
                className="group relative bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border-2 border-slate-600 hover:border-amber-400 transition-all shadow-xl flex items-center gap-4"
                >
                <div className="bg-amber-500 p-2 rounded-lg text-slate-900 group-hover:scale-110 transition-transform">
                    <Play size={20} fill="currentColor" />
                </div>
                <div className="text-left">
                    <div className="font-bold text-lg">새 게임 시작</div>
                    <div className="text-[10px] text-slate-400">싱글 플레이 (데이터 초기화)</div>
                </div>
                </button>

                <button 
                onClick={() => handleStart(GameMode.MULTI)}
                className="group relative bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border-2 border-slate-600 hover:border-cyan-400 transition-all shadow-xl flex items-center gap-4"
                >
                <div className="bg-cyan-500 p-2 rounded-lg text-slate-900 group-hover:scale-110 transition-transform">
                    <Users size={20} fill="currentColor" />
                </div>
                <div className="text-left">
                    <div className="font-bold text-lg">멀티 플레이</div>
                    <div className="text-[10px] text-slate-400">AI 봇들과 함께하기</div>
                </div>
                </button>
            </div>
            
            <div className="mt-12 text-xs text-slate-600 font-mono">
                Powered by Gemini AI • React 19
            </div>
            </div>
        </div>
      ) : (
        <GameCanvas 
            mode={gameMode} 
            gender={selectedGender}
            shouldLoad={shouldLoad}
            onBack={() => setGameMode(GameMode.TITLE)} 
        />
      )}
    </div>
  );
}

export default App;
