// 章节模块 - 章节列表和详情

import { getData } from './data.js';
import { audioState } from './state.js';
import { formatContentWithPinyin, getChapterExplanation } from './utils.js';
import { showPage } from './navigation.js';
import { playChapterAudio, toggleDetailAudioPlayback, cyclePlaybackSpeed } from './audio.js';

// 初始化章节列表
export function initChapters() {
  const daoData = getData();
  const grid = document.getElementById('chapters-grid');
  if (!grid || !daoData.chapters) return;

  grid.innerHTML = daoData.chapters.map(chapter => `
    <div class="chapter-card bg-white p-5 rounded-xl shadow-sm cursor-pointer border-l-4 ${
      chapter.type === '道经' ? 'border-cinnabar' : 'border-jade'
    }" data-chapter-id="${chapter.id}" onclick="window.showChapterDetail(${chapter.id})">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <span class="text-xs ${chapter.type === '道经' ? 'text-cinnabar' : 'text-jade'} font-semibold">第${chapter.id}章 · ${chapter.type}</span>
          <h3 class="font-serif font-semibold text-lg">${chapter.title}</h3>
        </div>
        <span class="text-xs text-ink-light/50 px-2 py-1 bg-paper rounded">${chapter.theme}</span>
      </div>
      <p class="text-sm text-ink-light line-clamp-2">${chapter.content.substring(0, 60)}...</p>
      <div class="mt-2 text-xs text-ink-light/40">${chapter.content.length}字</div>
    </div>
  `).join('');
}

// 显示章节详情
export function showChapterDetail(chapterId) {
  const daoData = getData();
  const chapter = daoData.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const container = document.getElementById('chapter-detail-content');
  if (!container) return;

  const isCurrentlyPlaying = audioState.currentChapterId === chapterId && audioState.isPlaying && !audioState.isPaused;

  // 生成配图
  const chapterImage = generateChapterImage(chapter);

  container.innerHTML = `
    <!-- 扁平化头部 -->
    <div class="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-ink/5">
      <div class="flex items-center justify-between px-4 py-3">
        <button onclick="window.showPage('chapters')" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink/5 transition-colors">
          <svg class="w-5 h-5 text-ink-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="text-center flex-1 mx-2">
          <h1 class="font-calligraphy text-2xl text-ink">${chapter.title}</h1>
        </div>
        <div class="w-8"></div>
      </div>
    </div>

    <!-- 章节配图 -->
    <div class="w-full h-56 -mt-16 pt-16 overflow-hidden">
      ${chapterImage}
    </div>

    <div class="px-4 pb-6">
      <!-- 原文内容 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-full bg-cinnabar/10 flex items-center justify-center text-cinnabar text-xs">经</span>
          <span class="text-xs text-ink-light">原文</span>
          <span class="flex-1"></span>
          <div class="flex items-center gap-1">
            <button onclick="window.toggleDetailAudioPlayback(${chapter.id})" id="detail-play-btn-${chapter.id}" class="w-6 h-6 rounded-full ${isCurrentlyPlaying ? 'bg-cinnabar text-white' : 'bg-cinnabar/10 text-cinnabar'} flex items-center justify-center transition-all">
              <svg id="detail-play-icon-${chapter.id}" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="${isCurrentlyPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>
              </svg>
            </button>
            <button onclick="window.cyclePlaybackSpeed(${chapter.id})" id="detail-speed-btn-${chapter.id}" class="text-xs text-ink-light hover:text-cinnabar transition-colors min-w-[28px] text-center">
              ${audioState.playbackSpeed}x
            </button>
          </div>
          <span class="text-xs text-ink-light/50 ml-2">${chapter.content.length} 字</span>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <div class="font-handwriting text-xl leading-loose text-ink text-justify" style="font-family: 'Ma Shan Zheng', cursive;">
            ${formatContentWithPinyin(chapter.content)}
          </div>
        </div>
      </div>

      <!-- 原文解释 -->
      <div class="py-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-cinnabar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          <span class="text-sm font-semibold text-ink">原文解释</span>
        </div>
        <p class="text-sm text-ink-light leading-relaxed">
          ${getChapterExplanation(chapter)}
        </p>
      </div>

      <!-- 章节导航 -->
      <div class="flex justify-between items-center mt-6 pt-4">
        ${chapterId > 1 ? `
          <button onclick="window.showChapterDetail(${chapterId - 1})" class="flex items-center gap-2 px-3 py-2 text-sm text-ink-light hover:text-ink transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>第${chapterId - 1}章</span>
          </button>
        ` : '<span></span>'}

        ${chapterId < 81 ? `
          <button onclick="window.showChapterDetail(${chapterId + 1})" class="flex items-center gap-2 px-3 py-2 text-sm text-ink-light hover:text-ink transition-colors">
            <span>第${chapterId + 1}章</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ` : '<span></span>'}
      </div>
    </div>
  `;

  // 切换到详情页
  showPage('chapter-detail');
  window.scrollTo(0, 0);
}

