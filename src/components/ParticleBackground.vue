<template>
  <canvas ref="particleCanvas" class="particle-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const particleCanvas = ref<HTMLCanvasElement | null>(null)
const particleConfig = {
  desktopCount: 80,
  mobileCount: 40,
  baseSpeed: 0.5,
  gravityRange: 120,
  gravityStrength: 0.02,
  linkDistance: 120,
  minSize: 1,
  maxSize: 3,
  velocityDecay: 0.99
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

let particles: Particle[] = []
let mousePos = { x: -1000, y: -1000 }
let particleAnimationId: number | null = null

const initParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const isMobile = window.innerWidth < 768
  const count = isMobile ? particleConfig.mobileCount : particleConfig.desktopCount
  particles = []

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * particleConfig.baseSpeed,
      vy: (Math.random() - 0.5) * particleConfig.baseSpeed,
      size: Math.random() * (particleConfig.maxSize - particleConfig.minSize) + particleConfig.minSize
    })
  }
}

const animateParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = window.innerWidth
  const height = window.innerHeight
  ctx.clearRect(0, 0, width, height)

  const particleColor = 'rgba(59, 130, 246, 0.5)'
  const lineColor = 'rgba(59, 130, 246, 0.12)'

  particles.forEach(p => {
    const dx = mousePos.x - p.x
    const dy = mousePos.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < particleConfig.gravityRange) {
      const force = (particleConfig.gravityRange - dist) / particleConfig.gravityRange * particleConfig.gravityStrength
      p.vx += dx / dist * force
      p.vy += dy / dist * force
    }

    p.x += p.vx
    p.y += p.vy

    if (p.x < 0 || p.x > width) p.vx *= -1
    if (p.y < 0 || p.y > height) p.vy *= -1

    p.vx *= particleConfig.velocityDecay
    p.vy *= particleConfig.velocityDecay

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = particleColor
    ctx.fill()
  })

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < particleConfig.linkDistance) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  particleAnimationId = requestAnimationFrame(animateParticles)
}

const handleMouseMove = (e: MouseEvent) => {
  mousePos.x = e.clientX
  mousePos.y = e.clientY
}

const handleResize = () => {
  initParticles()
}

onMounted(() => {
  initParticles()
  animateParticles()
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId)
  }
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
