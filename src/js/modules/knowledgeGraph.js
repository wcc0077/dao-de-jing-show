// 知识图谱模块 - 3D知识图谱可视化

import * as THREE from 'three';
import { state } from './state.js';
import { getData } from './data.js';
import { showChapterDetail } from './chapters.js';

// 图谱状态
let knowledgeGraphState = {
  scene: null,
  camera: null,
  renderer: null,
  nodes: [],
  links: [],
  nodeMeshes: [],
  linkMeshes: [],
  labels: [],
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  selectedNode: null,
  animationId: null
};

// 节点颜色配置
const nodeColors = {
  concept: 0xc93756,    // 核心概念 - 朱红
  theme: 0x6b8e6b,      // 主题 - 青绿
  chapter: 0xc9a227,    // 章节 - 金色
  daojing: 0x1a1a1a,    // 道经 - 墨黑
  dejing: 0x4a4a4a      // 德经 - 淡墨
};

// 初始化知识图谱
export function initKnowledgeGraph() {
  const container = document.getElementById('knowledge-graph-container');
  const canvas = document.getElementById('knowledge-graph-canvas');
  const daoData = getData();

  if (!container || !canvas || !daoData) return;

  // 清理旧场景
  if (knowledgeGraphState.renderer) {
    knowledgeGraphState.renderer.dispose();
    knowledgeGraphState.renderer = null;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  // 创建场景
  knowledgeGraphState.scene = new THREE.Scene();
  knowledgeGraphState.scene.background = new THREE.Color(0xf7f5f0);

  // 创建相机
  knowledgeGraphState.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  knowledgeGraphState.camera.position.z = 50;

  // 创建渲染器
  knowledgeGraphState.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  knowledgeGraphState.renderer.setSize(width, height);
  knowledgeGraphState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 生成图谱数据
  const graphData = generateGraphData(daoData);

  // 创建连线
  createLinks(graphData.links);

  // 创建节点
  createNodes(graphData.nodes);

  // 启动动画
  animateGraph();

  // 初始化交互
  initGraphInteraction(container, canvas);

  // 响应式处理
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    knowledgeGraphState.camera.aspect = newWidth / newHeight;
    knowledgeGraphState.camera.updateProjectionMatrix();
    knowledgeGraphState.renderer.setSize(newWidth, newHeight);
  });
}

// 生成图谱数据
function generateGraphData(daoData) {
  const nodes = [];
  const links = [];
  const center = { x: 0, y: 0, z: 0 };

  // 1. 添加核心概念节点（中心）
  const coreConcepts = ['道', '德', '无', '有', '天', '人'];
  coreConcepts.forEach((concept, i) => {
    const angle = (i / coreConcepts.length) * Math.PI * 2;
    const radius = 8;
    nodes.push({
      id: `concept-${concept}`,
      name: concept,
      type: 'concept',
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0,
      size: 1.5,
      data: { word: concept, count: 76 }
    });
  });

  // 2. 添加主题节点
  if (daoData.themes) {
    daoData.themes.forEach((theme, i) => {
      const angle = (i / daoData.themes.length) * Math.PI * 2;
      const radius = 20;
      nodes.push({
        id: `theme-${i}`,
        name: theme.name,
        type: 'theme',
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 10,
        size: 1.2,
        data: theme
      });

      // 连接到相关核心概念
      coreConcepts.forEach(concept => {
        if (theme.description.includes(concept) || theme.name.includes(concept)) {
          links.push({
            source: `concept-${concept}`,
            target: `theme-${i}`,
            strength: 0.5
          });
        }
      });
    });
  }

  // 3. 添加章节节点
  if (daoData.chapters) {
    daoData.chapters.forEach((chapter, i) => {
      const isDaojing = chapter.type === '道经';
      const angle = (i / daoData.chapters.length) * Math.PI * 2;
      const radius = isDaojing ? 35 : 40;
      const height = isDaojing ? 5 : -5;

      nodes.push({
        id: `chapter-${chapter.id}`,
        name: `第${chapter.id}章`,
        type: isDaojing ? 'daojing' : 'dejing',
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: height + (Math.random() - 0.5) * 5,
        size: 0.6,
        data: chapter
      });

      // 连接到主题
      daoData.themes.forEach((theme, ti) => {
        if (chapter.theme === theme.name || chapter.content.includes(theme.name)) {
          links.push({
            source: `theme-${ti}`,
            target: `chapter-${chapter.id}`,
            strength: 0.3
          });
        }
      });
    });
  }

  return { nodes, links };
}

