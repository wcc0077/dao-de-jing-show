// 导入 Tailwind CSS
import './css/style.css'

// 导入 Three.js
import * as THREE from 'three'

// 导入应用代码
import './js/app.js'

// 将 THREE 暴露到全局，供 app.js 使用
window.THREE = THREE

console.log('🎋 道德经可视化应用已启动')
