// 词云模块 - 3D词云可视化

import * as THREE from 'three';
import { state } from './state.js';
import { getData } from './data.js';

// 词云交互状态
let rotationSpeed = { x: 0.002, y: 0.003 };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// 初始化3D词云
export function initWordCloud() {
  const container = document.getElementById('word-cloud-container');
  const canvas = document.getElementById('word-cloud-canvas');
  const daoData = getData();

  if (!container || !canvas || !daoData.wordFrequency) return;

  // 清理旧场景
  if (state.wordCloudRenderer) {
    state.wordCloudRenderer.dispose();
    state.wordCloudRenderer = null;
  }

  // 设置Three.js场景
  const width = container.clientWidth;
  const height = container.clientHeight;

  state.wordCloudScene = new THREE.Scene();
  const scene = state.wordCloudScene;

  state.wordCloudCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  const camera = state.wordCloudCamera;
  camera.position.z = 30;

  state.wordCloudRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const renderer = state.wordCloudRenderer;
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 创建词汇球体
  const words = daoData.wordFrequency.slice(0, 25);
  const radius = 12;

  words.forEach((wordData, index) => {
    // 计算球面位置
    const phi = Math.acos(-1 + (2 * index) / words.length);
    const theta = Math.sqrt(words.length * Math.PI) * phi;

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    // 创建文字纹理
    const sprite = createWordSprite(wordData, index);
    sprite.position.set(x, y, z);
    sprite.lookAt(0, 0, 0);

    // 存储词汇数据
    sprite.userData = wordData;
    state.wordCloudWords.push(sprite);

    scene.add(sprite);
  });

  // 添加连接线
  addConnectingLines(scene, state.wordCloudWords);

  // 动画循环
  animateWordCloud();

  // 触摸交互
  initWordCloudInteraction(container, canvas);

  // 响应式
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    state.wordCloudCamera.aspect = newWidth / newHeight;
    state.wordCloudCamera.updateProjectionMatrix();
    state.wordCloudRenderer.setSize(newWidth, newHeight);
  });
}

// 创建文字精灵
function createWordSprite(wordData, index) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = Math.max(24, Math.min(64, wordData.count * 0.8));

  canvas.width = 256;
  canvas.height = 128;

  // 绘制文字
  ctx.font = `bold ${fontSize}px "Noto Serif SC", serif`;
  ctx.fillStyle = index % 3 === 0 ? '#c93756' : index % 3 === 1 ? '#1a1a1a' : '#6b8e6b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wordData.word, 128, 64);

  // 创建纹理
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  const scale = 0.1 + (wordData.count / 400);
  sprite.scale.set(scale * 4, scale * 2, 1);

  return sprite;
}

// 添加连接线
function addConnectingLines(scene, words) {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.1
  });

  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (Math.random() > 0.85) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          words[i].position,
          words[j].position
        ]);
        const line = new THREE.Line(geometry, lineMaterial);
        scene.add(line);
      }
    }
  }
}

// 词云动画
function animateWordCloud() {
  if (!state.wordCloudRenderer || state.currentPage !== 'wordcloud') return;

  requestAnimationFrame(animateWordCloud);

  // 自动旋转
  if (!isDragging) {
    state.wordCloudWords.forEach((sprite, index) => {
      sprite.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
      sprite.lookAt(state.wordCloudCamera.position);
    });
  }

  state.wordCloudRenderer.render(state.wordCloudScene, state.wordCloudCamera);
}

// 词云交互
function initWordCloudInteraction(container, canvas) {
  let startX, startY;

  canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    // 检测点击的词汇
    const touch = e.touches[0];
    checkWordClick(touch.clientX, touch.clientY);
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;

    state.wordCloudWords.forEach(sprite => {
      sprite.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
      sprite.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
    });

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  }, { passive: true });

  // 鼠标支持
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    checkWordClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    state.wordCloudWords.forEach(sprite => {
      sprite.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
      sprite.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
    });

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// 检测词汇点击
function checkWordClick(clientX, clientY) {
  const container = document.getElementById('word-cloud-container');
  const rect = container.getBoundingClientRect();

  const mouse = new THREE.Vector2();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, state.wordCloudCamera);

  const intersects = raycaster.intersectObjects(state.wordCloudWords);

  if (intersects.length > 0) {
    const word = intersects[0].object.userData;
    showWordDetail(word);

    // 添加涟漪效果
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.width = '50px';
    ripple.style.height = '50px';
    ripple.style.left = `${clientX - rect.left - 25}px`;
    ripple.style.top = `${clientY - rect.top - 25}px`;
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1500);
  }
}

// 显示词汇详情
export function showWordDetail(word) {
  const detail = document.getElementById('word-detail');
  const title = document.getElementById('word-title');
  const meaning = document.getElementById('word-meaning');
  const count = document.getElementById('word-count');

  title.textContent = word.word;
  meaning.textContent = word.meaning || '暂无释义';
  count.textContent = `出现 ${word.count} 次`;

  detail.style.opacity = '1';
  detail.classList.add('scroll-reveal');
}

// 通过索引显示词汇详情
export function showWordDetailByIndex(index) {
  const daoData = getData();
  const word = daoData.wordFrequency[index];
  if (word) showWordDetail(word);
}
