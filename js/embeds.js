/* Live teasers: same-origin iframes of the rescued projects, cropped to the
   interactive component and scaled to fit. Geometry is measured from the
   loaded page itself (no hardcoded pixel offsets), so the crops survive
   tweaks to the archived pages. */
(function () {
  "use strict";

  /* The interactive-project teasers moved to native embeds (js/teasers.js);
     iframes remain only for the two article reading peeks. */
  var CONFIGS = {
    "bitcoin-mining": {
      src: "bitcoin-mining/",
      width: 1100,
      top: ".item-header",
      hbox: [".item-body"], // the article column, not the full app shell
      height: 560, // fixed reading peek, internal px
      interactive: false,
    },
    "dissecting-trumps-most-rabid-online-following": {
      src: "dissecting-trumps-most-rabid-online-following/",
      width: 1100,
      top: ".post-info",
      hbox: [".entry-content"],
      height: 620,
      interactive: false,
    },
  };

  var PAD = 14; // breathing room around the cropped region, internal px
  var MEASURE_DELAYS = [0, 400, 1200, 2500, 5000];
  var previewQuery = window.matchMedia("(max-width: 719px)");

  if (navigator.connection && navigator.connection.saveData) return;

  var embeds = [];

  function initWindow(win) {
    var slug = win.getAttribute("data-embed");
    var cfg = CONFIGS[slug];
    if (!cfg) return;
    var fallback = win.querySelector(".embed-fallback");
    var caption = null;
    var embedBox = win.closest(".feature-embed");
    if (embedBox) caption = embedBox.querySelector(".embed-caption");
    embeds.push({
      win: win,
      cfg: cfg,
      fallback: fallback,
      caption: caption,
      frame: null,
      overlay: null,
      region: null,
      live: false,
      built: false,
    });
  }

  function build(embed) {
    if (embed.built) return;
    embed.built = true;
    var frame = document.createElement("iframe");
    frame.src = embed.cfg.src;
    frame.title = "Live preview of " + embed.cfg.src;
    frame.setAttribute("scrolling", "no");
    frame.style.width = embed.cfg.width + "px";
    frame.style.height = "10px"; // grown after measuring
    frame.addEventListener("load", function () {
      onFrameLoad(embed);
    });
    embed.frame = frame;
    embed.win.appendChild(frame);
  }

  function onFrameLoad(embed) {
    var doc;
    try {
      doc = embed.frame.contentDocument;
    } catch (e) {
      doc = null;
    }
    if (!doc || !doc.body) return giveUp(embed);

    embed.frame.contentWindow.scrollTo(0, 0);

    // Keep clicks on links inside the teaser from navigating the teaser.
    var base = doc.createElement("base");
    base.target = "_top";
    doc.head.appendChild(base);

    // Freeze the page: no internal scrolling, no scrollbars.
    var style = doc.createElement("style");
    style.textContent =
      "html,body{overflow:hidden !important;scrollbar-width:none !important}";
    doc.head.appendChild(style);

    // Wheel over the teaser should scroll the portfolio page, not the frame.
    doc.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var dy =
          e.deltaMode === 1
            ? e.deltaY * 16
            : e.deltaMode === 2
            ? e.deltaY * window.innerHeight
            : e.deltaY;
        window.scrollBy(0, dy);
      },
      { passive: false }
    );

    var attempt = 0;
    var tryMeasure = function () {
      var ok = measure(embed);
      if (ok) {
        apply(embed);
        if (!embed.live) reveal(embed);
      }
      attempt += 1;
      if (attempt < MEASURE_DELAYS.length) {
        setTimeout(tryMeasure, MEASURE_DELAYS[attempt]);
      } else if (!embed.live) {
        giveUp(embed);
      }
    };
    tryMeasure();
  }

  // Bounding rect with a fallback for float-collapsed containers
  // (height 0 but real children), common in these old skeleton-grid pages.
  function rectOf(doc, sel) {
    var el = doc.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.height >= 5) return r;
    var kids = el.children;
    var box = null;
    for (var i = 0; i < kids.length; i++) {
      var kr = kids[i].getBoundingClientRect();
      if (kr.height < 5) continue;
      if (!box) {
        box = { left: kr.left, top: kr.top, right: kr.right, bottom: kr.bottom };
      } else {
        box.left = Math.min(box.left, kr.left);
        box.top = Math.min(box.top, kr.top);
        box.right = Math.max(box.right, kr.right);
        box.bottom = Math.max(box.bottom, kr.bottom);
      }
    }
    return box;
  }

  function measure(embed) {
    var doc = embed.frame.contentDocument;
    if (!doc) return false;
    var cfg = embed.cfg;
    var tr = rectOf(doc, cfg.top);
    if (!tr || tr.bottom - tr.top < 5) return false; // not laid out yet

    var left = tr.left;
    var right = tr.right;
    var bottomEdge;

    if (cfg.bottom) {
      bottomEdge = -Infinity;
      for (var i = 0; i < cfg.bottom.length; i++) {
        var br = rectOf(doc, cfg.bottom[i]);
        if (!br) return false;
        bottomEdge = Math.max(bottomEdge, br.bottom);
        left = Math.min(left, br.left);
        right = Math.max(right, br.right);
      }
      if (bottomEdge <= tr.top) return false;
    } else {
      bottomEdge = tr.top + (cfg.height || 500);
    }

    if (cfg.hbox) {
      var hl = Infinity;
      var hr = -Infinity;
      for (var j = 0; j < cfg.hbox.length; j++) {
        var hb = rectOf(doc, cfg.hbox[j]);
        if (!hb) continue;
        hl = Math.min(hl, hb.left);
        hr = Math.max(hr, hb.right);
      }
      if (hr - hl > 10) {
        left = hl;
        right = hr;
      }
    }

    embed.region = {
      left: Math.max(0, left - PAD),
      top: Math.max(0, tr.top - PAD),
      width: right - left + PAD * 2,
      height: bottomEdge - tr.top + PAD * 2,
    };
    return true;
  }

  function apply(embed) {
    var r = embed.region;
    if (!r || r.width <= 0) return;
    var winW = embed.win.clientWidth;
    if (winW <= 0) return;
    var s = winW / r.width;
    embed.win.style.height = Math.round(r.height * s) + "px";
    embed.frame.style.height = Math.ceil(r.top + r.height + 200) + "px";
    embed.frame.style.left = -Math.round(r.left * s) + "px";
    embed.frame.style.top = -Math.round(r.top * s) + "px";
    embed.frame.style.transform = "scale(" + s + ")";
  }

  function reveal(embed) {
    embed.live = true;
    embed.win.classList.add("is-live");
    updateMode(embed);
  }

  function giveUp(embed) {
    if (embed.live) return;
    if (embed.frame && embed.frame.parentNode) {
      embed.frame.parentNode.removeChild(embed.frame);
    }
    embed.frame = null;
    embed.built = true; // don't retry; the fallback link stays visible
  }

  function updateMode(embed) {
    if (!embed.live) return;
    var previewOnly = !embed.cfg.interactive || previewQuery.matches;
    embed.frame.style.pointerEvents = previewOnly ? "none" : "";

    if (previewOnly && !embed.overlay) {
      var a = document.createElement("a");
      a.className = "embed-overlay";
      a.href = embed.cfg.src;
      a.setAttribute("aria-label", "Open " + embed.cfg.src);
      embed.win.appendChild(a);
      embed.overlay = a;
    } else if (!previewOnly && embed.overlay) {
      embed.win.removeChild(embed.overlay);
      embed.overlay = null;
    }

    if (embed.caption) {
      var text = previewOnly
        ? embed.caption.getAttribute("data-tap-caption")
        : embed.caption.getAttribute("data-live-caption");
      embed.caption.innerHTML = text || "";
      embed.caption.classList.toggle("live", !previewOnly);
      embed.caption.hidden = false;
    }
  }

  function refreshAll() {
    embeds.forEach(function (embed) {
      if (!embed.live) return;
      measure(embed);
      apply(embed);
      updateMode(embed);
    });
  }

  document.querySelectorAll(".embed-window[data-embed]").forEach(initWindow);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var embed = embeds.find(function (e) {
            return e.win === entry.target;
          });
          if (embed) {
            io.unobserve(entry.target);
            build(embed);
          }
        });
      },
      { rootMargin: "600px 0px" }
    );
    embeds.forEach(function (embed) {
      io.observe(embed.win);
    });
  } else {
    embeds.forEach(build);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshAll, 150);
  });
  if (previewQuery.addEventListener) {
    previewQuery.addEventListener("change", refreshAll);
  }
})();
