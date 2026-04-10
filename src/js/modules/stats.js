// 统计模块 - 数据可视化

import { getData } from './data.js';
import { showWordDetail } from './wordcloud.js';
import { showChapterDetail } from './chapters.js';

// 初始化统计数据
export function initStats() {
  const daoData = getData();
  if (!daoData.wordFrequency || !daoData.themes || !daoData.statistics) return;

  const stats = daoData.statistics;

  // 更新摘要卡片
  updateStatsSummary(stats);

  // 高频词汇图表
  initWordFrequencyChart();

  // 主题分布
  initThemeDistribution();

  // 章节字数分布
  initChapterLengthChart();

  // 道经vs德经对比
  initDaoDeComparison(stats);

  // 核心概念分布
  initKeyConceptsChart(stats);

  // 章节长度分布
  initLengthDistribution(stats);
}

// 更新统计摘要
function updateStatsSummary(stats) {
  const summaryContainer = document.querySelector('.page.pt-16.pb-24');
  if (!summaryContainer) return;

  // 在标题后插入统计摘要
  const titleSection = summaryContainer.querySelector('h2')?.parentElement;
  if (titleSection) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'grid grid-cols-4 gap-4 mb-8';
    summaryDiv.innerHTML = `
      <div class="text-center py-6">
        <p class="font-calligraphy text-4xl text-ink mb-1">${stats.totalCharacters.toLocaleString()}</p>
        <p class="text-xs text-ink-light">总字数</p>
      </div>
      <div class="text-center py-6">
        <p class="font-calligraphy text-4xl text-ink mb-1">${stats.uniqueCharacters.toLocaleString()}</p>
        <p class="text-xs text-ink-light">不重复字</p>
      </div>
      <div class="text-center py-6">
        <p class="font-calligraphy text-4xl text-ink mb-1">${stats.daoJingStats.chapters}/${stats.deJingStats.chapters}</p>
        <p class="text-xs text-ink-light">道经/德经</p>
      </div>
      <div class="text-center py-6">
        <p class="font-calligraphy text-4xl text-ink mb-1">${stats.avgCharsPerChapter}</p>
        <p class="text-xs text-ink-light">平均每章</p>
      </div>
    `;
    titleSection.insertBefore(summaryDiv, titleSection.children[2]);
  }
}

// 高频词汇图表
function initWordFrequencyChart() {
  const daoData = getData();
  const wordChart = document.getElementById('word-frequency-chart');
  if (!wordChart || !daoData.wordFrequency) return;

  const topWords = daoData.wordFrequency.slice(0, 10);
  const maxCount = Math.max(...topWords.map(w => w.count));
  const chartHeight = 140;

  wordChart.innerHTML = `
    <div style="display: flex; align-items: flex-end; justify-content: space-between; height: ${chartHeight + 50}px; padding: 0 4px;">
      ${topWords.map((word, index) => {
        const barHeight = Math.max(4, (word.count / maxCount) * chartHeight);
        return `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 40px; cursor: pointer;" class="group" onclick="window.showWordDetailByIndex(${index})">
          <span class="text-xs text-cinnabar font-medium mb-1">${word.count}</span>
          <div style="width: 100%; height: ${barHeight}px; background: linear-gradient(to top, #c93756, #e85d75); border-radius: 4px 4px 0 0; transition: all 0.3s ease;" class="group-hover:opacity-80"></div>
          <span class="text-xs mt-2 text-ink-light group-hover:text-cinnabar transition-colors text-center">${word.word}</span>
        </div>
      `}).join('')}
    </div>
  `;
}

