/**
 * 极简主题切换：跟随系统 / 强制亮 / 强制暗
 *
 * 状态保存在 localStorage("oepnimg-theme")，
 * 在 RootLayout 的 <head> 中通过内联脚本同步执行（避免 FOUC）。
 */
export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "oepnimg-theme";

export const inlineThemeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark', d);}catch(e){}})();`;
