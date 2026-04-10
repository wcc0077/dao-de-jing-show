// 音频模块 - 语音播放功能

import { audioState } from './state.js';
import { getData } from './data.js';

// 初始化音频播放器UI
export function initAudioPlayer() {
  const playerHTML = `
    <div id="global-audio-player" class="fixed bottom-[72px] left-4 right-4 bg-white rounded-xl shadow-lg z-40 transform translate-y-[150%] transition-transform duration-300">
      <div class="p-3 flex items-center gap-3">
        <button id="player-play-btn" onclick="window.toggleAudioPlayback()" class="w-10 h-10 rounded-full bg-cinnabar text-white flex items-center justify-center hover:bg-cinnabar/90 transition-colors">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path id="player-play-icon" d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <p id="player-chapter-title" class="text-sm font-semibold truncate">未播放</p>
          <p id="player-status" class="text-xs text-ink-light">点击播放开始朗读</p>
        </div>
        <button onclick="window.togglePlaybackSpeed()" id="player-speed-btn" class="px-2 py-1 text-xs bg-paper rounded hover:bg-gray-100 transition-colors">0.8x</button>
        <button onclick="window.stopChapterAudio()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>
        <button onclick="window.hideAudioPlayer()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="px-3 pb-3">
        <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div id="player-progress" class="h-full bg-cinnabar transition-all duration-300" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', playerHTML);

  const style = document.createElement('style');
  style.textContent = `
    #global-audio-player {
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    }
    #global-audio-player.show {
      transform: translateY(0);
    }
    .audio-btn {
      transition: all 0.3s ease;
    }
    .audio-btn:hover {
      transform: scale(1.05);
    }
    .audio-btn.playing {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(201, 55, 86, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(201, 55, 86, 0); }
    }
  `;
  document.head.appendChild(style);
}

// 播放章节音频
export function playChapterAudio(chapterId) {
  const daoData = getData();
  const chapter = daoData.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  if (audioState.isPlaying && audioState.currentChapterId !== chapterId) {
    stopChapterAudio();
  }

  if (!window.speechSynthesis) {
    alert('您的浏览器不支持语音播放功能');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(chapter.content);
  utterance.lang = 'zh-CN';
  utterance.rate = audioState.playbackSpeed;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
  if (zhVoice) {
    utterance.voice = zhVoice;
  }

  utterance.onstart = () => {
    audioState.isPlaying = true;
    audioState.isPaused = false;
    audioState.currentChapterId = chapterId;
    audioState.speechUtterance = utterance;
    updatePlayerUI(chapter);
    showAudioPlayer();
    updateChapterCardState(chapterId, true);
  };

  utterance.onend = () => {
    audioState.isPlaying = false;
    audioState.isPaused = false;
    updateChapterCardState(chapterId, false);
    if (chapterId < 81) {
      setTimeout(() => playChapterAudio(chapterId + 1), 1000);
    }
  };

  utterance.onpause = () => {
    audioState.isPaused = true;
    updatePlayButtonIcon(false);
  };

  utterance.onresume = () => {
    audioState.isPaused = false;
    updatePlayButtonIcon(true);
  };

  utterance.onerror = (e) => {
    console.error('语音播放错误:', e);
    audioState.isPlaying = false;
    updateChapterCardState(chapterId, false);
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// 暂停/继续播放
export function pauseChapterAudio() {
  if (!audioState.isPlaying) return;

  if (audioState.isPaused) {
    window.speechSynthesis.resume();
    audioState.isPaused = false;
  } else {
    window.speechSynthesis.pause();
    audioState.isPaused = true;
  }
  updatePlayButtonIcon(!audioState.isPaused);
}

// 停止播放
export function stopChapterAudio() {
  window.speechSynthesis.cancel();
  if (audioState.currentChapterId) {
    updateChapterCardState(audioState.currentChapterId, false);
  }
  audioState.isPlaying = false;
  audioState.isPaused = false;
  audioState.currentChapterId = null;
  audioState.speechUtterance = null;
  hideAudioPlayer();
}

// 切换播放/暂停
export function toggleAudioPlayback() {
  if (audioState.isPlaying) {
    pauseChapterAudio();
  } else if (audioState.currentChapterId) {
    playChapterAudio(audioState.currentChapterId);
  }
}

// 切换播放速度
export function togglePlaybackSpeed() {
  const speeds = [0.6, 0.8, 1.0, 1.2];
  const currentIndex = speeds.indexOf(audioState.playbackSpeed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  audioState.playbackSpeed = speeds[nextIndex];

  const speedBtn = document.getElementById('player-speed-btn');
  if (speedBtn) {
    speedBtn.textContent = audioState.playbackSpeed + 'x';
  }

  if (audioState.isPlaying && audioState.currentChapterId) {
    const currentId = audioState.currentChapterId;
    window.speechSynthesis.cancel();
    setTimeout(() => playChapterAudio(currentId), 100);
  }
}

// 循环切换播放速度（详情页使用）
export function cyclePlaybackSpeed(chapterId) {
  const speeds = [0.6, 0.8, 1.0, 1.2];
  const currentIndex = speeds.indexOf(audioState.playbackSpeed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  const newSpeed = speeds[nextIndex];

  audioState.playbackSpeed = newSpeed;

  const speedBtn = document.getElementById(`detail-speed-btn-${chapterId}`);
  if (speedBtn) {
    speedBtn.textContent = newSpeed + 'x';
  }

  if (audioState.isPlaying && audioState.currentChapterId === chapterId) {
    window.speechSynthesis.cancel();
    setTimeout(() => playChapterAudio(chapterId), 100);
  }
}

// 详情页音频播放控制
export function toggleDetailAudioPlayback(chapterId) {
  if (audioState.isPlaying && audioState.currentChapterId === chapterId) {
    pauseChapterAudio();
    updateDetailPlayButton(chapterId, false);
  } else if (audioState.currentChapterId === chapterId && audioState.isPaused) {
    pauseChapterAudio();
    updateDetailPlayButton(chapterId, true);
  } else {
    playChapterAudio(chapterId);
  }
}

// 更新详情页播放按钮状态
export function updateDetailPlayButton(chapterId, isPlaying) {
  const icon = document.getElementById(`detail-play-icon-${chapterId}`);
  if (icon) {
    icon.innerHTML = `<path d="${isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>`;
  }
}

