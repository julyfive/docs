<template>
  <canvas ref="canvasRef" class="particle-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let ctx, animationFrame, particles = []

const initParticles = () => {
  const count = 60 // 粒子数量
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
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.fillStyle = 'rgba(150, 150, 150, 0.5)'

  particles.forEach((p, i) => {
    p.x += p.vx
    p.y += p.vy

    // 边界检测
    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()

    // 连线逻辑
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
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  initParticles()
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  handleResize()
  window.addEventListener('resize', handleResize)
  draw()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* 确保在所有内容下面 */
  pointer-events: none;
}
</style>