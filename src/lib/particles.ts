const COLORS = ['#ffe680', '#ffaa00', '#ff5a00', '#ff8c00', '#ffffff']

export function spawnPixelParticles(x: number, y: number): void {
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div')
    const vx = ((Math.random() - 0.5) * 80).toFixed(0)
    const vy = (-(Math.random() * 70 + 20)).toFixed(0)
    el.style.cssText = [
      'position:fixed',
      `left:${x}px`, `top:${y}px`,
      'width:6px', 'height:6px',
      `background:${COLORS[i % COLORS.length]}`,
      'image-rendering:pixelated',
      'pointer-events:none',
      'z-index:999',
      'animation:px-particle 0.55s steps(6) forwards',
      `--vx:${vx}px`, `--vy:${vy}px`,
    ].join(';')
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 650)
  }
}
