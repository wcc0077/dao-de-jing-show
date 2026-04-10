// 数据模块 - 负责数据加载和管理

export let daoData = null;

// 加载数据
export async function loadData() {
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

// 获取数据
export function getData() {
  return daoData;
}