// 显示音频播放器
export function showAudioPlayer() {
  const player = document.getElementById('global-audio-player');
  if (player) {
    player.classList.add('show');
  }
}

// 隐藏音频播放器
export function hideAudioPlayer() {
  const player = document.getElementById('global-audio-player');
  if (player) {
    player.classList.remove('show');
  }
}

// 更新播放器UI
function updatePlayerUI(chapter) {
  const titleEl = document.getElementById('player-chapter-title');
  const statusEl = document.getElementById('player-status');

  if (titleEl) {
    titleEl.textContent = `第${chapter.id}章 ${chapter.title}`;
  }
  if (statusEl) {
    statusEl.textContent = audioState.isPaused ? '已暂停' : '正在朗读...';
  }

  updatePlayButtonIcon(audioState.isPlaying && !audioState.isPaused);
}

// 更新播放按钮图标
function updatePlayButtonIcon(isPlaying) {
  const icon = document.getElementById('player-play-icon');
  const statusEl = document.getElementById('player-status');

  if (icon) {
    if (isPlaying) {
      icon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
    } else {
      icon.setAttribute('d', 'M8 5v14l11-7z');
    }
  }

  if (statusEl) {
    statusEl.textContent = isPlaying ? '正在朗读...' : (audioState.isPaused ? '已暂停' : '点击播放开始朗读');
  }
}

// 更新章节卡片播放状态
function updateChapterCardState(chapterId, isPlaying) {
  document.querySelectorAll(`[data-chapter-id="${chapterId}"] .audio-btn`).forEach(btn => {
    if (isPlaying) {
      btn.classList.add('playing');
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
    } else {
      btn.classList.remove('playing');
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  });
}
