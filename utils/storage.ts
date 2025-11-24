
import { Player } from '../types';

const SAVE_KEY = 'maple_react_save_v1';

export const saveGame = (player: Player) => {
  try {
    const serialized = JSON.stringify(player);
    localStorage.setItem(SAVE_KEY, serialized);
    console.log('Game Saved!');
    return true;
  } catch (e) {
    console.error('Save failed', e);
    return false;
  }
};

export const loadGame = (): Player | null => {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch (e) {
    console.error('Load failed', e);
    return null;
  }
};

export const hasSaveFile = (): boolean => {
  return !!localStorage.getItem(SAVE_KEY);
};