// 创建节点
function createNodes(nodes) {
  const scene = knowledgeGraphState.scene;
  knowledgeGraphState.nodes = nodes;
  knowledgeGraphState.nodeMeshes = [];

  nodes.forEach(node => {
    const geometry = new THREE.SphereGeometry(node.size, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: nodeColors[node.type] || 0x999999,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x, node.y, node.z);
    mesh.userData = node;

    // 添加发光效果
    const glowGeometry = new THREE.SphereGeometry(node.size * 1.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: nodeColors[node.type] || 0x999999,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    scene.add(mesh);
    knowledgeGraphState.nodeMeshes.push(mesh);

    // 创建文字标签
    createNodeLabel(node, mesh);
  });

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
  pointLight2.position.set(-10, -10, 10);
  scene.add(pointLight2);
}

// 创建节点标签
function createNodeLabel(node, mesh) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;

  // 绘制文字背景
  ctx.fillStyle = 'rgba(247, 245, 240, 0.9)';
  ctx.fillRect(0, 0, 256, 128);

  // 绘制文字
  ctx.font = 'bold 32px "Noto Serif SC", serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.name, 128, 64);

  // 创建纹理
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 2, 1);
  sprite.position.set(0, node.size + 1, 0);

  mesh.add(sprite);
}

// 创建连线
function createLinks(links) {
  const scene = knowledgeGraphState.scene;
  knowledgeGraphState.links = links;
  knowledgeGraphState.linkMeshes = [];

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.2
  });

  links.forEach(link => {
    const sourceNode = knowledgeGraphState.nodes.find(n => n.id === link.source);
    const targetNode = knowledgeGraphState.nodes.find(n => n.id === link.target);

    if (sourceNode && targetNode) {
      const points = [
        new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z),
        new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);

      scene.add(line);
      knowledgeGraphState.linkMeshes.push({
        mesh: line,
        source: sourceNode,
        target: targetNode
      });
    }
  });
}

// 动画循环
function animateGraph() {
  if (!knowledgeGraphState.renderer) return;

  knowledgeGraphState.animationId = requestAnimationFrame(animateGraph);

  // 自动旋转
  if (!knowledgeGraphState.isDragging) {
    knowledgeGraphState.scene.rotation.y += 0.001;
  }

  // 更新节点位置
  knowledgeGraphState.nodeMeshes.forEach((mesh, i) => {
    const node = knowledgeGraphState.nodes[i];
    if (node) {
      mesh.position.x = node.x;
      mesh.position.y = node.y;
      mesh.position.z = node.z;
    }
  });

  // 更新连线
  knowledgeGraphState.linkMeshes.forEach(linkData => {
    const positions = linkData.mesh.geometry.attributes.position.array;
    positions[0] = linkData.source.x;
    positions[1] = linkData.source.y;
    positions[2] = linkData.source.z;
    positions[3] = linkData.target.x;
    positions[4] = linkData.target.y;
    positions[5] = linkData.target.z;
    linkData.mesh.geometry.attributes.position.needsUpdate = true;
  });

  knowledgeGraphState.renderer.render(
    knowledgeGraphState.scene,
    knowledgeGraphState.camera
  );
}

