//代码雨
<template>
  <canvas v-if="!isMobile" ref="canvasRef" class="codeRain-canvas"> </canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { debounce } from '../utils/debounce';
const isMobile = ref(false); // 响应式变量记录设备状态

const canvasRef = ref(null);
let ctx = null;

let timer = null;

let columnCount = 0;
let nextChars = [];
let fontSize = 16;
let observer = null; // 主题监听器
let isDark = false; // 当前是否暗黑模式

// 设备检测逻辑（与 ParticleBg 一致）
const checkDevice = () => {
  const ua = navigator.userAgent;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;

  // 只要满足其中一个条件，就认定为移动端
  isMobile.value = isMobileUA || (isSmallScreen && isTouchDevice);
};

// VitePress 切换主题时会修改 <html> 的 class（暗黑模式加 dark）
function getIsDark() {
  return document.documentElement.classList.contains('dark');
}

// 根据主题返回背景色（半透明，供 draw 每帧叠加形成拖尾）
function getBgColor() {
  return isDark ? 'rgba(0, 0, 0, 0.5)' : '#f6f6f760';
}

// 根据当前窗口尺寸重新计算画布和列参数（挂载时和窗口变化时都会调用）
function resizeCanvas() {
  const canvas = canvasRef.value;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  fontSize = 14 * devicePixelRatio;
  const columnWidth = fontSize;
  columnCount = Math.floor(canvas.width / columnWidth);
  nextChars = new Array(columnCount).fill(0);
}

function draw() {
  const canvas = canvasRef.value;
  ctx.fillStyle = getBgColor(); // 按主题取背景色
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < columnCount; i++) {
    const char = getRandomText();
    const color = getRandomColor();
    const x = i * fontSize;
    const index = nextChars[i];
    ctx.textBaseline = 'top';
    const y = index * fontSize * 1.2;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillText(char, x, y);
    if (y > canvas.height && Math.random() > 0.96) {
      nextChars[i] = 0;
    } else {
      nextChars[i]++;
    }
  }
}

// 防抖绘制：停止缩放 300ms 后才重绘代码雨
const onWindowResize = debounce(() => {
  draw(); // 先画一帧
  timer = setInterval(draw, 50); // 恢复主循环
}, 300);

// 防抖重置画布：立即重置画布
const resizeCanvasOnce = debounce(
  () => {
    resizeCanvas();
  },
  300,
  true
);

// 窗口变化：立即重置画布（canvas.width 赋值自动清空旧画面），防抖结束后绘制
function handleResize() {
  checkDevice(); // 每次窗口变化都重新检测设备
  if (isMobile.value) {
    // 进入移动端：暂停动画并取消待执行的防抖
    clearInterval(timer);
    timer = null;
    onWindowResize.cancel();
    return;
  }
  clearInterval(timer);
  timer = null;
  resizeCanvasOnce();
  onWindowResize();
}
onMounted(() => {
  checkDevice(); // 同步执行检测
  // 如果是移动端，直接退出，不初始化任何 Canvas 环境
  if (isMobile.value) {
    return;
  }
  const canvas = canvasRef.value;
  ctx = canvas.getContext('2d');
  isDark = getIsDark();
  resizeCanvas();
  draw();
  timer = setInterval(draw, 50);
  window.addEventListener('resize', handleResize);
  // 监听 <html> 的 class 变化，主题切换时立即刷新画布配色
  observer = new MutationObserver(() => {
    const dark = getIsDark();
    if (dark !== isDark) {
      isDark = dark;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
  clearInterval(timer);
  onWindowResize.cancel(); // 取消尚未执行的防抖任务
  observer?.disconnect(); // 断开主题监听
  window.removeEventListener('resize', handleResize);
});

//获取随机颜色（浅色模式用深色系保证对比度，暗黑模式用亮色系）
function getRandomColor() {
  const fontColors = isDark
    ? ['#33B5E5', '#0099CC', '#AA66CC', '#9933CC', '#669900', '#FFBB33', '#FF8800']
    : ['#1D6FB8', '#0088B3', '#6A4FA3', '#8B3FA8', '#4E8A2F', '#D97706', '#D94A4A'];
  return fontColors[Math.floor(Math.random() * fontColors.length)];
}

//获取随机文字
function getRandomText() {
  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return text[Math.floor(Math.random() * text.length)];
}
</script>

<style scoped>
.codeRain-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}
</style>
