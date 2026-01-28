<template>
  <div ref="container" class="fireworks-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref(null)
let canvas, ctx, particles = [], animationId

class Particle {
  constructor(x, y, color, velocity) {
    this.x = x
    this.y = y
    this.color = color
    this.velocity = velocity
    this.gravity = 0.1
    this.opacity = 1
    this.decay = Math.random() * 0.02 + 0.005
  }

  update() {
    this.velocity.x *= 0.99
    this.velocity.y *= 0.99
    this.velocity.y += this.gravity
    this.x += this.velocity.x
    this.y += this.velocity.y
    this.opacity -= this.decay
  }

  draw() {
    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.restore()
  }
}

const colors = ['#ff4444', '#ff8844', '#ffdd44', '#44ff44', '#44ffff', '#4444ff', '#ff44ff']

const createFirework = (x, y) => {
  const particleCount = 50
  const color = colors[Math.floor(Math.random() * colors.length)]
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const velocity = {
      x: Math.cos(angle) * (Math.random() * 6 + 2),
      y: Math.sin(angle) * (Math.random() * 6 + 2)
    }
    particles.push(new Particle(x, y, color, velocity))
  }
}

const animate = () => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  particles = particles.filter(particle => {
    particle.update()
    particle.draw()
    return particle.opacity > 0
  })
  
  animationId = requestAnimationFrame(animate)
}

const init = () => {
  canvas.width = container.value.offsetWidth
  canvas.height = container.value.offsetHeight
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    createFirework(x, y)
  })
  
  animate()
  
  setInterval(() => {
    if (Math.random() < 0.1) {
      createFirework(
        Math.random() * canvas.width,
        Math.random() * canvas.height * 0.5 + canvas.height * 0.25
      )
    }
  }, 1000)
}

onMounted(() => {
  canvas = document.createElement('canvas')
  ctx = canvas.getContext('2d')
  container.value.appendChild(canvas)
  init()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.fireworks-container {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  display: block;
  cursor: pointer;
}
</style>