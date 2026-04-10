// 导航模块 - 页面切换和导航控制

import { state, setCurrentPage, getCurrentPage } from './state.js';
import { audioState } from './state.js';
import { initWordCloud } from './wordcloud.js';
import { initKnowledgeGraph } from './knowledgeGraph.js';
import { initLLMKnowledgeGraph } from './llmKnowledgeGraph.js';

// 页面切换
export function showPage(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // 显示目标页面
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    setCurrentPage(pageName);

    // 特殊处理
    if (pageName === 'wordcloud') {
      setTimeout(initWordCloud, 100);
    }
    if (pageName === 'knowledge-graph') {
      setTimeout(initKnowledgeGraph, 100);
    }
    if (pageName === 'llm-knowledge-graph') {
      setTimeout(initLLMKnowledgeGraph, 100);
    }
  }

  // 控制顶部和底部导航显示/隐藏
  const header = document.querySelector('header');
  const bottomNav = document.querySelector('nav.fixed.bottom-0');
  const globalPlayer = document.getElementById('global-audio-player');

  if (pageName === 'chapter-detail') {
    // 详情页隐藏导航和全局播放器
    if (header) header.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    if (globalPlayer) globalPlayer.style.display = 'none';
  } else {
    // 其他页面显示导航和播放器
    if (header) header.style.display = '';
    if (bottomNav) bottomNav.style.display = '';
    if (globalPlayer) globalPlayer.style.display = '';
  }

  updateNavState();
  window.scrollTo(0, 0);
}

// 更新导航状态
export function updateNavState() {
  const currentPage = getCurrentPage();
  document.querySelectorAll('[data-page]').forEach(btn => {
    const page = btn.getAttribute('data-page');
    // 详情页不激活任何导航按钮
    if (currentPage === 'chapter-detail') {
      btn.classList.remove('text-cinnabar');
      btn.classList.add('text-ink-light');
      return;
    }
    if (page === currentPage) {
      btn.classList.add('text-cinnabar');
      btn.classList.remove('text-ink-light');
    } else {
      btn.classList.remove('text-cinnabar');
      btn.classList.add('text-ink-light');
    }
  });
}

// 滑动切换页面
export function initSwipe() {
  let startY = 0;
  let endY = 0;

  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    endY = e.changedTouches[0].clientY;
    handleSwipe(startY, endY);
  }, { passive: true });
}

function handleSwipe(startY, endY) {
  const threshold = 100;
  const diff = startY - endY;
  const currentPage = getCurrentPage();

  // 详情页使用左右滑动导航上一章/下一章
  if (currentPage === 'chapter-detail') {
    return; // 详情页不处理上下滑动
  }

  const pages = ['home', 'chapters', 'wordcloud', 'knowledge-graph', 'llm-knowledge-graph', 'stats'];
  const currentIndex = pages.indexOf(currentPage);

  if (Math.abs(diff) > threshold && currentIndex !== -1) {
    if (diff > 0 && currentIndex < pages.length - 1) {
      // 向上滑动，下一页
      showPage(pages[currentIndex + 1]);
    } else if (diff < 0 && currentIndex > 0) {
      // 向下滑动，上一页
      showPage(pages[currentIndex - 1]);
    }
  }
}
