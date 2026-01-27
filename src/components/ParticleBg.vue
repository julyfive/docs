<template>
  <canvas
      v-if="!isMobile"
      ref="canvasRef"
      class="particle-canvas"
  ></canvas>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue'

const canvasRef = ref(null)
const isMobile = ref(false) // 响应式变量记录设备状态
let ctx, animationFrame, particles = []

// 设备检测逻辑
const checkDevice = () => {
  const ua = navigator.userAgent;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;

  // 只要满足其中一个条件，就认定为移动端
  isMobile.value = isMobileUA || (isSmallScreen && isTouchDevice);
};

const initParticles = () => {
  if (isMobile.value) return
  const count = 60
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1
    })
  }
}

const draw = () => {
  if (isMobile.value || !canvasRef.value) return

  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.fillStyle = 'rgba(150, 150, 150, 0.5)'

  particles.forEach((p, i) => {
    p.x += p.vx
    p.y += p.vy

    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()

    for (let j = i + 1; j < particles.length; j++) {
      const p2 = particles[j]
      const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
      if (dist < 120) {
        ctx.strokeStyle = `rgba(150, 150, 150, ${1 - dist / 120})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    }
  })
  animationFrame = requestAnimationFrame(draw)
}

const handleResize = () => {
  checkDevice()
  if (!isMobile.value && canvasRef.value) {
    canvasRef.value.width = window.innerWidth
    canvasRef.value.height = window.innerHeight
    initParticles()
  }
}

onMounted(() => {
  checkDevice() // 同步执行检测

  // 核心死锁：如果是手机，直接退出，不初始化任何 Canvas 环境
  if (isMobile.value) {
    console.log('检测到移动端，粒子背景已禁用');
    return;
  }
  // 只有非手机端才会执行以下初始化
  ctx = canvasRef.value.getContext('2d');
  handleResize();
  window.addEventListener('resize', handleResize);
  draw();
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}
</style>