// 主题分布
function initThemeDistribution() {
  const daoData = getData();
  const themeDist = document.getElementById('theme-distribution');
  if (!themeDist || !daoData.themes) return;

  const maxThemeCount = Math.max(...daoData.themes.map(t => t.count));

  themeDist.innerHTML = `
    <div class="space-y-4">
      ${daoData.themes.slice(0, 8).map((theme, index) => `
        <div class="flex items-center gap-4">
          <span class="text-sm text-ink-light w-24 truncate" title="${theme.description}">${theme.name}</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-ink transition-all duration-1000" style="width: ${(theme.count / maxThemeCount * 100)}%"></div>
          </div>
          <span class="text-sm text-ink font-medium w-8 text-right">${theme.count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// 章节字数分布
function initChapterLengthChart() {
  const daoData = getData();
  const lengthChart = document.getElementById('chapter-length-chart');
  if (!lengthChart || !daoData.chapters) return;

  const lengths = daoData.chapters.map(c => ({
    id: c.id,
    len: c.content.length,
    type: c.type
  }));
  const maxLength = Math.max(...lengths.map(l => l.len));

  lengthChart.innerHTML = `
    <div style="display: flex; flex-wrap: wrap; gap: 1px; justify-content: center; margin-bottom: 1.5rem;">
      ${lengths.map((item, idx) => `
        <div class="w-2 rounded-t hover:bg-ink cursor-pointer transition-all"
             style="height: ${Math.max(4, item.len / maxLength * 100)}px; background-color: ${item.type === '道经' ? 'rgba(26,26,26,0.6)' : 'rgba(26,26,26,0.3)'};"
             title="第${item.id}章: ${item.len}字" onclick="window.showChapterDetail(${item.id})"></div>
      `).join('')}
    </div>
    <div class="flex justify-center gap-6 text-sm text-ink-light">
      <span class="flex items-center gap-2"><span class="w-3 h-3 rounded" style="background-color: rgba(26,26,26,0.6);"></span>道经(1-37)</span>
      <span class="flex items-center gap-2"><span class="w-3 h-3 rounded" style="background-color: rgba(26,26,26,0.3);"></span>德经(38-81)</span>
    </div>
  `;
}

// 道经vs德经对比
function initDaoDeComparison(stats) {
  const container = document.querySelector('.page.pt-16.pb-24 > div');
  if (!container || !stats.daoJingStats || !stats.deJingStats) return;

  const section = document.createElement('div');
  section.className = 'mb-8';
  section.innerHTML = `
    <h3 class="font-serif text-lg mb-4 text-ink">道经 vs 德经</h3>
    <div class="bg-white p-6 rounded-xl shadow-sm">
      <div class="grid grid-cols-2 gap-8 mb-6">
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink mb-1">${stats.daoJingStats.chapters}<span class="text-sm font-normal text-ink-light ml-1">章</span></p>
          <p class="text-xs text-ink-light">道经 (第1-37章)</p>
          <p class="text-xs text-ink-light mt-1">${stats.daoJingStats.totalChars}字 · 平均${stats.daoJingStats.avgChars}字/章</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink mb-1">${stats.deJingStats.chapters}<span class="text-sm font-normal text-ink-light ml-1">章</span></p>
          <p class="text-xs text-ink-light">德经 (第38-81章)</p>
          <p class="text-xs text-ink-light mt-1">${stats.deJingStats.totalChars}字 · 平均${stats.deJingStats.avgChars}字/章</p>
        </div>
      </div>
      <div class="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        <div class="h-full bg-ink transition-all duration-1000" style="width: ${stats.daoJingStats.totalChars / stats.totalCharacters * 100}%"></div>
        <div class="h-full bg-ink/40 transition-all duration-1000" style="width: ${stats.deJingStats.totalChars / stats.totalCharacters * 100}%"></div>
      </div>
      <div class="flex justify-between text-xs text-ink-light mt-3">
        <span>道经 ${(stats.daoJingStats.totalChars / stats.totalCharacters * 100).toFixed(1)}%</span>
        <span>德经 ${(stats.deJingStats.totalChars / stats.totalCharacters * 100).toFixed(1)}%</span>
      </div>
    </div>
  `;

  // 插入到章节字数分布之后
  const lengthSection = container.querySelector('#chapter-length-chart')?.parentElement;
  if (lengthSection) {
    lengthSection.after(section);
  }
}

// 核心概念分布
function initKeyConceptsChart(stats) {
  const container = document.querySelector('.page.pt-16.pb-24 > div');
  if (!container || !stats.keyConcepts) return;

  const section = document.createElement('div');
  section.className = 'mb-8';
  section.innerHTML = `
    <h3 class="font-serif text-lg mb-4 text-ink">核心概念分布</h3>
    <div class="bg-white p-6 rounded-xl shadow-sm">
      <div class="space-y-6">
        ${stats.keyConcepts.map(concept => `
          <div>
            <div class="flex justify-between text-sm mb-2">
              <span class="font-medium text-ink">${concept.concept}</span>
              <span class="text-xs text-ink-light">道经${concept.daojing} / 德经${concept.dejing}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div class="h-full bg-ink transition-all duration-1000"
                   style="width: ${concept.daojing / (concept.daojing + concept.dejing) * 100}%"></div>
              <div class="h-full bg-ink/30 transition-all duration-1000"
                   style="width: ${concept.dejing / (concept.daojing + concept.dejing) * 100}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const daoDeSection = container.querySelector('.mb-8:last-of-type');
  if (daoDeSection) {
    daoDeSection.after(section);
  }
}

// 章节长度分布统计
function initLengthDistribution(stats) {
  const container = document.querySelector('.page.pt-16.pb-24 > div');
  if (!container || !stats.characterDistribution) return;

  const dist = stats.characterDistribution;
  const section = document.createElement('div');
  section.className = 'mb-8';
  section.innerHTML = `
    <h3 class="font-serif text-lg mb-4 text-ink">章节长度分布</h3>
    <div class="bg-white p-6 rounded-xl shadow-sm">
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink">${dist.short.count}</p>
          <p class="text-xs text-ink-light mt-1">短篇</p>
          <p class="text-xs text-ink-light/70">${dist.short.range}</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink">${dist.medium.count}</p>
          <p class="text-xs text-ink-light mt-1">中篇</p>
          <p class="text-xs text-ink-light/70">${dist.medium.range}</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink">${dist.long.count}</p>
          <p class="text-xs text-ink-light mt-1">长篇</p>
          <p class="text-xs text-ink-light/70">${dist.long.range}</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-calligraphy text-ink">${dist.extraLong.count}</p>
          <p class="text-xs text-ink-light mt-1">超长篇</p>
          <p class="text-xs text-ink-light/70">${dist.extraLong.range}</p>
        </div>
      </div>
      <div class="pt-4 border-t border-ink/5">
        <div class="flex justify-between text-xs text-ink-light">
          <span>最长：第${stats.longestChapter.id}章 · ${stats.longestChapter.chars}字 · ${stats.longestChapter.title}</span>
          <span>最短：第${stats.shortestChapter.id}章 · ${stats.shortestChapter.chars}字 · ${stats.shortestChapter.title}</span>
        </div>
      </div>
    </div>
  `;

  const keyConceptsSection = container.querySelector('.mb-8:last-of-type');
  if (keyConceptsSection) {
    keyConceptsSection.after(section);
  }
}
