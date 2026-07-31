// Vertical reverse-chronological timeline. Bars are laid out by this script;
// the parallax + highlight coordination is pure CSS scroll-driven animation
// (see style.css). Falls back to IntersectionObserver where scroll-driven
// animations are unsupported.
(function () {
    // one column per career category; jobs within a category never overlap,
    // so each column is a clean stack of bars
    var LANES = ["school", "engineering", "journalism", "vizeng", "play"];
    // with parallax on, the track is this multiple of the sticky window — kept
    // low so most of the 24 years is visible at once and the highlighted bar
    // stays in frame even through the dense 2011-12 stretch
    var TRACK_RATIO = 1.25;
    // room above the "present" edge for the today marker + column labels
    var TOP_PAD = 44;

    // era labels sit horizontally just above the top of the run of bars they
    // describe; date marks that top edge (reverse chron)
    var ERAS = [
        { label: "DATA VIZ\nENGINEERING", lane: "vizeng", date: "present" },
        { label: "VISUAL\nJOURNALISM", lane: "journalism", date: "2018-09" },
        { label: "GRAD SCHOOL", lane: "school", date: "2011-12" },
        { label: "SKI\nBUMMING", lane: "play", date: "2010-05" },
        {
            label: "BIOFUELS\nENGINEERING",
            lane: "engineering",
            date: "2009-07",
        },
        // overhangs the (empty) axis gutter instead of the mascoma bar
        {
            label: "UNDERGRAD",
            lane: "school",
            date: "2007-06",
            minLeft: 2,
            lift: 2,
        },
    ];

    var scrollWrap = document.getElementById("history-scroll");
    var track = document.getElementById("tl-track");
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    if (!scrollWrap || !track || !cards.length) return;

    var sda =
        window.CSS &&
        CSS.supports &&
        CSS.supports("animation-timeline: view()");
    var reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    var parallax = sda && !reducedMotion;
    if (!sda) scrollWrap.classList.add("no-sda");

    var MIN_DATE = parseDate("2002-09");

    function parseDate(str) {
        if (str === "present") return new Date();
        var parts = str.split("-");
        return new Date(+parts[0], +parts[1] - 1, 1);
    }

    function catClass(el) {
        var m = el.className.match(/cat-[a-z]+/);
        return m ? m[0] : "cat-journalism";
    }

    function render() {
        track.innerHTML = "";

        var winH = track.parentElement.clientHeight;
        var trackW = track.clientWidth;
        var maxDate = new Date();
        var span = maxDate - MIN_DATE;
        var trackH = parallax ? winH * TRACK_RATIO : winH;
        track.style.height = trackH + "px";
        track.style.setProperty(
            "--tl-shift",
            -Math.max(trackH - winH, 0) + "px",
        );
        if (parallax) {
            // confine the shift to the pinned phase; scroll(root) would otherwise
            // start it at the top of the page and clip the era labels by the time
            // the timeline is even in view
            var pinTop =
                scrollWrap.getBoundingClientRect().top + window.scrollY;
            var pinLen = Math.max(scrollWrap.clientHeight - winH, 1);
            track.style.animationRange =
                Math.round(pinTop) + "px " + Math.round(pinTop + pinLen) + "px";
        }

        var y = function (d) {
            return TOP_PAD + ((maxDate - d) / span) * (trackH - TOP_PAD);
        };

        var axisW = 34;
        var laneStep = (trackW - axisW) / LANES.length;
        var barW = Math.min(12, Math.max(6, laneStep * 0.35));
        var laneX = function (lane) {
            // bars sit centered within their lane channel
            return (
                axisW + LANES.indexOf(lane) * laneStep + (laneStep - barW) / 2
            );
        };

        // lane group headers — centered within their divider-bounded band,
        // with the group dividers running up through the header strip
        var heads = document.querySelector(".tl-lane-heads");
        if (heads) {
            var pos = function (el, x) {
                if (el) el.style.left = x + "px";
            };
            pos(heads.querySelector(".lh-school"), axisW + laneStep * 0.5);
            pos(heads.querySelector(".lh-work"), axisW + laneStep * 2.5);
            pos(heads.querySelector(".lh-play"), axisW + laneStep * 4.5);
            heads.querySelectorAll(".tl-lane-div").forEach(function (el) {
                el.remove();
            });
            [1, 4].forEach(function (idx) {
                var div = document.createElement("div");
                div.className = "tl-lane-div";
                div.style.left = axisW + idx * laneStep + "px";
                div.style.top = "0";
                heads.appendChild(div);
            });
        }

        // year ticks — every year, full label
        for (var yr = 2003; yr <= maxDate.getFullYear(); yr++) {
            var ty = y(new Date(yr, 0, 1));
            var tick = document.createElement("div");
            tick.className = "tl-tick";
            tick.style.top = ty + "px";
            track.appendChild(tick);
            var lab = document.createElement("div");
            lab.className = "tl-year";
            lab.textContent = yr;
            lab.style.top = ty + "px";
            track.appendChild(lab);
        }

        // dividers between the lane groups (school | work | play); they run
        // the full track so they meet their stubs in the header strip
        [1, 4].forEach(function (idx) {
            var div = document.createElement("div");
            div.className = "tl-lane-div";
            div.style.left = axisW + idx * laneStep + "px";
            div.style.top = "0";
            track.appendChild(div);
        });

        // today marker — the word TODAY sits directly beneath the arrow's
        // tail; a small arc curves up into the top of the current bar
        var tdy = document.createElement("div");
        tdy.className = "tl-today";
        tdy.textContent = "TODAY";
        track.appendChild(tdy);
        var barX = laneX("vizeng");
        var tipX = barX - 4; // arrow tip: top-left corner of the bar
        var tipY = TOP_PAD + 2;
        var sx = barX - 32; // arrow tail; the label hangs centered below it
        var sy = TOP_PAD + 34;
        tdy.style.left = sx - tdy.offsetWidth / 2 + "px";
        tdy.style.top = sy + 5 + "px";
        var pad = 12;
        var aw = tipX - sx + pad * 2;
        var ah = sy - tipY + pad * 2;
        var svgNS = "http://www.w3.org/2000/svg";
        var arrow = document.createElementNS(svgNS, "svg");
        arrow.setAttribute("class", "tl-today-arrow");
        arrow.setAttribute("width", aw);
        arrow.setAttribute("height", ah);
        arrow.style.left = sx - pad + "px";
        arrow.style.top = tipY - pad + "px";
        // local coords: tail lower-left, tip upper-right; a restrained arc
        // rising from the label into the bar top
        var lsx = pad;
        var lsy = sy - tipY + pad;
        var lex = tipX - sx + pad;
        var ley = pad;
        var c1x = lsx - 3;
        var c1y = lsy - (lsy - ley) * 0.55;
        var c2x = lsx + (lex - lsx) * 0.45;
        var c2y = ley + 2;
        // arrowhead wings, angled off the end tangent (c2 → tip)
        var dx = lex - c2x;
        var dy = ley - c2y;
        var dl = Math.sqrt(dx * dx + dy * dy);
        dx /= dl;
        dy /= dl;
        var wing = function (sign) {
            var cos = Math.cos(0.45),
                sin = Math.sin(0.45) * sign;
            var wx = dx * cos - dy * sin;
            var wy = dx * sin + dy * cos;
            return (lex - wx * 6).toFixed(1) + " " + (ley - wy * 6).toFixed(1);
        };
        var path = document.createElementNS(svgNS, "path");
        path.setAttribute(
            "d",
            "M " +
                lsx +
                " " +
                lsy +
                " C " +
                c1x +
                " " +
                c1y +
                ", " +
                c2x +
                " " +
                c2y +
                ", " +
                lex +
                " " +
                ley +
                " M " +
                wing(1) +
                " L " +
                lex +
                " " +
                ley +
                " L " +
                wing(-1),
        );
        arrow.appendChild(path);
        track.appendChild(arrow);

        // era labels — horizontal, centered above their column of bars
        ERAS.forEach(function (era) {
            var el = document.createElement("div");
            el.className = "tl-era";
            el.textContent = era.label;
            track.appendChild(el);
            var cx = laneX(era.lane) + barW / 2;
            var minLeft = era.minLeft != null ? era.minLeft : axisW + 2;
            var left = Math.max(cx - el.offsetWidth / 2, minLeft);
            left = Math.min(left, trackW - el.offsetWidth);
            el.style.left = left + "px";
            // present-edge label rides just above the current bar, leaving
            // clear air below the lane-head rule; others hug their bar
            var lift =
                era.lift != null ? era.lift : era.date === "present" ? 6 : 5;
            el.style.top =
                y(parseDate(era.date)) - el.offsetHeight - lift + "px";
        });

        // bars — one per card, sharing the card's view timeline
        cards.forEach(function (card, i) {
            var beg = parseDate(card.getAttribute("data-beg"));
            var end = parseDate(card.getAttribute("data-end"));
            var bar = document.createElement("div");
            bar.className = "tl-bar " + catClass(card);
            bar.style.left = laneX(card.getAttribute("data-lane")) + "px";
            bar.style.width = barW + "px";
            bar.style.top = y(end) + "px";
            bar.style.height = Math.max(y(beg) - y(end) - 2, 4) + "px";
            bar.style.setProperty("animation-timeline", "--c" + (i + 1));
            bar.addEventListener("click", function () {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            bar._card = card;
            track.appendChild(bar);
        });
    }

    render();

    // highlight fallback without scroll-driven animations
    if (!sda && !reducedMotion && "IntersectionObserver" in window) {
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    var i = cards.indexOf(entry.target);
                    var bars = track.querySelectorAll(".tl-bar");
                    entry.target.classList.toggle(
                        "active",
                        entry.isIntersecting,
                    );
                    if (bars[i])
                        bars[i].classList.toggle(
                            "active",
                            entry.isIntersecting,
                        );
                });
            },
            { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
        );
        cards.forEach(function (c) {
            io.observe(c);
        });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 150);
    });
})();
