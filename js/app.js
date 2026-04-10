/**
 * أثر — Main Application Logic
 * Floating deed orbs in space — hover to see name, click to reveal
 */

(function () {
    'use strict';

    // --- Arabic numeral conversion ---
    const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    function toArabicNumeral(num) {
        return num.toString().split('').map(d => ARABIC_NUMERALS[parseInt(d)]).join('');
    }

    // --- Shuffle helper ---
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // --- Constants ---
    const VISIBLE_ORBS = 18;          // How many orbs float at once
    const MARGIN = 60;                // Keep orbs away from edges

    // --- State ---
    let currentScene = 'landing';
    let deedsPool = [];               // Remaining deeds not yet shown
    let revealedCount = 0;
    let isCardOpen = false;
    let particleSystem = null;
    let activeOrbs = [];              // Currently visible orb DOM elements
    let currentClickedOrb = null;     // Track which orb was clicked
    let animFrameId = null;           // requestAnimationFrame ID for star movement

    // --- DOM Refs ---
    const $landing = document.getElementById('landing');
    const $experience = document.getElementById('experience');
    const $deedCard = document.getElementById('deedCard');
    const $cardClose = document.getElementById('cardClose');
    const $deedCount = document.getElementById('deedCount');
    const $touchHint = document.getElementById('touchHint');
    const $completionOverlay = document.getElementById('completionOverlay');
    const $resetBtn = document.getElementById('resetBtn');

    const $deedCategory = document.getElementById('deedCategory');
    const $deedTitle = document.getElementById('deedTitle');
    const $deedDescription = document.getElementById('deedDescription');
    const $deedVerse = document.getElementById('deedVerse');
    const $deedSource = document.getElementById('deedSource');
    const $deedThawab = document.getElementById('deedThawab');

    // --- Init ---
    function init() {
        particleSystem = new ParticleSystem('cosmos');
        particleSystem.init();
        deedsPool = shuffle(DEEDS);

        bindEvents();
    }

    // --- Event Bindings ---
    function bindEvents() {
        $landing.addEventListener('click', handleLandingClick);
        $landing.addEventListener('touchend', handleLandingClick);

        $cardClose.addEventListener('click', handleCardClose);
        $deedCard.addEventListener('click', function (e) {
            if (e.target === $deedCard) handleCardClose();
        });

        $resetBtn.addEventListener('click', handleReset);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isCardOpen) handleCardClose();
        });
    }

    // --- Scene Transitions ---
    function transitionTo(sceneName) {
        if (currentScene === 'landing') {
            $landing.classList.remove('active');
        }
        currentScene = sceneName;
        if (sceneName === 'experience') {
            setTimeout(() => {
                $experience.classList.add('active');
                spawnInitialOrbs();
            }, 400);
        }
    }

    // --- Orb Movement System ---
    // Stars travel across the screen from one edge to the opposite

    function getEdgeSpawn() {
        // Pick a random edge: 0=top, 1=right, 2=bottom, 3=left
        const w = window.innerWidth;
        const h = window.innerHeight;
        const edge = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        const speed = 0.3 + Math.random() * 0.7; // px per frame

        switch (edge) {
            case 0: // top → travels downward
                x = Math.random() * w;
                y = -20;
                vx = (Math.random() - 0.5) * speed * 0.6;
                vy = speed;
                break;
            case 1: // right → travels left
                x = w + 20;
                y = Math.random() * h;
                vx = -speed;
                vy = (Math.random() - 0.5) * speed * 0.6;
                break;
            case 2: // bottom → travels upward
                x = Math.random() * w;
                y = h + 20;
                vx = (Math.random() - 0.5) * speed * 0.6;
                vy = -speed;
                break;
            case 3: // left → travels right
                x = -20;
                y = Math.random() * h;
                vx = speed;
                vy = (Math.random() - 0.5) * speed * 0.6;
                break;
        }
        return { x, y, vx, vy };
    }

    function getInitialPosition() {
        // For initial batch, spawn inside the screen
        return {
            x: 50 + Math.random() * (window.innerWidth - 100),
            y: 80 + Math.random() * (window.innerHeight - 160),
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8
        };
    }

    function isOffScreen(x, y) {
        return x < -60 || x > window.innerWidth + 60 ||
               y < -60 || y > window.innerHeight + 60;
    }

    function createOrbElement(deed, fromEdge) {
        const motion = fromEdge ? getEdgeSpawn() : getInitialPosition();

        const orb = document.createElement('div');
        orb.className = 'deed-orb' + (fromEdge ? '' : ' entering');
        orb.style.left = motion.x + 'px';
        orb.style.top = motion.y + 'px';
        orb.style.setProperty('--twinkle-delay', (Math.random() * 3).toFixed(2));
        orb.dataset.deedTitle = deed.title;

        // Store motion data
        orb._motion = { x: motion.x, y: motion.y, vx: motion.vx, vy: motion.vy };
        orb._deed = deed;
        orb._hovered = false;

        // Star point (sky-like)
        const core = document.createElement('div');
        core.className = 'orb-core';
        const sizes = [3, 4, 5, 6, 7];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        core.style.width = size + 'px';
        core.style.height = size + 'px';
        orb.appendChild(core);

        // Trail history (positions stored for canvas drawing)
        orb._trail = [];
        orb._trailLength = 25 + Math.floor(Math.random() * 20); // 25-45 points

        // Glow
        const glow = document.createElement('div');
        glow.className = 'orb-glow';
        orb.appendChild(glow);

        // Label (visible on hover)
        const label = document.createElement('div');
        label.className = 'orb-label';
        label.textContent = deed.title;
        orb.appendChild(label);

        // Hover tracking (slow down on hover)
        orb.addEventListener('mouseenter', () => { orb._hovered = true; });
        orb.addEventListener('mouseleave', () => { orb._hovered = false; });

        // Click handler
        orb.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isCardOpen) return;
            handleOrbClick(orb, deed);
        });

        // Remove entering class after animation
        if (!fromEdge) {
            orb.addEventListener('animationend', function handler(e) {
                if (e.animationName === 'orbEnter') {
                    orb.classList.remove('entering');
                    orb.removeEventListener('animationend', handler);
                }
            });
        }

        return orb;
    }

    // --- Trail Canvas ---
    let trailCanvas = null;
    let trailCtx = null;

    function initTrailCanvas() {
        trailCanvas = document.getElementById('trails');
        trailCtx = trailCanvas.getContext('2d');
        resizeTrailCanvas();
        window.addEventListener('resize', resizeTrailCanvas);
    }

    function resizeTrailCanvas() {
        if (!trailCanvas) return;
        trailCanvas.width = window.innerWidth;
        trailCanvas.height = window.innerHeight;
    }

    function drawTrails() {
        if (!trailCtx) return;
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

        for (const orb of activeOrbs) {
            const trail = orb._trail;
            if (!trail || trail.length < 2) continue;

            trailCtx.lineCap = 'round';
            trailCtx.lineJoin = 'round';

            for (let i = 1; i < trail.length; i++) {
                const progress = i / trail.length;
                const alpha = progress * 0.45;
                const width = progress * 2.5;

                trailCtx.beginPath();
                trailCtx.moveTo(trail[i - 1].x, trail[i - 1].y);
                trailCtx.lineTo(trail[i].x, trail[i].y);
                trailCtx.strokeStyle = `rgba(212, 168, 83, ${alpha})`;
                trailCtx.lineWidth = width;
                trailCtx.stroke();
            }
        }
    }

    function getOrbCenter(orb) {
        // Get the actual visual center of the star core
        const core = orb.querySelector('.orb-core');
        if (core) {
            const rect = core.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        // Fallback
        const m = orb._motion;
        return { x: m.x, y: m.y };
    }

    function updateOrbPositions() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = activeOrbs.length - 1; i >= 0; i--) {
            const orb = activeOrbs[i];
            const m = orb._motion;
            if (!m) continue;

            // Slow down when hovered
            const speedMult = orb._hovered ? 0.1 : 1;

            m.x += m.vx * speedMult;
            m.y += m.vy * speedMult;

            orb.style.left = m.x + 'px';
            orb.style.top = m.y + 'px';

            // Record actual visual center for trail (not CSS left/top)
            const center = getOrbCenter(orb);
            orb._trail.push({ x: center.x, y: center.y });
            if (orb._trail.length > orb._trailLength) {
                orb._trail.shift();
            }

            // Check if off screen
            if (isOffScreen(m.x, m.y)) {
                orb.remove();
                activeOrbs.splice(i, 1);

                // Spawn replacement from edge
                if (deedsPool.length > 0) {
                    spawnOrb(0, true);
                } else if (activeOrbs.length === 0) {
                    // All done
                    setTimeout(showCompletion, 500);
                }
            }
        }

        // Draw trails on canvas
        drawTrails();

        if (currentScene === 'experience') {
            animFrameId = requestAnimationFrame(updateOrbPositions);
        }
    }

    function spawnInitialOrbs() {
        initTrailCanvas();
        const count = Math.min(VISIBLE_ORBS, deedsPool.length);
        for (let i = 0; i < count; i++) {
            spawnOrb(i * 120, false); // initial = spawn inside
        }
        // Start movement loop
        animFrameId = requestAnimationFrame(updateOrbPositions);
    }

    function spawnOrb(delay, fromEdge) {
        if (deedsPool.length === 0) return;
        const deed = deedsPool.pop();
        const orb = createOrbElement(deed, fromEdge);

        setTimeout(() => {
            $experience.appendChild(orb);
            activeOrbs.push(orb);
        }, delay || 0);
    }

    function removeOrb(orb) {
        // Star ascends upward gracefully
        orb.classList.add('ascending');
        orb._ascending = true; // stop trail recording
        const idx = activeOrbs.indexOf(orb);
        if (idx > -1) activeOrbs.splice(idx, 1);

        setTimeout(() => orb.remove(), 1200);
    }

    // --- Handlers ---
    function handleLandingClick(e) {
        e.preventDefault();
        if (currentScene !== 'landing') return;
        const x = e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || window.innerWidth / 2;
        const y = e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || window.innerHeight / 2;
        particleSystem.addRipple(x, y);
        createDOMRipple(x, y);
        transitionTo('experience');
    }

    function handleOrbClick(orb, deed) {
        isCardOpen = true;
        currentClickedOrb = orb;

        // Explosion at star position
        const rect = orb.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        particleSystem.addRipple(cx, cy);
        createDOMRipple(cx, cy);

        revealedCount++;

        // Populate card
        $deedCategory.textContent = deed.category;
        $deedTitle.textContent = deed.title;
        $deedDescription.textContent = deed.description;
        $deedVerse.textContent = deed.verse;
        $deedSource.textContent = deed.source;
        $deedThawab.textContent = deed.thawab;

        retriggerCardAnimations();

        // Show card after brief delay for ripple
        setTimeout(() => {
            $deedCard.classList.remove('hidden');
        }, 300);

        // Update counter
        $deedCount.textContent = toArabicNumeral(revealedCount);
        $deedCount.classList.add('bump');
        setTimeout(() => $deedCount.classList.remove('bump'), 400);

        // Light progression
        particleSystem.addLightLevel(1 / DEEDS.length);
        updateBackgroundLight();
    }

    function handleCardClose() {
        if (!isCardOpen) return;
        isCardOpen = false;
        $deedCard.classList.add('hidden');

        // Remove clicked orb and spawn replacement
        if (currentClickedOrb) {
            removeOrb(currentClickedOrb);
            currentClickedOrb = null;

            // Spawn a new orb after a short delay (from edge)
            if (deedsPool.length > 0) {
                setTimeout(() => spawnOrb(0, true), 600);
            }
        }

        // Check completion: no pool left AND no active orbs
        const totalRemaining = deedsPool.length + activeOrbs.length;
        if (totalRemaining === 0) {
            setTimeout(showCompletion, 800);
        } else {
            $touchHint.textContent = 'اكتشف المزيد من الأنوار...';
        }
    }

    function handleReset() {
        // Cancel movement loop
        if (animFrameId) cancelAnimationFrame(animFrameId);

        // Remove all existing orbs
        activeOrbs.forEach(orb => orb.remove());
        activeOrbs = [];

        deedsPool = shuffle(DEEDS);
        revealedCount = 0;
        isCardOpen = false;
        currentClickedOrb = null;

        $deedCount.textContent = toArabicNumeral(0);
        $deedCard.classList.add('hidden');
        $completionOverlay.classList.add('hidden');
        $touchHint.textContent = 'اختر نجمة لتكشف نورًا...';

        particleSystem.reset();
        document.body.style.backgroundColor = '';

        // Respawn orbs
        setTimeout(spawnInitialOrbs, 500);
    }

    // --- Card animation re-trigger ---
    function retriggerCardAnimations() {
        const animated = $deedCard.querySelectorAll(
            '.deed-category, .deed-title, .deed-description, .divider, .verse, .source, .thawab'
        );
        animated.forEach(el => {
            el.style.animation = 'none';
            void el.offsetHeight;
            el.style.animation = '';
        });
    }

    function updateBackgroundLight() {
        const progress = revealedCount / DEEDS.length;
        const r = Math.round(7 + progress * 15);
        const g = Math.round(11 + progress * 14);
        const b = Math.round(26 + progress * 20);
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    // --- DOM Visual Effects ---
    function createDOMRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        document.body.appendChild(ripple);

        const rippleOuter = document.createElement('div');
        rippleOuter.className = 'click-ripple-outer';
        rippleOuter.style.left = x + 'px';
        rippleOuter.style.top = y + 'px';
        document.body.appendChild(rippleOuter);

        const flash = document.createElement('div');
        flash.className = 'click-flash';
        flash.style.left = x + 'px';
        flash.style.top = y + 'px';
        document.body.appendChild(flash);

        setTimeout(() => {
            ripple.remove();
            rippleOuter.remove();
            flash.remove();
        }, 2000);
    }

    function createGlowEffect(x, y) {
        // Soft expanding glow
        const glow = document.createElement('div');
        glow.className = 'star-select-glow';
        glow.style.left = x + 'px';
        glow.style.top = y + 'px';
        document.body.appendChild(glow);

        // Tiny sparkles that drift upward
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            spark.className = 'star-sparkle';
            spark.style.left = (x + (Math.random() - 0.5) * 20) + 'px';
            spark.style.top = (y + (Math.random() - 0.5) * 20) + 'px';
            spark.style.animationDelay = (Math.random() * 0.3) + 's';
            spark.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
            document.body.appendChild(spark);
            setTimeout(() => spark.remove(), 1500);
        }

        setTimeout(() => glow.remove(), 1200);
    }

    function showCompletion() {
        $completionOverlay.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