// 生成章节配图
function generateChapterImage(chapter) {
  const isDaoJing = chapter.type === '道经';
  const themeColors = isDaoJing
    ? ['#c93756', '#8b4513', '#2c1810']
    : ['#6b8e6b', '#4a6741', '#1a1a1a'];

  const seed = chapter.id * 137;

  return `
    <svg class="w-full h-full" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="ink-wash-${chapter.id}" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${themeColors[0]}" stop-opacity="0.15"/>
          <stop offset="50%" stop-color="${themeColors[1]}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${themeColors[2]}" stop-opacity="0.03"/>
        </radialGradient>
        <pattern id="waves-${chapter.id}" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
          <path d="M0,10 Q25,0 50,10 T100,10" stroke="${themeColors[0]}" stroke-width="0.5" fill="none" opacity="0.3"/>
        </pattern>
        <filter id="blur-${chapter.id}">
          <feGaussianBlur stdDeviation="${2 + (chapter.id % 3)}"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#f7f5f0"/>
      <ellipse cx="${200 + (seed % 60 - 30)}" cy="${150 + (seed % 40 - 20)}" rx="${120 + (seed % 40)}" ry="${80 + (seed % 30)}" fill="url(#ink-wash-${chapter.id})" filter="url(#blur-${chapter.id})"/>
      <path d="M0,300 Q${50 + (seed % 20)},${200 - (seed % 30)} ${100 + (seed % 30)},${220 + (seed % 20)} T${200 + (seed % 25)},${180 - (seed % 25)} T${300 + (seed % 20)},${210 + (seed % 20)} T400,300 Z" fill="${themeColors[2]}" opacity="0.06"/>
      <rect x="0" y="200" width="400" height="100" fill="url(#waves-${chapter.id})" opacity="0.5"/>
      <ellipse cx="${300 - (seed % 40)}" cy="${80 + (seed % 20)}" rx="${60 + (seed % 20)}" ry="${30 + (seed % 15)}" fill="${themeColors[1]}" opacity="0.05" filter="url(#blur-${chapter.id})"/>
      <g transform="translate(${320 + (seed % 10)}, ${240 + (seed % 15)}) rotate(${-5 + (seed % 10)})">
        <rect x="0" y="0" width="40" height="40" fill="none" stroke="${themeColors[0]}" stroke-width="2" opacity="0.6"/>
        <rect x="4" y="4" width="32" height="32" fill="none" stroke="${themeColors[0]}" stroke-width="1" opacity="0.4"/>
        <text x="20" y="18" text-anchor="middle" font-size="10" fill="${themeColors[0]}" opacity="0.8" font-family="serif">道</text>
        <text x="20" y="32" text-anchor="middle" font-size="10" fill="${themeColors[0]}" opacity="0.8" font-family="serif">${chapter.id}</text>
      </g>
      ${Array.from({length: 5 + (chapter.id % 5)}, (_, i) => {
        const x = 30 + ((seed * (i + 1)) % 340);
        const y = 30 + ((seed * (i + 3)) % 240);
        const r = 2 + ((seed * (i + 2)) % 6);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${themeColors[2]}" opacity="0.1"/>`;
      }).join('')}
    </svg>
  `;
}

// 关闭章节详情
export function closeChapterModal() {
  showPage('chapters');
}
