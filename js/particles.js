/**
 * أثر — Particle & Ripple System
 * Canvas-based ambient particles + click burst effects
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.ripples = [];
        this.bursts = [];
        this.lightLevel = 0;
        this.maxParticles = 60;
        this.animationId = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    init() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createAmbient());
        }
        this.animate();
    }

    createAmbient() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            radius: 0.4 + Math.random() * 1.2,
            maxOpacity: 0.08 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.008 + Math.random() * 0.015,
            color: this.getGoldHue()
        };
    }

    getGoldHue() {
        const hues = [
            'rgba(212, 168, 83,',
            'rgba(240, 215, 140,',
            'rgba(255, 248, 220,',
            'rgba(200, 180, 120,',
        ];
        return hues[Math.floor(Math.random() * hues.length)];
    }

    addRipple(x, y) {
        this.ripples.push({ x, y, radius: 0, maxRadius: 200, opacity: 0.6, lineWidth: 2, speed: 3 });
        this.ripples.push({ x, y, radius: 0, maxRadius: 300, opacity: 0.3, lineWidth: 1, speed: 2, delay: 8 });

        const burstCount = 18 + Math.floor(Math.random() * 12);
        for (let i = 0; i < burstCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            this.bursts.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1 + Math.random() * 3,
                life: 1,
                fadeSpeed: 0.01 + Math.random() * 0.015,
                color: this.getGoldHue()
            });
        }
    }

    addLightLevel(amount) {
        this.lightLevel = Math.min(1, this.lightLevel + amount);
        const newCount = Math.floor(amount * 15);
        for (let i = 0; i < newCount; i++) {
            this.particles.push(this.createAmbient());
        }
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.phase += p.twinkleSpeed;
            if (p.x < -10) p.x = this.width + 10;
            if (p.x > this.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.height + 10;
            if (p.y > this.height + 10) p.y = -10;
        }

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            if (r.delay && r.delay > 0) { r.delay--; continue; }
            r.radius += r.speed;
            r.opacity *= 0.985;
            if (r.opacity < 0.01 || r.radius > r.maxRadius) this.ripples.splice(i, 1);
        }

        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const b = this.bursts[i];
            b.x += b.vx; b.y += b.vy;
            b.vx *= 0.97; b.vy *= 0.97;
            b.life -= b.fadeSpeed;
            if (b.life <= 0) this.bursts.splice(i, 1);
        }
    }

    draw() {
        this.ctx.fillStyle = `rgba(7, 11, 26, ${0.15 - this.lightLevel * 0.05})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        for (const p of this.particles) {
            const opacity = p.maxOpacity * (0.5 + 0.5 * Math.sin(p.phase)) * (0.3 + this.lightLevel * 0.7);
            if (opacity <= 0) continue;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `${p.color} ${opacity})`;
            this.ctx.fill();
        }

        for (const r of this.ripples) {
            if (r.delay && r.delay > 0) continue;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(212, 168, 83, ${r.opacity})`;
            this.ctx.lineWidth = r.lineWidth;
            this.ctx.stroke();
        }

        for (const b of this.bursts) {
            const s = b.life;
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius * s, 0, Math.PI * 2);
            this.ctx.fillStyle = `${b.color} ${s})`;
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius * s * 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `${b.color} ${s * 0.2})`;
            this.ctx.fill();
        }
    }

    animate() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    reset() {
        this.particles = [];
        this.ripples = [];
        this.bursts = [];
        this.lightLevel = 0;
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createAmbient());
        }
    }
}
