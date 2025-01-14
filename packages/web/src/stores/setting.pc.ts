import { merge } from 'lodash-es';
import { readConfig, updateConfig } from '@/api';
import { alwaysOnTop } from '@/api/electron';

export type ReadStyle = {
  // 字体大小
  fontSize: Number;
  // 行高
  lineHeight: Number;
  // 文字间距
  letterSpacing: Number;
  // 文字颜色
  textColor: string;
  // 背景颜色
  backgroundColor: string;
};

// 快捷键
export type KeyboardShortcuts = {
  prevChapter: string;
  nextChapter: string;
  pageUp: string;
  pageDown: string;
};

// 侧边栏
export type Sidebar = 'left' | 'right' | 'hidden' | '';

export type Setting = {
  readStyle: ReadStyle;
  keyboardShortcuts: KeyboardShortcuts;
  sidebar: Sidebar;
  pinned: boolean;
  bookDir: string;
};

export const useSettingStore = defineStore('setting', () => {
  const data = reactive<Setting>({
    readStyle: {
      fontSize: 16,
      lineHeight: 1.5,
      letterSpacing: 1,
      textColor: '#ffffffb3',
      backgroundColor: '#ffffff00'
    },
    keyboardShortcuts: {
      prevChapter: '←',
      nextChapter: '→',
      pageUp: '↑',
      pageDown: '↓'
    },
    sidebar: 'left',
    pinned: false,
    bookDir: ''
  });

  // 同步
  async function sync() {
    const res = await readConfig().catch(() => {});
    if (res?.code === 0) {
      merge(data, res.data || {});
    }
  }

  watch(data, (v) => {
    updateConfig(toRaw(v));
  });

  watch(
    () => data.pinned,
    (value) => {
      alwaysOnTop(value);
    },
    { immediate: true }
  );

  sync();

  return {
    data,
    sync
  };
});
