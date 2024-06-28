export enum CONTENT_TYPE {
  MANGA = 0,
  NOVEL = 1,
  VIDEO = 2,
  AUDIO = 3,
  RSS = 4,
  NOVELMORE = 5,
  GAME = 101
}

export type TPlatform = 'browser' | 'vscode' | 'electron' | 'utools';

export const PLATFORM: TPlatform = import.meta.env.VITE_APP_PLATFORM;

export const CONTENT_TYPES = [
  { value: 0, label: '漫画', platform: ['browser', 'electron', 'vscode', 'utools'] },
  { value: 1, label: '小说', platform: ['browser', 'electron', 'vscode', 'utools'] },
  { value: 2, label: '视频', platform: ['browser', 'electron', 'vscode', 'utools'] },
  { value: 3, label: '音频', platform: ['browser', 'electron', 'utools'] },
  // { value: 4, label: 'RSS' },
  // { value: 5, label: 'NOVELMORE' },

  { value: 101, label: '游戏', platform: ['browser', 'electron', 'vscode', 'utools'] }
].filter((e) => e.platform.includes(PLATFORM));

export const BASE_URL = import.meta.env.VITE_APP_BASE_URL || '/api';
