// LLM知识图谱模块 - 2D网状知识图谱可视化
// 基于LLM解析的实体关系数据，使用SVG+物理引擎实现力导向图

import { showChapterDetail } from './chapters.js';

// 图谱状态
let llmGraphState = {
  svg: null,
  container: null,
  width: 0,
  height: 0,
  nodes: [],
  links: [],
  simulation: null,
  selectedNode: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragNode: null,
  hoverNode: null
};

// 实体类型颜色配置
const entityColors = {
  core_concept: '#c93756',  // 核心概念 - 朱红
  concept: '#8b4513',       // 概念 - 赭石
  role: '#c9a227',          // 角色 - 金色
  attribute: '#6b8e6b',     // 属性 - 青绿
  metaphor: '#4a6741',      // 隐喻 - 深绿
  action: '#1a1a1a',        // 行为 - 墨黑
  event: '#666666',         // 事件 - 灰色
  negative: '#999999'       // 负面 - 淡灰
};

// 关系类型样式
const relationStyles = {
  generates: { color: '#c93756', dash: '', width: 2 },
  transforms: { color: '#6b8e6b', dash: '', width: 1.5 },
  practices: { color: '#c9a227', dash: '5,5', width: 1.5 },
  follows: { color: '#1a1a1a', dash: '', width: 1 },
  opposes: { color: '#666666', dash: '10,5', width: 1.5 },
  conquers: { color: '#c93756', dash: '', width: 2 },
  embodies: { color: '#8b4513', dash: '3,3', width: 1 },
  default: { color: '#999999', dash: '', width: 1 }
};

// 初始化LLM知识图谱
export async function initLLMKnowledgeGraph() {
  const container = document.getElementById('llm-knowledge-graph-container');
  if (!container) return;

  llmGraphState.container = container;
  llmGraphState.width = container.clientWidth;
  llmGraphState.height = container.clientHeight || 500;

  // 加载数据
  try {
    const response = await fetch('/data/knowledge-graph-data.json');
    const data = await response.json();
    renderGraph(data);
  } catch (error) {
    console.error('加载知识图谱数据失败:', error);
    container.innerHTML = '<p class="text-center text-ink-light py-8">加载失败，请刷新重试</p>';
  }
}

// 渲染图谱
function renderGraph(data) {
  const { entities, relations } = data;

  // 初始化节点位置（环形分布）
  const centerX = llmGraphState.width / 2;
  const centerY = llmGraphState.height / 2;
  const radius = Math.min(centerX, centerY) * 0.7;

  llmGraphState.nodes = entities.map((entity, i) => {
    const angle = (i / entities.length) * Math.PI * 2;
    return {
      ...entity,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: getNodeRadius(entity)
    };
  });

  // 处理连线关系
  llmGraphState.links = relations.map(rel => {
    const sourceNode = llmGraphState.nodes.find(n => n.id === rel.source);
    const targetNode = llmGraphState.nodes.find(n => n.id === rel.target);
    return {
      ...rel,
      source: sourceNode,
      target: targetNode
    };
  }).filter(link => link.source && link.target);

  // 创建SVG
  createSVG();

  // 启动物理模拟
  startSimulation();

  // 渲染
  drawGraph();
}

// 获取节点半径
function getNodeRadius(entity) {
  const baseRadius = {
    core_concept: 25,
    concept: 20,
    role: 22,
    attribute: 18,
    metaphor: 20,
    action: 18,
    event: 16,
    negative: 15
  };
  // 根据频率调整大小
  const freqBonus = Math.min(10, (entity.frequency || 0) / 10);
  return (baseRadius[entity.type] || 18) + freqBonus;
}

