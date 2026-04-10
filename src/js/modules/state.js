// 状态模块 - 全局状态管理

// 页面状态
export const state = {
  currentPage: 'home',
  wordCloudScene: null,
  wordCloudRenderer: null,
  wordCloudCamera: null,
  wordCloudWords: [],
  selectedWord: null
};

// 音频播放状态
export const audioState = {
  isPlaying: false,
  currentChapterId: null,
  speechUtterance: null,
  playbackSpeed: 0.8,
  isPaused: false
};

// 设置当前页面
export function setCurrentPage(pageName) {
  state.currentPage = pageName;
}

// 获取当前页面
export function getCurrentPage() {
  return state.currentPage;
}
