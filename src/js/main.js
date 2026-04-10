// 主入口模块 - 应用程序初始化

import '../css/style.css';
import { loadData } from './modules/data.js';
import { setCurrentPage } from './modules/state.js';
import { initThemePreview } from './modules/home.js';
import { initChapters, showChapterDetail, closeChapterModal } from './modules/chapters.js';
import { initStats } from './modules/stats.js';
import { initWordCloud, showWordDetail, showWordDetailByIndex } from './modules/wordcloud.js';
import { showPage, updateNavState, initSwipe } from './modules/navigation.js';
import { initAudioPlayer, playChapterAudio, pauseChapterAudio, stopChapterAudio, toggleAudioPlayback, togglePlaybackSpeed, cyclePlaybackSpeed, toggleDetailAudioPlayback, hideAudioPlayer } from './modules/audio.js';
import { initKnowledgeGraph, closeKnowledgeGraphDetail, resetKnowledgeGraphView, filterKnowledgeGraph } from './modules/knowledgeGraph.js';
import { formatContentWithPinyin, getChapterExplanation } from './modules/utils.js';
import { initLLMKnowledgeGraph, closeLLMGraphDetail, resetLLMGraphView, searchLLMGraphNode, filterLLMGraphByType } from './modules/llmKnowledgeGraph.js';

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initApp();
  initAudioPlayer();
});

// 初始化应用
function initApp() {
  // 隐藏加载页
  setTimeout(() => {
    document.getElementById('loading-page').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loading-page').style.display = 'none';
      document.getElementById('app').classList.remove('opacity-0');
    }, 500);
  }, 1500);

  // 初始化各模块
  initThemePreview();
  initChapters();
  initStats();
  updateNavState();

  // 触摸滑动支持
  initSwipe();
}

// 添加CSS动画类
document.head.insertAdjacentHTML('beforeend', `
  <style>
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  </style>
`);

// 暴露函数到全局，供 HTML onclick 调用
window.showPage = showPage;
window.closeChapterModal = closeChapterModal;
window.showChapterDetail = showChapterDetail;
window.playChapterAudio = playChapterAudio;
window.pauseChapterAudio = pauseChapterAudio;
window.stopChapterAudio = stopChapterAudio;
window.togglePlaybackSpeed = togglePlaybackSpeed;
window.showWordDetailByIndex = showWordDetailByIndex;
window.toggleDetailAudioPlayback = toggleDetailAudioPlayback;
window.cyclePlaybackSpeed = cyclePlaybackSpeed;
window.hideAudioPlayer = hideAudioPlayer;
window.showWordDetail = showWordDetail;
window.formatContentWithPinyin = formatContentWithPinyin;
window.getChapterExplanation = getChapterExplanation;
window.toggleAudioPlayback = toggleAudioPlayback;
window.closeKnowledgeGraphDetail = closeKnowledgeGraphDetail;
window.resetKnowledgeGraphView = resetKnowledgeGraphView;
window.filterKnowledgeGraph = filterKnowledgeGraph;
window.closeLLMGraphDetail = closeLLMGraphDetail;
window.resetLLMGraphView = resetLLMGraphView;
window.searchLLMGraphNode = searchLLMGraphNode;
window.filterLLMGraphByType = filterLLMGraphByType;
