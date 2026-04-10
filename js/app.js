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
    const FLOAT_ANIMATIONS = 6;       // Number of float path variants
    const MARGIN = 60;                // Keep orbs away from edges

    // --- State ---
    let currentScene = 'landing';
    let deedsPool = [];               // Remaining deeds not yet shown
    let revealedCount = 0;
    let isCardOpen = false;
    let particleSystem = null;
    let activeOrbs = [];              // Currently visible orb DOM elements
    let currentClickedOrb = null;     // Track which orb was clicked

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

    // --- Orb Management ---
    function getRandomPosition() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            x: MARGIN + Math.random() * (w - MARGIN * 2),
            y: MARGIN + 60 + Math.random() * (h - MARGIN * 2 - 80) // avoid counter & hint
        };
    }

    function getFloatAnimation() {
        const idx = 1 + Math.floor(Math.random() * FLOAT_ANIMATIONS);
        const duration = 8 + Math.random() * 8; // 8-16s
        return `floatPath${idx} ${duration}s ease-in-out infinite`;
    }

    function createOrbElement(deed) {
        const pos = getRandomPosition();

        const orb = document.createElement('div');
        orb.className = 'deed-orb entering';
        orb.style.left = pos.x + 'px';
        orb.style.top = pos.y + 'px';
        orb.style.animation = getFloatAnimation();
        orb.style.setProperty('--twinkle-delay', (Math.random() * 3).toFixed(2));
        orb.dataset.deedTitle = deed.title;

        // Star point (sky-like)
        const core = document.createElement('div');
        core.className = 'orb-core';
        // Random size variation like real stars at different distances
        const sizes = [3, 4, 5, 6, 7];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        core.style.width = size + 'px';
        core.style.height = size + 'px';
        orb.appendChild(core);

        // Glow
        const glow = document.createElement('div');
        glow.className = 'orb-glow';
        orb.appendChild(glow);

        // Label (visible on hover)
        const label = document.createElement('div');
        label.className = 'orb-label';
        label.textContent = deed.title;
        orb.appendChild(label);

        // Click handler
        orb.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isCardOpen) return;
            handleOrbClick(orb, deed);
        });

        // Remove entering class after animation
        orb.addEventListener('animationend', function handler(e) {
            if (e.animationName === 'orbEnter') {
                orb.classList.remove('entering');
                orb.removeEventListener('animationend', handler);
            }
        });

        return orb;
    }

    function spawnInitialOrbs() {
        const count = Math.min(VISIBLE_ORBS, deedsPool.length);
        for (let i = 0; i < count; i++) {
            spawnOrb(i * 120); // stagger entrance
        }
    }

    function spawnOrb(delay) {
        if (deedsPool.length === 0) return;
        const deed = deedsPool.pop();
        const orb = createOrbElement(deed);

        setTimeout(() => {
            $experience.appendChild(orb);
            activeOrbs.push(orb);
        }, delay || 0);
    }

    function removeOrb(orb) {
        orb.classList.add('exiting');
        const idx = activeOrbs.indexOf(orb);
        if (idx > -1) activeOrbs.splice(idx, 1);

        orb.addEventListener('animationend', function () {
            orb.remove();
        });
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

        // Ripple at orb position
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

            // Spawn a new orb after a short delay
            if (deedsPool.length > 0) {
                setTimeout(() => spawnOrb(0), 600);
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

    function showCompletion() {
        $completionOverlay.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