// 创建SVG画布
function createSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${llmGraphState.width} ${llmGraphState.height}`);
  svg.style.cursor = 'grab';

  // 添加缩放和平移变换组
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('id', 'graph-transform');
  svg.appendChild(g);

  // 添加defs（箭头标记等）
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#999" opacity="0.6"/>
    </marker>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  llmGraphState.svg = svg;
  llmGraphState.container.innerHTML = '';
  llmGraphState.container.appendChild(svg);

  // 绑定事件
  bindEvents(svg);
}

// 绑定交互事件
function bindEvents(svg) {
  let isPanning = false;
  let startX, startY;

  // 鼠标/触摸按下
  const handleStart = (e) => {
    const point = getEventPoint(e);
    const node = findNodeAt(point.x, point.y);

    if (node) {
      llmGraphState.isDragging = true;
      llmGraphState.dragNode = node;
      selectNode(node);
    } else {
      isPanning = true;
      startX = point.x - llmGraphState.panX;
      startY = point.y - llmGraphState.panY;
      svg.style.cursor = 'grabbing';
    }
  };

  // 鼠标/触摸移动
  const handleMove = (e) => {
    e.preventDefault();
    const point = getEventPoint(e);

    if (llmGraphState.isDragging && llmGraphState.dragNode) {
      llmGraphState.dragNode.x = point.x;
      llmGraphState.dragNode.y = point.y;
      llmGraphState.dragNode.vx = 0;
      llmGraphState.dragNode.vy = 0;
    } else if (isPanning) {
      llmGraphState.panX = point.x - startX;
      llmGraphState.panY = point.y - startY;
      updateTransform();
    }

    // 检测悬停
    const hoverNode = findNodeAt(point.x, point.y);
    if (hoverNode !== llmGraphState.hoverNode) {
      llmGraphState.hoverNode = hoverNode;
      drawGraph();
    }
  };

  // 鼠标/触摸释放
  const handleEnd = () => {
    llmGraphState.isDragging = false;
    llmGraphState.dragNode = null;
    isPanning = false;
    svg.style.cursor = 'grab';
  };

  // 滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    llmGraphState.zoom = Math.max(0.3, Math.min(3, llmGraphState.zoom * delta));
    updateTransform();
  };

  // 绑定事件
  svg.addEventListener('mousedown', handleStart);
  svg.addEventListener('mousemove', handleMove);
  svg.addEventListener('mouseup', handleEnd);
  svg.addEventListener('mouseleave', handleEnd);
  svg.addEventListener('wheel', handleWheel, { passive: false });

  // 触摸事件
  svg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0]);
    }
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0]);
    }
  }, { passive: false });

  svg.addEventListener('touchend', handleEnd);
}

// 获取事件坐标
function getEventPoint(e) {
  const rect = llmGraphState.svg.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - llmGraphState.panX) / llmGraphState.zoom,
    y: (e.clientY - rect.top - llmGraphState.panY) / llmGraphState.zoom
  };
}

// 查找点击的节点
function findNodeAt(x, y) {
  return llmGraphState.nodes.find(node => {
    const dx = node.x - x;
    const dy = node.y - y;
    return Math.sqrt(dx * dx + dy * dy) < node.radius;
  });
}

// 更新变换
function updateTransform() {
  const g = document.getElementById('graph-transform');
  if (g) {
    g.setAttribute('transform', `translate(${llmGraphState.panX}, ${llmGraphState.panY}) scale(${llmGraphState.zoom})`);
  }
}

// 启动物理模拟（简单的力导向算法）
function startSimulation() {
  const simulate = () => {
    if (!llmGraphState.svg) return;

    const centerX = llmGraphState.width / 2;
    const centerY = llmGraphState.height / 2;

    // 应用各种力
    llmGraphState.nodes.forEach(node => {
      if (node === llmGraphState.dragNode) return;

      let fx = 0, fy = 0;

      // 向中心的引力（防止飘散）
      fx += (centerX - node.x) * 0.001;
      fy += (centerY - node.y) * 0.001;

      // 节点间的斥力
      llmGraphState.nodes.forEach(other => {
        if (node === other) return;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 150) {
          const force = 2000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      });

      // 连线的弹簧力
      llmGraphState.links.forEach(link => {
        if (link.source === node || link.target === node) {
          const other = link.source === node ? link.target : link.source;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const targetDist = 100;
          const force = (dist - targetDist) * 0.01;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      });

      // 更新速度
      node.vx = (node.vx + fx) * 0.8;
      node.vy = (node.vy + fy) * 0.8;

      // 更新位置
      node.x += node.vx;
      node.y += node.vy;

      // 边界限制
      node.x = Math.max(node.radius, Math.min(llmGraphState.width - node.radius, node.x));
      node.y = Math.max(node.radius, Math.min(llmGraphState.height - node.radius, node.y));
    });

    drawGraph();
    requestAnimationFrame(simulate);
  };

  simulate();
}

// 绘制图谱
function drawGraph() {
  const g = document.getElementById('graph-transform');
  if (!g) return;

  // 清空
  g.innerHTML = '';

  // 绘制连线
  llmGraphState.links.forEach(link => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const style = relationStyles[link.type] || relationStyles.default;

    line.setAttribute('x1', link.source.x);
    line.setAttribute('y1', link.source.y);
    line.setAttribute('x2', link.target.x);
    line.setAttribute('y2', link.target.y);
    line.setAttribute('stroke', style.color);
    line.setAttribute('stroke-width', style.width);
    line.setAttribute('stroke-dasharray', style.dash);
    line.setAttribute('opacity', '0.5');

    g.appendChild(line);
  });

  // 绘制节点
  llmGraphState.nodes.forEach(node => {
    const isSelected = llmGraphState.selectedNode === node;
    const isHovered = llmGraphState.hoverNode === node;
    const color = entityColors[node.type] || entityColors.concept;

    // 节点外圈（选中或悬停时显示）
    if (isSelected || isHovered) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', node.x);
      ring.setAttribute('cy', node.y);
      ring.setAttribute('r', node.radius + 5);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', color);
      ring.setAttribute('stroke-width', '2');
      ring.setAttribute('opacity', '0.5');
      g.appendChild(ring);
    }

    // 节点圆形
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', node.radius);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('filter', isSelected ? 'url(#glow)' : '');
    circle.style.cursor = 'pointer';
    g.appendChild(circle);

    // 节点文字
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.x);
    text.setAttribute('y', node.y);
    text.setAttribute('dy', '0.35em');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', node.radius > 20 ? '14' : '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', '"Noto Serif SC", serif');
    text.textContent = node.name;
    text.style.pointerEvents = 'none';
    g.appendChild(text);

    // 类型标签（悬停时显示）
    if (isHovered) {
      const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const typeName = getTypeName(node.type);
      labelBg.setAttribute('x', node.x - 30);
      labelBg.setAttribute('y', node.y + node.radius + 5);
      labelBg.setAttribute('width', '60');
      labelBg.setAttribute('height', '20');
      labelBg.setAttribute('rx', '10');
      labelBg.setAttribute('fill', 'rgba(0,0,0,0.7)');
      g.appendChild(labelBg);

      const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeText.setAttribute('x', node.x);
      typeText.setAttribute('y', node.y + node.radius + 18);
      typeText.setAttribute('text-anchor', 'middle');
      typeText.setAttribute('fill', '#fff');
      typeText.setAttribute('font-size', '10');
      typeText.textContent = typeName;
      g.appendChild(typeText);
    }
  });
}

// 获取类型名称
function getTypeName(type) {
  const names = {
    core_concept: '核心概念',
    concept: '概念',
    role: '角色',
    attribute: '属性',
    metaphor: '隐喻',
    action: '行为',
    event: '事件',
    negative: '负面'
  };
  return names[type] || type;
}

// 选择节点
function selectNode(node) {
  llmGraphState.selectedNode = node;

  // 显示详情面板
  const detail = document.getElementById('llm-graph-detail');
  const title = document.getElementById('llm-detail-title');
  const type = document.getElementById('llm-detail-type');
  const desc = document.getElementById('llm-detail-desc');
  const related = document.getElementById('llm-detail-related');
  const chapters = document.getElementById('llm-detail-chapters');

  title.textContent = node.name;
  type.textContent = getTypeName(node.type);
  type.className = `inline-block px-3 py-1 rounded-full text-xs text-white mb-3`;
  type.style.backgroundColor = entityColors[node.type] || entityColors.concept;
  desc.textContent = node.description || '暂无描述';

  // 查找相关节点
  const relatedNodes = llmGraphState.links
    .filter(link => link.source === node || link.target === node)
    .map(link => {
      const other = link.source === node ? link.target : link.source;
      return `<span class="inline-block px-2 py-1 bg-paper rounded text-xs mr-2 mb-2">${other.name} (${getRelationName(link.type)})</span>`;
    })
    .join('');
  related.innerHTML = relatedNodes || '<span class="text-xs text-ink-light">无直接关系</span>';

  // 查找相关章节
  fetch('/data/knowledge-graph-data.json')
    .then(r => r.json())
    .then(data => {
      const chapterEntities = data.chapters_entities.filter(ce =>
        ce.entities.includes(node.id)
      );
      if (chapterEntities.length > 0) {
        chapters.innerHTML = chapterEntities.slice(0, 5).map(ce =>
          `<button onclick="window.showChapterDetail(${ce.chapter_id})" class="inline-block px-2 py-1 bg-cinnabar/10 text-cinnabar rounded text-xs mr-2 mb-2 hover:bg-cinnabar/20 transition-colors">第${ce.chapter_id}章</button>`
        ).join('');
      } else {
        chapters.innerHTML = '<span class="text-xs text-ink-light">暂无关联章节</span>';
      }
    });

  detail.classList.remove('opacity-0', 'translate-y-full', 'pointer-events-none');
  detail.classList.add('opacity-100', 'translate-y-0');
}

// 获取关系名称
function getRelationName(type) {
  const names = {
    generates: '生成',
    transforms: '转化',
    practices: '实践',
    follows: '遵循',
    opposes: '对立',
    conquers: '克制',
    embodies: '体现',
    possesses: '拥有',
    governs: '治理',
    rules: '统治',
    depends_on: '依赖',
    nourished_by: '养育',
    represented_by: '象征',
    emulates: '效法',
    returns_to: '回归',
    should_follow: '应遵循',
    violates: '违背'
  };
  return names[type] || type;
}

// 关闭详情面板
export function closeLLMGraphDetail() {
  const detail = document.getElementById('llm-graph-detail');
  detail.classList.add('opacity-0', 'translate-y-full', 'pointer-events-none');
  detail.classList.remove('opacity-100', 'translate-y-0');
  llmGraphState.selectedNode = null;
}

// 重置视图
export function resetLLMGraphView() {
  llmGraphState.zoom = 1;
  llmGraphState.panX = 0;
  llmGraphState.panY = 0;
  updateTransform();

  // 重新布局
  const centerX = llmGraphState.width / 2;
  const centerY = llmGraphState.height / 2;
  const radius = Math.min(centerX, centerY) * 0.7;

  llmGraphState.nodes.forEach((node, i) => {
    const angle = (i / llmGraphState.nodes.length) * Math.PI * 2;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.vx = 0;
    node.vy = 0;
  });
}

// 搜索节点
export function searchLLMGraphNode(keyword) {
  const node = llmGraphState.nodes.find(n =>
    n.name.includes(keyword) || n.description?.includes(keyword)
  );
  if (node) {
    selectNode(node);
    // 将节点移到中心
    llmGraphState.panX = llmGraphState.width / 2 - node.x * llmGraphState.zoom;
    llmGraphState.panY = llmGraphState.height / 2 - node.y * llmGraphState.zoom;
    updateTransform();
  }
}

// 按类型筛选
export function filterLLMGraphByType(type) {
  if (type === 'all') {
    llmGraphState.nodes.forEach(node => {
      const el = document.querySelector(`circle[cx="${node.x}"][cy="${node.y}"]`);
      if (el) el.style.opacity = '1';
    });
  } else {
    llmGraphState.nodes.forEach(node => {
      const matches = node.type === type;
      // 更新透明度
      node.opacity = matches ? 1 : 0.2;
    });
  }
  drawGraph();
}
