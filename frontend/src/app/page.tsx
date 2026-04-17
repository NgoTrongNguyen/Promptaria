'use client';

import { useState } from 'react';
import PixelCanvas from '@/components/PixelCanvas';
import ArenaCanvas from '@/components/ArenaCanvas';
import { predictWeapon, generateTerrain } from '@/lib/ml';

type Step = 'character' | 'weapon' | 'class' | 'stats' | 'game';

export default function Home() {
  const [step, setStep] = useState<Step>('character');
  const [characterData, setCharacterData] = useState<number[]>(new Array(32 * 32).fill(0));
  const [weaponData, setWeaponData] = useState<number[]>(new Array(16 * 16).fill(0));
  const [selectedClass, setSelectedClass] = useState<'melee' | 'ranged'>('melee');
  const [stats, setStats] = useState({ hp: 100, atk: 10, spd: 5, range: 5 });
  const [terrain, setTerrain] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');

  const startGeneration = async () => {
    setLoading(true);
    try {
      const { similarities } = await predictWeapon(weaponData, 16);
      const terrainData = await generateTerrain();

      const baseStats = {
        melee: { hp: 100, atk: 15, spd: 5, range: 2 },
        ranged: { hp: 70, atk: 10, spd: 7, range: 10 },
      }[selectedClass];

      // Conversion from similarities and class
      const meleeScore = similarities.melee;
      const rangedScore = similarities.ranged;

      const generatedStats = {
        atk: baseStats.atk * (0.5 + meleeScore),
        range: baseStats.range * (0.5 + rangedScore),
        spd: baseStats.spd * (0.5 + (selectedClass === 'ranged' ? rangedScore : meleeScore / 2)),
        hp: baseStats.hp * (0.5 + (selectedClass === 'melee' ? meleeScore : rangedScore / 2)),
      };

      setStats(generatedStats);
      setTerrain(terrainData.result);
      setStep('stats');
    } catch (error) {
      console.error(error);
      alert('Error connecting to backend ML API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-dark-theme">
      <div className="max-w-4xl w-full">
        <header className="mb-12 text-center">
          <h1 className="text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500 tracking-tighter">
            PROMPTARIA
          </h1>
          <p className="text-slate-400 text-lg">Weaponize your imagination with ML-driven stats</p>
        </header>

        {step === 'character' && (
          <section className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-bold mb-6 text-indigo-300">STEP 1: FORGE YOUR HERO</h2>
            <PixelCanvas width={32} height={32} data={characterData} onChange={setCharacterData} scale={12} />
            <button
              onClick={() => setStep('weapon')}
              className="btn-primary mt-8 px-12"
            >
              Next: Forge Weapon
            </button>
          </section>
        )}

        {step === 'weapon' && (
          <section className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-bold mb-6 text-purple-300">STEP 2: FORGE YOUR WEAPON</h2>
            <PixelCanvas width={16} height={16} data={weaponData} onChange={setWeaponData} scale={24} />
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('character')} className="btn-secondary px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">Back</button>
              <button onClick={() => setStep('class')} className="btn-primary px-12">Next: Select Class</button>
            </div>
          </section>
        )}

        {step === 'class' && (
          <section className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 glass-panel p-12">
            <h2 className="text-2xl font-bold mb-8 text-indigo-300">STEP 3: CHOOSE YOUR PATH</h2>
            <div className="flex gap-8 mb-12">
              <button
                onClick={() => setSelectedClass('melee')}
                className={`p-8 rounded-2xl border-2 transition-all ${selectedClass === 'melee' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="text-4xl mb-4">⚔️</div>
                <div className="text-xl font-bold">MELEE</div>
                <div className="text-slate-400 text-sm mt-2">High ATK & HP</div>
              </button>
              <button
                onClick={() => setSelectedClass('ranged')}
                className={`p-8 rounded-2xl border-2 transition-all ${selectedClass === 'ranged' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="text-4xl mb-4">🎯</div>
                <div className="text-xl font-bold">RANGED</div>
                <div className="text-slate-400 text-sm mt-2">High SPD & RANGE</div>
              </button>
            </div>
            <button
              disabled={loading}
              onClick={startGeneration}
              className="btn-primary px-16 py-4 text-xl"
            >
              {loading ? 'CALCULATING STATS...' : 'GENERATE HERO STATS'}
            </button>
          </section>
        )}

        {step === 'stats' && (
          <section className="flex flex-col items-center animate-in fade-in zoom-in duration-700 glass-panel p-12">
            <h2 className="text-3xl font-black mb-1 text-emerald-400 uppercase tracking-widest">FORGING COMPLETE</h2>
            <div className="text-slate-500 mb-10">Analysis from Neural Network successfully processed</div>

            <div className="grid grid-cols-2 gap-8 w-full mb-12">
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-xs uppercase mb-1">Health Points</div>
                <div className="text-3xl font-bold text-red-400 mono">{Math.round(stats.hp)}</div>
              </div>
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-xs uppercase mb-1">Attack Power</div>
                <div className="text-3xl font-bold text-indigo-400 mono">{stats.atk.toFixed(1)}</div>
              </div>
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-xs uppercase mb-1">Movement Speed</div>
                <div className="text-3xl font-bold text-emerald-400 mono">{stats.spd.toFixed(1)}</div>
              </div>
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-xs uppercase mb-1">Attack Range</div>
                <div className="text-3xl font-bold text-amber-400 mono">{stats.range.toFixed(1)}</div>
              </div>
            </div>

            <div className="w-full mb-12">
              <div className="text-slate-500 text-xs uppercase mb-4 text-center tracking-widest">Select Challenge Level</div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDifficulty('easy')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${difficulty === 'easy' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <span className={`text-xl font-bold ${difficulty === 'easy' ? 'text-blue-500' : 'text-slate-500'}`}>EASY</span>
                  <span className="text-xs text-slate-500">Classic Adventure</span>
                </button>
                <button
                  onClick={() => setDifficulty('hard')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${difficulty === 'hard' ? 'border-red-500 bg-red-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <span className={`text-xl font-bold ${difficulty === 'hard' ? 'text-red-500' : 'text-slate-500'}`}>HARD</span>
                  <span className="text-xs text-slate-500">Survival & Lighting</span>
                </button>
              </div>
            </div>

            <button onClick={() => setStep('game')} className="btn-primary w-full py-5 text-2xl tracking-tighter">START BATTLE</button>
          </section>
        )}

        {step === 'game' && terrain && (
          <section className="animate-in fade-in duration-1000">
            <ArenaCanvas
              terrain={terrain}
              playerPixels={characterData}
              weaponPixels={weaponData}
              stats={stats}
              hardMode={difficulty === 'hard'}
              heroClass={selectedClass}
            />
            <button
              onClick={() => setStep('character')}
              className="mt-8 text-slate-500 hover:text-slate-300 underline underline-offset-4 text-sm"
            >
              Return to Forge
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
