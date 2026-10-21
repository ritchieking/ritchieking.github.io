/* graphics/ — lays the rescued graphics out as a loose, overlapping pile of
   cards, with lazy-loaded thumbnails and a lightbox for the full-size image. */
(function () {
    "use strict";

    const pile = document.getElementById("pile");
    const countLine = document.getElementById("count-line");
    const lb = document.getElementById("lightbox");
    const lbImg = document.getElementById("lb-img");
    const lbTitle = document.getElementById("lb-title");
    const lbMeta = document.getElementById("lb-meta");
    const lbArchive = document.getElementById("lb-archive");

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    let items = []; // everything in data.json
    let cards = []; // DOM nodes, parallel to items
    let order = []; // indices into items, in pile order (shuffled)
    let visible = []; // indices currently shown, in pile order
    let filter = { outlet: "", kind: "" };
    let seed = (Math.random() * 2 ** 32) >>> 0;
    let current = -1; // index into `visible` for the lightbox

    // ---- seeded randomness so a layout is stable until you shuffle ----
    function rng(s) {
        return function () {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffledOrder() {
        const r = rng(seed);
        const idx = items.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return idx;
    }

    // ---- build the cards once ----
    function fmtDate(iso) {
        if (!iso) return "";
        const d = new Date(iso + "T12:00:00Z");
        return d.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        });
    }

    function buildCards() {
        const frag = document.createDocumentFragment();
        cards = items.map((it, i) => {
            const a = document.createElement("a");
            a.className = "card";
            a.href = it.wayback;
            a.target = "_blank";
            a.rel = "noopener";
            a.dataset.i = i;
            a.setAttribute(
                "aria-label",
                `${it.title} (${it.outlet}, ${fmtDate(it.date)})`,
            );
            const img = document.createElement("img");
            img.src = it.thumb;
            img.width = it.tw;
            img.height = it.th;
            img.loading = "lazy";
            img.decoding = "async";
            img.alt = "";
            const label = document.createElement("span");
            label.className = "card-label";
            label.innerHTML = `<b>${it.outlet} · ${fmtDate(it.date)}</b>${escapeHtml(it.title)}`;
            a.append(img, label);
            a.addEventListener("click", (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let new-tab clicks through
                e.preventDefault();
                openLightbox(visible.indexOf(i));
            });
            frag.append(a);
            return a;
        });
        pile.append(frag);
    }

    function escapeHtml(s) {
        return s.replace(
            /[&<>"]/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
        );
    }

    // ---- the pile layout ----
    // Columns of roughly equal width; every card drops into the shortest
    // column, nudged sideways, tilted a little, and pulled up so it overlaps
    // the card above. Hero graphics get a wider card so they poke out past
    // their neighbours.
    function layout() {
        const W = pile.clientWidth;
        if (!W) return;
        const r = rng(seed ^ 0x9e3779b9);
        const cols = Math.max(2, Math.min(5, Math.floor(W / 250)));
        const colW = W / cols;
        const narrow = W < 560;
        const heights = new Array(cols).fill(0);
        const maxTilt = narrow ? 2.5 : 4;

        visible.forEach((i, k) => {
            const it = items[i];
            const card = cards[i];
            const sizeMul =
                it.hero === 2 ? (narrow ? 1.0 : 1.12) : it.hero === 1 ? 0.93 : 0.82;
            const jitterMul = 0.95 + r() * 0.1;
            const cw = Math.min(colW * sizeMul * jitterMul, W);
            const ch = cw * (it.th / it.tw);

            // shortest column, with a little randomness among near-ties
            let col = 0;
            for (let c = 1; c < cols; c++) {
                if (heights[c] < heights[col] - 10) col = c;
                else if (Math.abs(heights[c] - heights[col]) <= 10 && r() < 0.5)
                    col = c;
            }
            let x = col * colW + (colW - cw) / 2 + (r() - 0.5) * colW * 0.14;
            x = Math.max(-cw * 0.04, Math.min(W - cw * 0.96, x));
            // mostly a small gap, sometimes a slight overlap: a loose pile, not a heap
            const overlap = Math.min(ch * 0.08, 28) * (r() * 1.4 - 0.4);
            const y = Math.max(0, heights[col] + 14 - overlap);
            const rot = (r() * 2 - 1) * maxTilt * (it.hero === 2 ? 0.7 : 1);

            card.style.left = x.toFixed(1) + "px";
            card.style.top = y.toFixed(1) + "px";
            card.style.width = cw.toFixed(1) + "px";
            card.style.setProperty("--rot", rot.toFixed(2) + "deg");
            card.style.zIndex = 10 + k;
            heights[col] = y + ch;
        });
        pile.style.height = Math.ceil(Math.max(...heights) + 40) + "px";
    }

    function applyFilter(animate) {
        visible = order.filter((i) => {
            const it = items[i];
            return (
                (!filter.outlet || it.outlet === filter.outlet) &&
                (!filter.kind || it.kind === filter.kind)
            );
        });
        const shown = new Set(visible);
        cards.forEach((c, i) => {
            const on = shown.has(i);
            c.classList.toggle("is-hidden", !on);
            c.tabIndex = on ? 0 : -1;
            c.setAttribute("aria-hidden", on ? "false" : "true");
        });
        layout();
        if (animate && !reduceMotion) {
            // a quick stagger-in so the pile feels dealt out, not dumped
            visible.forEach((i, k) => {
                const c = cards[i];
                c.classList.add("is-new");
                setTimeout(() => c.classList.remove("is-new"), 20 + Math.min(k, 40) * 14);
            });
        }
        countLine.textContent = `${visible.length} graphic${visible.length === 1 ? "" : "s"}`;
    }

    // ---- lightbox ----
    function openLightbox(k) {
        if (k < 0) return;
        current = k;
        show(k);
        if (!lb.open) {
            if (typeof lb.showModal === "function") lb.showModal();
            else lb.setAttribute("open", "");
        }
    }
    function show(k) {
        const it = items[visible[k]];
        // deep link: graphics/#g<id>
        history.replaceState(null, "", "#g" + it.id);
        lbImg.src = it.full;
        lbImg.width = it.w;
        lbImg.height = it.h;
        lbImg.alt = it.title;
        lbTitle.textContent = it.title;
        lbTitle.href = it.wayback;
        lbMeta.textContent = `${it.outlet} · ${fmtDate(it.date)} · ${it.kind}`;
        lbArchive.href = it.wayback;
        // warm the neighbours
        [k + 1, k - 1].forEach((n) => {
            if (visible[n] !== undefined) new Image().src = items[visible[n]].full;
        });
    }
    function step(d) {
        if (current < 0 || !visible.length) return;
        current = (current + d + visible.length) % visible.length;
        show(current);
    }
    document.getElementById("lb-prev").addEventListener("click", () => step(-1));
    document.getElementById("lb-next").addEventListener("click", () => step(1));
    document.getElementById("lb-close").addEventListener("click", () => lb.close());
    lb.addEventListener("click", (e) => {
        if (e.target === lb) lb.close(); // click on the backdrop
    });
    lb.addEventListener("close", () => {
        const c = cards[visible[current]];
        if (c) c.focus({ preventScroll: false });
        lbImg.removeAttribute("src");
        history.replaceState(null, "", location.pathname + location.search);
    });
    document.addEventListener("keydown", (e) => {
        if (!lb.open) return;
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
    });

    // ---- controls ----
    function wireChips(groupId, key) {
        const group = document.getElementById(groupId);
        group.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;
            filter[key] = chip.dataset[key];
            group.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === chip));
            applyFilter(true);
        });
    }
    wireChips("outlet-chips", "outlet");
    wireChips("kind-chips", "kind");
    document.getElementById("shuffle").addEventListener("click", () => {
        seed = (Math.random() * 2 ** 32) >>> 0;
        order = shuffledOrder();
        applyFilter(true);
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 120);
    });

    // ---- go ----
    fetch("data.json")
        .then((r) => r.json())
        .then((data) => {
            items = data;
            order = shuffledOrder();
            buildCards();
            applyFilter(true);
            const m = /^#g(\d+)$/.exec(location.hash);
            if (m) {
                const i = items.findIndex((it) => it.id === Number(m[1]));
                if (i >= 0) openLightbox(visible.indexOf(i));
            }
        })
        .catch((err) => {
            pile.innerHTML = `<p class="group-note">Couldn’t load the graphics list (${escapeHtml(String(err))}).</p>`;
        });
})();
