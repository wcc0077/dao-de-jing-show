// 首页模块 - 主题预览初始化

import { getData } from './data.js';
import { showChapterDetail } from './chapters.js';

// 初始化主题预览
export function initThemePreview() {
  const container = document.getElementById('theme-preview');
  const daoData = getData();
  if (!container || !daoData.themes) return;

  container.innerHTML = daoData.themes.slice(0, 6).map((theme, index) => `
    <div class="chapter-card bg-white p-4 rounded-xl shadow-sm border-l-4 ${
      index % 3 === 0 ? 'border-cinnabar' : index % 3 === 1 ? 'border-jade' : 'border-gold'
    }">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-serif font-semibold text-lg mb-1">${theme.name}</h3>
          <p class="text-sm text-ink-light">${theme.description}</p>
        </div>
        <span class="font-calligraphy text-2xl text-ink-light/30">${theme.count}</span>
      </div>
    </div>
  `).join('');
}