// 初始化交互
function initGraphInteraction(container, canvas) {
  let startX, startY;

  // 触摸事件
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    knowledgeGraphState.isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    // 检测点击
    const touch = e.touches[0];
    checkNodeClick(touch.clientX, touch.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!knowledgeGraphState.isDragging) return;

    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;

    // 旋转整个场景
    knowledgeGraphState.scene.rotation.y += deltaX * 0.005;
    knowledgeGraphState.scene.rotation.x += deltaY * 0.005;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    knowledgeGraphState.isDragging = false;
  }, { passive: true });

  // 鼠标事件
  canvas.addEventListener('mousedown', (e) => {
    knowledgeGraphState.isDragging = true;
    knowledgeGraphState.previousMousePosition = { x: e.clientX, y: e.clientY };
    checkNodeClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!knowledgeGraphState.isDragging) return;

    const deltaX = e.clientX - knowledgeGraphState.previousMousePosition.x;
    const deltaY = e.clientY - knowledgeGraphState.previousMousePosition.y;

    knowledgeGraphState.scene.rotation.y += deltaX * 0.005;
    knowledgeGraphState.scene.rotation.x += deltaY * 0.005;

    knowledgeGraphState.previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', () => {
    knowledgeGraphState.isDragging = false;
  });

  // 滚轮缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * 0.001;
    knowledgeGraphState.camera.position.z = Math.max(
      20,
      Math.min(100, knowledgeGraphState.camera.position.z + delta * 10)
    );
  }, { passive: false });
}

// 检测节点点击
function checkNodeClick(clientX, clientY) {
  const container = document.getElementById('knowledge-graph-container');
  const rect = container.getBoundingClientRect();

  const mouse = new THREE.Vector2();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, knowledgeGraphState.camera);

  const intersects = raycaster.intersectObjects(knowledgeGraphState.nodeMeshes);

  if (intersects.length > 0) {
    const node = intersects[0].object.userData;
    selectNode(node);
  }
}

// 选择节点
function selectNode(node) {
  knowledgeGraphState.selectedNode = node;

  // 显示节点详情
  const detail = document.getElementById('knowledge-graph-detail');
  const title = document.getElementById('kg-detail-title');
  const content = document.getElementById('kg-detail-content');

  title.textContent = node.name;

  if (node.type === 'chapter') {
    content.innerHTML = `
      <p class="text-sm text-ink-light mb-2">${node.data.title}</p>
      <p class="text-sm text-ink-light mb-2">主题：${node.data.theme}</p>
      <p class="text-sm text-ink-light mb-2">类型：${node.data.type}</p>
      <button onclick="window.showChapterDetail(${node.data.id})" class="mt-3 px-4 py-2 bg-cinnabar text-white rounded-lg text-sm">
        查看章节
      </button>
    `;
  } else if (node.type === 'theme') {
    content.innerHTML = `
      <p class="text-sm text-ink-light mb-2">${node.data.description}</p>
      <p class="text-sm text-ink-light">包含 ${node.data.count} 个相关章节</p>
    `;
  } else if (node.type === 'concept') {
    content.innerHTML = `
      <p class="text-sm text-ink-light">核心概念</p>
      <p class="text-sm text-ink-light mt-2">与多个主题和章节相关联</p>
    `;
  }

  detail.classList.remove('opacity-0', 'translate-y-full');
  detail.classList.add('opacity-100', 'translate-y-0');
}

// 关闭节点详情
export function closeKnowledgeGraphDetail() {
  const detail = document.getElementById('knowledge-graph-detail');
  detail.classList.add('opacity-0', 'translate-y-full');
  detail.classList.remove('opacity-100', 'translate-y-0');
  knowledgeGraphState.selectedNode = null;
}

// 重置视图
export function resetKnowledgeGraphView() {
  if (knowledgeGraphState.camera) {
    knowledgeGraphState.camera.position.z = 50;
    knowledgeGraphState.scene.rotation.set(0, 0, 0);
  }
}

// 过滤显示
export function filterKnowledgeGraph(type) {
  knowledgeGraphState.nodeMeshes.forEach(mesh => {
    const node = mesh.userData;
    if (type === 'all' || node.type === type) {
      mesh.visible = true;
    } else {
      mesh.visible = false;
    }
  });

  // 更新连线可见性
  knowledgeGraphState.linkMeshes.forEach(linkData => {
    const sourceVisible = linkData.source.id ?
      knowledgeGraphState.nodeMeshes.find(m => m.userData.id === linkData.source.id)?.visible :
      false;
    const targetVisible = linkData.target.id ?
      knowledgeGraphState.nodeMeshes.find(m => m.userData.id === linkData.target.id)?.visible :
      false;
    linkData.mesh.visible = sourceVisible && targetVisible;
  });
}
