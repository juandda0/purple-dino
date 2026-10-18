// Local state of the teacher's screen (menus + current room). Live game data comes from the database.
import { create } from 'zustand';
import type { Difficulty } from '../game/types';
import type { HostStats } from './controller';

export type HostScreen = 'start' | 'course' | 'units' | 'difficulty' | 'room';

interface HostStore {
  screen: HostScreen;
  course: number;
  units: number[];
  difficulty: Difficulty;
  code: string | null;
  stats: HostStats | null;
  muted: boolean;
  go: (screen: HostScreen) => void;
  toggleUnit: (unit: number) => void;
  setUnits: (units: number[]) => void;
  setDifficulty: (d: Difficulty) => void;
  setCode: (code: string | null) => void;
  setStats: (s: HostStats | null) => void;
  setMuted: (m: boolean) => void;
}

export const useHost = create<HostStore>(set => ({
  screen: 'start',
  course: 6,
  units: [],
  difficulty: 'medium',
  code: null,
  stats: null,
  muted: false,
  go: screen => set({ screen }),
  toggleUnit: unit => set(s => ({ units: s.units.includes(unit) ? s.units.filter(u => u !== unit) : [...s.units, unit].sort((a, b) => a - b) })),
  setUnits: units => set({ units }),
  setDifficulty: difficulty => set({ difficulty }),
  setCode: code => set({ code }),
  setStats: stats => set({ stats }),
  setMuted: muted => set({ muted }),
}));
