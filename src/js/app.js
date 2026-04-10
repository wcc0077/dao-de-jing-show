// 道德经可视化应用
import { pinyin } from 'pinyin-pro';

let daoData = null;
let currentPage = 'home';
let wordCloudScene = null;
let wordCloudRenderer = null;
let wordCloudCamera = null;
let wordCloudWords = [];
let selectedWord = null;

// 音频播放状态
let audioState = {
  isPlaying: false,
  currentChapterId: null,
  speechUtterance: null,
  playbackSpeed: 0.8, // 朗读速度
  isPaused: false
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initApp();
  initAudioPlayer();
});

// 加载数据
async function loadData() {
  try {
    const response = await fetch('/data/daodejing.json');
    daoData = await response.json();
  } catch {
    daoData = getFallbackData();
  }
}

// 备用数据
function getFallbackData() {
  return {
    title: "道德经",
    author: "老子",
    chapters: [],
    wordFrequency: [],
    themes: []
  };
}

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

// 页面切换
function showPage(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // 显示目标页面
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageName;

    // 特殊处理
    if (pageName === 'wordcloud') {
      setTimeout(initWordCloud, 100);
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
function updateNavState() {
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

// 初始化主题预览
function initThemePreview() {
  const container = document.getElementById('theme-preview');
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

// 初始化章节列表
function initChapters() {
  const grid = document.getElementById('chapters-grid');
  if (!grid || !daoData.chapters) return;

  grid.innerHTML = daoData.chapters.map(chapter => `
    <div class="chapter-card bg-white p-5 rounded-xl shadow-sm cursor-pointer border-l-4 ${
      chapter.type === '道经' ? 'border-cinnabar' : 'border-jade'
    }" data-chapter-id="${chapter.id}" onclick="showChapterDetail(${chapter.id})">
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

// 显示章节详情（新页面）
function showChapterDetail(chapterId) {
  const chapter = daoData.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const container = document.getElementById('chapter-detail-content');
  if (!container) return;

  const isCurrentlyPlaying = audioState.currentChapterId === chapterId && audioState.isPlaying && !audioState.isPaused;

  // 生成配图（基于章节主题和内容的视觉诠释）
  const chapterImage = generateChapterImage(chapter);

  container.innerHTML = `
    <!-- 扁平化头部（仅显示标题） -->
    <div class="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-ink/5">
      <div class="flex items-center justify-between px-4 py-3">
        <button onclick="showPage('chapters')" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink/5 transition-colors">
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

    <!-- 章节配图（大尺寸，与背景融合） -->
    <div class="w-full h-56 -mt-16 pt-16 overflow-hidden">
      ${chapterImage}
    </div>

    <div class="px-4 pb-6">
      <!-- 原文内容（集成播放按钮） -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-full bg-cinnabar/10 flex items-center justify-center text-cinnabar text-xs">经</span>
          <span class="text-xs text-ink-light">原文</span>
          <span class="flex-1"></span>
          <!-- 紧凑播放按钮（放在标题行） -->
          <div class="flex items-center gap-1">
            <button onclick="toggleDetailAudioPlayback(${chapter.id})" id="detail-play-btn-${chapter.id}" class="w-6 h-6 rounded-full ${isCurrentlyPlaying ? 'bg-cinnabar text-white' : 'bg-cinnabar/10 text-cinnabar'} flex items-center justify-center transition-all">
              <svg id="detail-play-icon-${chapter.id}" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="${isCurrentlyPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>
              </svg>
            </button>
            <button onclick="cyclePlaybackSpeed(${chapter.id})" id="detail-speed-btn-${chapter.id}" class="text-xs text-ink-light hover:text-cinnabar transition-colors min-w-[28px] text-center">
              ${audioState.playbackSpeed}x
            </button>
          </div>
          <span class="text-xs text-ink-light/50 ml-2">${chapter.content.length} 字</span>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <!-- 手写字体原文带拼音 -->
          <div class="font-handwriting text-xl leading-loose text-ink text-justify" style="font-family: 'ZCOOL XiaoWei', cursive;">
            ${formatContentWithPinyin(chapter.content)}
          </div>
        </div>
      </div>

      <!-- 原文解释（无边框，更融合） -->
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
          <button onclick="showChapterDetail(${chapterId - 1})" class="flex items-center gap-2 px-3 py-2 text-sm text-ink-light hover:text-ink transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>第${chapterId - 1}章</span>
          </button>
        ` : '<span></span>'}

        ${chapterId < 81 ? `
          <button onclick="showChapterDetail(${chapterId + 1})" class="flex items-center gap-2 px-3 py-2 text-sm text-ink-light hover:text-ink transition-colors">
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

  // 滚动到顶部
  window.scrollTo(0, 0);
}

// 生成章节配图（基于CSS的水墨风格图像）
function generateChapterImage(chapter) {
  // 根据章节主题和类型生成不同的视觉风格
  const isDaoJing = chapter.type === '道经';
  const themeColors = isDaoJing
    ? ['#c93756', '#8b4513', '#2c1810'] // 道经：朱红、赭石、墨色
    : ['#6b8e6b', '#4a6741', '#1a1a1a']; // 德经：青绿、深绿、墨色

  // 根据章节ID生成独特的图案种子
  const seed = chapter.id * 137;

  // 创建SVG水墨风格图像
  return `
    <svg class="w-full h-full" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <!-- 水墨渐变 -->
        <radialGradient id="ink-wash-${chapter.id}" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${themeColors[0]}" stop-opacity="0.15"/>
          <stop offset="50%" stop-color="${themeColors[1]}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${themeColors[2]}" stop-opacity="0.03"/>
        </radialGradient>

        <!-- 水波纹图案 -->
        <pattern id="waves-${chapter.id}" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
          <path d="M0,10 Q25,0 50,10 T100,10" stroke="${themeColors[0]}" stroke-width="0.5" fill="none" opacity="0.3"/>
        </pattern>

        <!-- 模糊滤镜 -->
        <filter id="blur-${chapter.id}">
          <feGaussianBlur stdDeviation="${2 + (chapter.id % 3)}"/>
        </filter>
      </defs>

      <!-- 背景 -->
      <rect width="100%" height="100%" fill="#f7f5f0"/>

      <!-- 水墨晕染效果 -->
      <ellipse cx="${200 + (seed % 60 - 30)}" cy="${150 + (seed % 40 - 20)}" rx="${120 + (seed % 40)}" ry="${80 + (seed % 30)}"
               fill="url(#ink-wash-${chapter.id})" filter="url(#blur-${chapter.id})"/>

      <!-- 山峦轮廓（简化的水墨山形） -->
      <path d="M0,300
               Q${50 + (seed % 20)},${200 - (seed % 30)} ${100 + (seed % 30)},${220 + (seed % 20)}
               T${200 + (seed % 25)},${180 - (seed % 25)}
               T${300 + (seed % 20)},${210 + (seed % 20)}
               T400,300 Z"
            fill="${themeColors[2]}" opacity="0.06"/>

      <!-- 水波纹 -->
      <rect x="0" y="200" width="400" height="100" fill="url(#waves-${chapter.id})" opacity="0.5"/>

      <!-- 远山淡影 -->
      <ellipse cx="${300 - (seed % 40)}" cy="${80 + (seed % 20)}" rx="${60 + (seed % 20)}" ry="${30 + (seed % 15)}"
               fill="${themeColors[1]}" opacity="0.05" filter="url(#blur-${chapter.id})"/>

      <!-- 印章效果 -->
      <g transform="translate(${320 + (seed % 10)}, ${240 + (seed % 15)}) rotate(${-5 + (seed % 10)})">
        <rect x="0" y="0" width="40" height="40" fill="none" stroke="${themeColors[0]}" stroke-width="2" opacity="0.6"/>
        <rect x="4" y="4" width="32" height="32" fill="none" stroke="${themeColors[0]}" stroke-width="1" opacity="0.4"/>
        <text x="20" y="18" text-anchor="middle" font-size="10" fill="${themeColors[0]}" opacity="0.8" font-family="serif">道</text>
        <text x="20" y="32" text-anchor="middle" font-size="10" fill="${themeColors[0]}" opacity="0.8" font-family="serif">${chapter.id}</text>
      </g>

      <!-- 装饰性墨点 -->
      ${Array.from({length: 5 + (chapter.id % 5)}, (_, i) => {
        const x = 30 + ((seed * (i + 1)) % 340);
        const y = 30 + ((seed * (i + 3)) % 240);
        const r = 2 + ((seed * (i + 2)) % 6);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${themeColors[2]}" opacity="0.1"/>`;
      }).join('')}
    </svg>
  `;
}

// 获取章节原文解释（白话文翻译）
function getChapterExplanation(chapter) {
  // 常见章节的翻译映射
  const explanations = {
    1: '道，如果可以言说，就不是永恒不变的道；名，如果可以命名，就不是永恒不变的名。无，是天地形成的本始；有，是万物产生的根源。',
    2: '天下人都知道美之所以为美，那是因为有了丑的存在；都知道善之所以为善，那是因为有了恶的存在。有和无互相生成，难和易互相形成，长和短互相显现，高和下互相充实，音和声互相调和，前和后互相跟随。',
    3: '不推崇贤能，使人民不争名夺利；不珍视难得的财货，使人民不去偷窃；不炫耀引起贪欲的事物，使民心不被惑乱。',
    4: '道是空虚的，但用之不尽。它渊深如万物之宗，挫去其锋锐，解去其纷乱，调和其光辉，使其混同于尘垢。',
    5: '天地没有仁爱之心，把万物当作刍狗；圣人没有仁爱之心，把百姓当作刍狗。天地之间，不就像风箱吗？空虚而不枯竭，越鼓动风就越多。多言多语就会陷入困境，不如保持虚静。',
    6: '谷神不死，这就是玄妙的母性。玄妙母性的门户，就是天地的根源。绵绵不绝，好像存在，用起来却不穷尽。',
    7: '天地之所以能长久，是因为它不为自己而生，所以能长生。圣人把自身放在后面，反而能占先；把自身置之度外，反而能保全。',
    8: '上善之人像水一样。水善于滋润万物而不争，停留在众人厌恶的低洼处，所以最接近于道。',
    9: '持满不如停止，锤打太尖利就不能长久保持。金玉满堂，没有人能够守住。富贵而骄傲，会给自己招来灾祸。功业完成就退身，这是天之道。',
    10: '精神和形体合一，能不分离吗？聚结精气以致柔和，能像婴儿一样吗？涤除杂念而观照清明，能没有瑕疵吗？爱民治国，能不用智巧吗？',
    11: '三十根辐条汇集到一个毂上，有了车毂中空的地方，才有车的作用。揉和陶土做成器皿，有了器皿中空的地方，才有器皿的作用。开凿门窗建造房屋，有了门窗四壁中空的地方，才有房屋的作用。所以，"有"给人便利，"无"发挥了作用。',
    12: '五色使人眼花，五音使人耳聋，五味使人口伤，驰马打猎使人心发狂，难得的财货使人行为不轨。',
    13: '宠辱若惊，重视大患就像重视自己的身体。什么叫宠辱若惊？宠是卑下，得到宠爱感到惊喜，失去宠爱感到惊恐，这就叫做宠辱若惊。',
    14: '看它看不见，名叫"夷"；听它听不到，名叫"希"；摸它摸不着，名叫"微"。这三者不可穷究，它们混而为一。',
    15: '古时候的善为道者，微妙玄通，深不可识。正因为不可识，所以只能勉强形容他：迟疑犹豫像冬天涉冰，警觉戒备像提防四邻。',
    16: '致虚极，守静笃。万物并作，我以观复。夫物芸芸，各复归其根。归根曰静，静曰复命。复命曰常，知常曰明。',
    17: '最好的统治者，人民只知道有他；其次的统治者，人民亲近而赞誉他；再次的统治者，人民畏惧他；最次的统治者，人民轻蔑他。',
    18: '大道废弃，才有仁义；智慧出现，才有大伪；六亲不和，才有孝慈；国家昏乱，才有忠臣。',
    19: '绝圣弃智，民利百倍；绝仁弃义，民复孝慈；绝巧弃利，盗贼无有。此三者以为文不足，故令有所属。见素抱朴，少私寡欲。',
    20: '绝学无忧。唯之与阿，相去几何？善之与恶，相去若何？人之所畏，不可不畏。荒兮其未央哉！',
    21: '孔德之容，惟道是从。道之为物，惟恍惟惚。惚兮恍兮，其中有象；恍兮惚兮，其中有物；窈兮冥兮，其中有精。',
    22: '曲则全，枉则直，洼则盈，敝则新，少则得，多则惑。是以圣人抱一为天下式。不自见故明，不自是故彰，不自伐故有功，不自矜故长。',
    23: '希言自然。故飘风不终朝，骤雨不终日。孰为此者？天地。天地尚不能久，而况于人乎？',
    24: '企者不立，跨者不行。自见者不明，自是者不彰，自伐者无功，自矜者不长。其在道也，曰余食赘行。物或恶之，故有道者不处。',
    25: '有物混成，先天地生。寂兮寥兮，独立而不改，周行而不殆，可以为天地母。吾不知其名，字之曰道，强为之名曰大。',
    26: '重为轻根，静为躁君。是以君子终日行不离辎重。虽有荣观，燕处超然。奈何万乘之主而以身轻天下？轻则失根，躁则失君。',
    27: '善行无辙迹，善言无瑕谪，善数不用筹策，善闭无关楗而不可开，善结无绳约而不可解。',
    28: '知其雄，守其雌，为天下谿。为天下谿，常德不离，复归于婴儿。知其白，守其黑，为天下式。为天下式，常德不忒，复归于无极。',
    29: '将欲取天下而为之，吾见其不得已。天下神器，不可为也。为者败之，执者失之。故物或行或随，或歔或吹，或强或羸，或载或隳。',
    30: '以道佐人主者，不以兵强天下。其事好还。师之所处，荆棘生焉。大军之后，必有凶年。善有果而已，不敢以取强。',
    31: '夫兵者，不祥之器，物或恶之，故有道者不处。君子居则贵左，用兵则贵右。兵者不祥之器，非君子之器，不得已而用之。',
    32: '道常无名，朴虽小，天下莫能臣也。侯王若能守之，万物将自宾。天地相合，以降甘露，民莫之令而自均。',
    33: '知人者智，自知者明。胜人者有力，自胜者强。知足者富，强行者有志。不失其所者久，死而不亡者寿。',
    34: '大道泛兮，其可左右。万物恃之而生而不辞，功成而不有，衣养万物而不为主。常无欲，可名于小；万物归焉而不为主，可名为大。',
    35: '执大象，天下往。往而不害，安平太。乐与饵，过客止。道之出口，淡乎其无味，视之不足见，听之不足闻，用之不足既。',
    36: '将欲歙之，必固张之；将欲弱之，必固强之；将欲废之，必固兴之；将欲夺之，必固与之。是谓微明。柔弱胜刚强。',
    37: '道常无为而无不为。侯王若能守之，万物将自化。化而欲作，吾将镇之以无名之朴。镇之以无名之朴，夫将不欲。不欲以静，天下将自正。',
    38: '上德不德，是以有德；下德不失德，是以无德。上德无为而无以为，下德为之而有以为。上仁为之而无以为，上义为之而有以为。',
    39: '昔之得一者，天得一以清，地得一以宁，神得一以灵，谷得一以盈，万物得一以生，侯王得一以为天下贞。其致之也，谓天无以清将恐裂，地无以宁将恐发。',
    40: '反者道之动，弱者道之用。天下万物生于有，有生于无。',
    41: '上士闻道，勤而行之；中士闻道，若存若亡；下士闻道，大笑之。不笑不足以为道。故建言有之：明道若昧，进道若退，夷道若纇。',
    42: '道生一，一生二，二生三，三生万物。万物负阴而抱阳，冲气以为和。人之所恶，唯孤、寡、不谷，而王公以为称。',
    43: '天下之至柔，驰骋天下之至坚。无有入无间，吾是以知无为之有益。不言之教，无为之益，天下希及之。',
    44: '名与身孰亲？身与货孰多？得与亡孰病？甚爱必大费，多藏必厚亡。故知足不辱，知止不殆，可以长久。',
    45: '大成若缺，其用不弊。大盈若冲，其用不穷。大直若屈，大巧若拙，大辩若讷。静胜躁，寒胜热，清静为天下正。',
    46: '天下有道，却走马以粪；天下无道，戎马生于郊。祸莫大于不知足，咎莫大于欲得。故知足之足，常足矣。',
    47: '不出户，知天下；不窥牖，见天道。其出弥远，其知弥少。是以圣人不行而知，不见而明，不为而成。',
    48: '为学日益，为道日损。损之又损，以至于无为。无为而无不为。取天下常以无事，及其有事，不足以取天下。',
    49: '圣人常无心，以百姓心为心。善者吾善之，不善者吾亦善之，德善。信者吾信之，不信者吾亦信之，德信。',
    50: '出生入死。生之徒十有三，死之徒十有三，人之生，动之死地亦十有三。夫何故？以其生生之厚。',
    51: '道生之，德畜之，物形之，势成之。是以万物莫不尊道而贵德。道之尊，德之贵，夫莫之命而常自然。',
    52: '天下有始，以为天下母。既得其母，以知其子；既知其子，复守其母，没身不殆。塞其兑，闭其门，终身不勤。',
    53: '使我介然有知，行于大道，唯施是畏。大道甚夷，而人好径。朝甚除，田甚芜，仓甚虚；服文彩，带利剑，厌饮食。',
    54: '善建者不拔，善抱者不脱，子孙以祭祀不辍。修之于身，其德乃真；修之于家，其德乃余；修之于乡，其德乃长。',
    55: '含德之厚，比于赤子。毒虫不螫，猛兽不据，攫鸟不搏。骨弱筋柔而握固，未知牝牡之合而朘作，精之至也。',
    56: '知者不言，言者不知。塞其兑，闭其门，挫其锐，解其纷，和其光，同其尘，是谓玄同。',
    57: '以正治国，以奇用兵，以无事取天下。吾何以知其然哉？以此：天下多忌讳，而民弥贫；民多利器，国家滋昏。',
    58: '其政闷闷，其民淳淳；其政察察，其民缺缺。祸兮福之所倚，福兮祸之所伏。孰知其极？其无正也。',
    59: '治人事天莫若啬。夫唯啬，是谓早服。早服谓之重积德，重积德则无不克，无不克则莫知其极。',
    60: '治大国若烹小鲜。以道莅天下，其鬼不神。非其鬼不神，其神不伤人；非其神不伤人，圣人亦不伤人。',
    61: '大国者下流，天下之交，天下之牝。牝常以静胜牡，以静为下。故大国以下小国，则取小国；小国以下大国，则取大国。',
    62: '道者万物之奥，善人之宝，不善人之所保。美言可以市尊，美行可以加人。人之不善，何弃之有？',
    63: '为无为，事无事，味无味。大小多少，报怨以德。图难于其易，为大于其细。天下难事，必作于易；天下大事，必作于细。',
    64: '其安易持，其未兆易谋，其脆易泮，其微易散。为之于未有，治之于未乱。合抱之木，生于毫末；九层之台，起于累土。',
    65: '古之善为道者，非以明民，将以愚之。民之难治，以其智多。故以智治国，国之贼；不以智治国，国之福。',
    66: '江海之所以能为百谷王者，以其善下之，故能为百谷王。是以圣人欲上民，必以言下之；欲先民，必以身后之。',
    67: '天下皆谓我道大，似不肖。夫唯大，故似不肖。若肖，久矣其细也夫！我有三宝，持而保之：一曰慈，二曰俭，三曰不敢为天下先。',
    68: '善为士者不武，善战者不怒，善胜敌者不与，善用人者为之下。是谓不争之德，是谓用人之力，是谓配天古之极。',
    69: '用兵有言：吾不敢为主而为客，不敢进寸而退尺。是谓行无行，攘无臂，扔无敌，执无兵。祸莫大于轻敌，轻敌几丧吾宝。',
    70: '吾言甚易知，甚易行。天下莫能知，莫能行。言有宗，事有君。夫唯无知，是以不我知。知我者希，则我者贵。',
    71: '知不知，上；不知知，病。夫唯病病，是以不病。圣人不病，以其病病，是以不病。',
    72: '民不畏威，则大威至。无狎其所居，无厌其所生。夫唯不厌，是以不厌。是以圣人自知不自见，自爱不自贵。',
    73: '勇于敢则杀，勇于不敢则活。此两者或利或害。天之所恶，孰知其故？天之道，不争而善胜，不言而善应。',
    74: '民不畏死，奈何以死惧之？若使民常畏死，而为奇者，吾得执而杀之，孰敢？常有司杀者杀，夫代司杀者杀，是谓代大匠斲。',
    75: '民之饥，以其上食税之多，是以饥。民之难治，以其上之有为，是以难治。民之轻死，以其求生之厚，是以轻死。',
    76: '人之生也柔弱，其死也坚强。草木之生也柔脆，其死也枯槁。故坚强者死之徒，柔弱者生之徒。',
    77: '天之道，其犹张弓与？高者抑之，下者举之；有余者损之，不足者补之。天之道，损有余而补不足。人之道则不然，损不足以奉有余。',
    78: '天下莫柔弱于水，而攻坚强者莫之能胜，以其无以易之。弱之胜强，柔之胜刚，天下莫不知，莫能行。',
    79: '和大怨，必有余怨，安可以为善？是以圣人执左契，而不责于人。有德司契，无德司彻。天道无亲，常与善人。',
    80: '小国寡民，使有什伯之器而不用，使民重死而不远徙。虽有舟舆，无所乘之；虽有甲兵，无所陈之。使人复结绳而用之。',
    81: '信言不美，美言不信。善者不辩，辩者不善。知者不博，博者不知。圣人不积，既以为人己愈有，既以与人己愈多。'
  };

  // 返回对应章节的解释，如果没有则返回基于主题的解释
  if (explanations[chapter.id]) {
    return explanations[chapter.id];
  }

  // 默认基于主题的解释
  return `本章${chapter.type}阐述${chapter.theme}之理。${chapter.content.substring(0, 30)}... 其核心思想在于顺应自然、返璞归真，体现了老子${chapter.type === '道经' ? '对宇宙本源' : '对修身治国'}的深刻洞察。`;
}

// 章节详情页音频播放控制
function toggleDetailAudioPlayback(chapterId) {
  if (audioState.isPlaying && audioState.currentChapterId === chapterId) {
    pauseChapterAudio();
    updateDetailPlayButton(chapterId, false);
  } else if (audioState.currentChapterId === chapterId && audioState.isPaused) {
    pauseChapterAudio(); // 会resume
    updateDetailPlayButton(chapterId, true);
  } else {
    playChapterAudio(chapterId);
  }
}

// 更新详情页播放按钮状态
function updateDetailPlayButton(chapterId, isPlaying) {
  const icon = document.getElementById(`detail-play-icon-${chapterId}`);
  const status = document.getElementById(`detail-audio-status-${chapterId}`);

  if (icon) {
    icon.innerHTML = `<path d="${isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>`;
  }
  if (status) {
    status.textContent = isPlaying ? '正在朗读...' : (audioState.isPaused ? '已暂停' : '点击播放聆听经典');
  }
}

// 设置详情页播放速度
function setDetailPlaybackSpeed(chapterId, speed) {
  audioState.playbackSpeed = speed;

  // 更新按钮状态
  [0.6, 0.8, 1.0, 1.2].forEach(s => {
    const btn = document.getElementById(`detail-speed-${chapterId}-${s}`);
    if (btn) {
      if (s === speed) {
        btn.classList.add('bg-cinnabar', 'text-white');
        btn.classList.remove('bg-gray-100', 'text-gray-600');
      } else {
        btn.classList.remove('bg-cinnabar', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
      }
    }
  });

  // 如果正在播放，重新播放以应用新速度
  if (audioState.isPlaying && audioState.currentChapterId === chapterId) {
    window.speechSynthesis.cancel();
    setTimeout(() => playChapterAudio(chapterId), 100);
  }
}

// 关闭章节详情
function closeChapterModal() {
  // 已废弃，保留函数以防外部调用
  showPage('chapters');
}

// 格式化内容（添加拼音和楷体样式）
function formatContentWithPinyin(content) {
  const chars = content.split('');
  let result = '';

  chars.forEach(char => {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 汉字添加拼音（间距缩小）
      const py = pinyin(char, { toneType: 'symbol' });
      result += `
        <span style="display: inline-flex; flex-direction: column; align-items: center; margin: 0 1px; vertical-align: bottom; line-height: 1;">
          <span style="font-size: 10px; color: rgba(74,74,74,0.5); height: 14px; display: flex; align-items: flex-end;">${py}</span>
          <span style="font-family: 'Ma Shan Zheng', cursive;">${char}</span>
        </span>
      `;
    } else if (/[，。；：！？]/.test(char)) {
      // 标点符号与汉字底部对齐，红色高亮
      // 使用相同的结构：一个空的拼音位置 + 标点在下方
      result += `<span style="display: inline-flex; flex-direction: column; align-items: center; margin: 0 1px; vertical-align: bottom; line-height: 1;">
        <span style="font-size: 10px; height: 14px;">&nbsp;</span>
        <span style="font-family: 'Ma Shan Zheng', cursive; color: #c93756;">${char}</span>
      </span>`;
    } else {
      // 其他字符直接显示
      result += char;
    }
  });

  return result;
}

// 格式化内容（添加标点高亮）
function formatContent(content) {
  return content
    .replace(/([，。；：！？])/g, '<span class="text-cinnabar">$1</span>')
    .replace(/(道|德|无|有)/g, '<span class="font-semibold">$1</span>');
}

// 墨滴效果
function addInkDropEffect(element) {
  element.addEventListener('click', (e) => {
    if (e.target === element || e.target.classList.contains('bg-ink/60')) {
      const drop = document.createElement('div');
      drop.className = 'ink-drop';
      drop.style.left = `${e.clientX - 10}px`;
      drop.style.top = `${e.clientY - 10}px`;
      document.body.appendChild(drop);
      setTimeout(() => drop.remove(), 2000);
    }
  });
}

// 初始化3D词云
function initWordCloud() {
  const container = document.getElementById('word-cloud-container');
  const canvas = document.getElementById('word-cloud-canvas');

  if (!container || !canvas || !daoData.wordFrequency) return;

  // 清理旧场景
  if (wordCloudRenderer) {
    wordCloudRenderer.dispose();
    wordCloudRenderer = null;
  }

  // 设置Three.js场景
  const width = container.clientWidth;
  const height = container.clientHeight;

  wordCloudScene = new THREE.Scene();
  const scene = wordCloudScene;

  wordCloudCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  const camera = wordCloudCamera;
  camera.position.z = 30;

  wordCloudRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const renderer = wordCloudRenderer;
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
    wordCloudWords.push(sprite);

    scene.add(sprite);
  });

  // 添加连接线
  addConnectingLines(scene, wordCloudWords);

  // 动画循环
  animateWordCloud();

  // 触摸交互
  initWordCloudInteraction(container, canvas);

  // 响应式
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    wordCloudCamera.aspect = newWidth / newHeight;
    wordCloudCamera.updateProjectionMatrix();
    wordCloudRenderer.setSize(newWidth, newHeight);
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
let rotationSpeed = { x: 0.002, y: 0.003 };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function animateWordCloud() {
  if (!wordCloudRenderer || currentPage !== 'wordcloud') return;

  requestAnimationFrame(animateWordCloud);

  // 自动旋转
  if (!isDragging) {
    wordCloudWords.forEach((sprite, index) => {
      sprite.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
      sprite.lookAt(wordCloudCamera.position);
    });
  }

  wordCloudRenderer.render(wordCloudScene, wordCloudCamera);
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

    wordCloudWords.forEach(sprite => {
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

    wordCloudWords.forEach(sprite => {
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
  raycaster.setFromCamera(mouse, wordCloudCamera);

  const intersects = raycaster.intersectObjects(wordCloudWords);

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
function showWordDetail(word) {
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

// 初始化统计数据
function initStats() {
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
  const wordChart = document.getElementById('word-frequency-chart');
  if (!wordChart || !daoData.wordFrequency) return;

  const topWords = daoData.wordFrequency.slice(0, 10);
  const maxCount = Math.max(...topWords.map(w => w.count));

  wordChart.innerHTML = `
    <div class="bar-chart" style="height: 180px;">
      ${topWords.map((word, index) => `
        <div class="flex flex-col items-center flex-1 group cursor-pointer" onclick="showWordDetailByIndex(${index})">
          <div class="bar relative" style="height: ${(word.count / maxCount * 100)}%;">
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-cinnabar opacity-0 group-hover:opacity-100 transition-opacity">${word.count}</div>
          </div>
          <span class="text-xs mt-2 text-ink-light group-hover:text-cinnabar transition-colors">${word.word}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// 主题分布
function initThemeDistribution() {
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
  const lengthChart = document.getElementById('chapter-length-chart');
  if (!lengthChart || !daoData.chapters) return;

  const lengths = daoData.chapters.map(c => ({
    id: c.id,
    len: c.content.length,
    type: c.type
  }));
  const maxLength = Math.max(...lengths.map(l => l.len));

  lengthChart.innerHTML = `
    <div class="flex flex-wrap gap-[1px] justify-center mb-6">
      ${lengths.map((item, idx) => `
        <div class="w-2 rounded-t $${
          item.type === '道经' ? 'bg-ink/60' : 'bg-ink/30'
        } hover:bg-ink cursor-pointer transition-all"
             style="height: ${Math.max(4, item.len / maxLength * 100)}px;"
             title="第${item.id}章: ${item.len}字" onclick="showChapterDetail(${item.id})"></div>
      `).join('')}
    </div>
    <div class="flex justify-center gap-6 text-sm text-ink-light">
      <span class="flex items-center gap-2"><span class="w-3 h-3 bg-ink/60 rounded"></span>道经(1-37)</span>
      <span class="flex items-center gap-2"><span class="w-3 h-3 bg-ink/30 rounded"></span>德经(38-81)</span>
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

// 通过索引显示词汇详情
function showWordDetailByIndex(index) {
  const word = daoData.wordFrequency[index];
  if (word) showWordDetail(word);
}

// 滑动切换页面
function initSwipe() {
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

  // 详情页使用左右滑动导航上一章/下一章
  if (currentPage === 'chapter-detail') {
    return; // 详情页不处理上下滑动
  }

  const pages = ['home', 'chapters', 'wordcloud', 'stats'];
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

// 循环切换播放速度
function cyclePlaybackSpeed(chapterId) {
  const speeds = [0.6, 0.8, 1.0, 1.2];
  const currentIndex = speeds.indexOf(audioState.playbackSpeed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  const newSpeed = speeds[nextIndex];

  // 更新状态
  audioState.playbackSpeed = newSpeed;

  // 更新按钮显示
  const speedBtn = document.getElementById(`detail-speed-btn-${chapterId}`);
  if (speedBtn) {
    speedBtn.textContent = newSpeed + 'x';
  }

  // 如果正在播放，重新播放以应用新速度
  if (audioState.isPlaying && audioState.currentChapterId === chapterId) {
    window.speechSynthesis.cancel();
    setTimeout(() => playChapterAudio(chapterId), 100);
  }
}

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
window.setDetailPlaybackSpeed = setDetailPlaybackSpeed;
window.updateDetailPlayButton = updateDetailPlayButton;
window.getChapterExplanation = getChapterExplanation;
window.hideAudioPlayer = hideAudioPlayer;
window.cyclePlaybackSpeed = cyclePlaybackSpeed;
window.formatContentWithPinyin = formatContentWithPinyin;

// ==================== 音频播放功能 ====================

// 初始化音频播放器UI
function initAudioPlayer() {
  // 创建全局音频播放器
  const playerHTML = `
    <div id="global-audio-player" class="fixed bottom-[72px] left-4 right-4 bg-white rounded-xl shadow-lg z-40 transform translate-y-[150%] transition-transform duration-300">
      <div class="p-3 flex items-center gap-3">
        <!-- 播放/暂停按钮 -->
        <button id="player-play-btn" onclick="toggleAudioPlayback()" class="w-10 h-10 rounded-full bg-cinnabar text-white flex items-center justify-center hover:bg-cinnabar/90 transition-colors">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path id="player-play-icon" d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <!-- 章节信息 -->
        <div class="flex-1 min-w-0">
          <p id="player-chapter-title" class="text-sm font-semibold truncate">未播放</p>
          <p id="player-status" class="text-xs text-ink-light">点击播放开始朗读</p>
        </div>

        <!-- 速度控制 -->
        <button onclick="togglePlaybackSpeed()" id="player-speed-btn" class="px-2 py-1 text-xs bg-paper rounded hover:bg-gray-100 transition-colors">
          0.8x
        </button>

        <!-- 停止按钮 -->
        <button onclick="stopChapterAudio()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>

        <!-- 关闭按钮 -->
        <button onclick="hideAudioPlayer()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 进度条 -->
      <div class="px-3 pb-3">
        <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div id="player-progress" class="h-full bg-cinnabar transition-all duration-300" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', playerHTML);

  // 添加CSS样式
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
function playChapterAudio(chapterId) {
  const chapter = daoData.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  // 如果正在播放其他章节，先停止
  if (audioState.isPlaying && audioState.currentChapterId !== chapterId) {
    stopChapterAudio();
  }

  // 检查浏览器是否支持语音合成
  if (!window.speechSynthesis) {
    alert('您的浏览器不支持语音播放功能');
    return;
  }

  // 创建语音合成对象
  const utterance = new SpeechSynthesisUtterance(chapter.content);
  utterance.lang = 'zh-CN';
  utterance.rate = audioState.playbackSpeed;
  utterance.pitch = 1;

  // 尝试设置中文语音
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
  if (zhVoice) {
    utterance.voice = zhVoice;
  }

  // 事件处理
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
    // 同步更新详情页UI（如果在详情页）
    if (currentPage === 'chapter-detail') {
      updateDetailPlayButton(chapterId, false);
    }
    // 自动播放下一章
    if (chapterId < 81) {
      setTimeout(() => playChapterAudio(chapterId + 1), 1000);
    }
  };

  utterance.onpause = () => {
    audioState.isPaused = true;
    updatePlayButtonIcon(false);
    // 同步更新详情页UI（如果在详情页）
    if (currentPage === 'chapter-detail' && audioState.currentChapterId) {
      updateDetailPlayButton(audioState.currentChapterId, false);
    }
  };

  utterance.onresume = () => {
    audioState.isPaused = false;
    updatePlayButtonIcon(true);
    // 同步更新详情页UI（如果在详情页）
    if (currentPage === 'chapter-detail' && audioState.currentChapterId) {
      updateDetailPlayButton(audioState.currentChapterId, true);
    }
  };

  utterance.onerror = (e) => {
    console.error('语音播放错误:', e);
    audioState.isPlaying = false;
    updateChapterCardState(chapterId, false);
  };

  // 开始播放
  window.speechSynthesis.cancel(); // 清除之前的
  window.speechSynthesis.speak(utterance);
}

// 暂停/继续播放
function pauseChapterAudio() {
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
function stopChapterAudio() {
  window.speechSynthesis.cancel();
  if (audioState.currentChapterId) {
    updateChapterCardState(audioState.currentChapterId, false);
    // 同步更新详情页UI（如果在详情页）
    if (currentPage === 'chapter-detail') {
      updateDetailPlayButton(audioState.currentChapterId, false);
    }
  }
  audioState.isPlaying = false;
  audioState.isPaused = false;
  audioState.currentChapterId = null;
  audioState.speechUtterance = null;
  hideAudioPlayer();
}

// 切换播放/暂停
function toggleAudioPlayback() {
  if (audioState.isPlaying) {
    pauseChapterAudio();
  } else if (audioState.currentChapterId) {
    playChapterAudio(audioState.currentChapterId);
  }
}

// 切换播放速度
function togglePlaybackSpeed() {
  const speeds = [0.6, 0.8, 1.0, 1.2];
  const currentIndex = speeds.indexOf(audioState.playbackSpeed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  audioState.playbackSpeed = speeds[nextIndex];

  // 更新按钮显示
  const speedBtn = document.getElementById('player-speed-btn');
  if (speedBtn) {
    speedBtn.textContent = audioState.playbackSpeed + 'x';
  }

  // 如果正在播放，重新播放以应用新速度
  if (audioState.isPlaying && audioState.currentChapterId) {
    const currentId = audioState.currentChapterId;
    window.speechSynthesis.cancel();
    setTimeout(() => playChapterAudio(currentId), 100);
  }
}

// 显示音频播放器
function showAudioPlayer() {
  const player = document.getElementById('global-audio-player');
  if (player) {
    player.classList.add('show');
  }
}

// 隐藏音频播放器
function hideAudioPlayer() {
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

  // 同步更新详情页UI（如果当前在详情页）
  if (currentPage === 'chapter-detail' && chapter.id) {
    updateDetailPlayButton(chapter.id, audioState.isPlaying && !audioState.isPaused);
  }
}

// 更新播放按钮图标
function updatePlayButtonIcon(isPlaying) {
  const icon = document.getElementById('player-play-icon');
  const statusEl = document.getElementById('player-status');

  if (icon) {
    if (isPlaying) {
      icon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'); // 暂停图标
    } else {
      icon.setAttribute('d', 'M8 5v14l11-7z'); // 播放图标
    }
  }

  if (statusEl) {
    statusEl.textContent = isPlaying ? '正在朗读...' : (audioState.isPaused ? '已暂停' : '点击播放开始朗读');
  }

  // 同步更新详情页播放按钮（如果当前在播放的章节详情页）
  if (audioState.currentChapterId && currentPage === 'chapter-detail') {
    updateDetailPlayButton(audioState.currentChapterId, isPlaying);
  }
}

// 更新章节卡片播放状态
function updateChapterCardState(chapterId, isPlaying) {
  // 更新列表中的播放按钮状态
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
