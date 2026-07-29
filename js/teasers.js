/* Native project teasers. Fragments in embeds/ are extracted from the
   rescued projects by scripts/build-embeds.mjs and injected here, then
   given back their interactivity with small standalone code:
     - forecast: state hover -> tooltip (content pre-captured from the
       project's own template), click -> that state's forecast page
     - flights: route picker re-renders the result cards from the project's
       own data files; crosshair hover mirrors the original chart behavior
   The p-hacking scatterplot is static by design (the original has no
   pointer behavior either). The atlas table is inline in index.html. */
(function () {
  "use strict";

  var mounts = document.querySelectorAll(".embed-native[data-teaser]");
  if (!mounts.length) return;

  var INITS = { forecast: initForecast, phack: null, flights: initFlights };
  var FRAGS = {
    forecast: "embeds/forecast.html",
    phack: "embeds/phack.svg",
    flights: "embeds/flights.html",
  };

  function mountTeaser(el) {
    var kind = el.getAttribute("data-teaser");
    if (!FRAGS[kind]) return;
    fetch(FRAGS[kind])
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        var holder = document.createElement("div");
        holder.className = "embed-frag";
        holder.innerHTML = html;
        el.appendChild(holder);
        if (INITS[kind]) INITS[kind](el, holder);
        el.classList.add("is-ready");
      })
      .catch(function () {
        /* fallback link stays visible */
      });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          mountTeaser(entry.target);
        });
      },
      { rootMargin: "600px 0px" }
    );
    mounts.forEach(function (el) {
      io.observe(el);
    });
  } else {
    mounts.forEach(mountTeaser);
  }

  /* ---------------- 2016 forecast ---------------- */

  function initForecast(mount, holder) {
    var svg = holder.querySelector(".fe-map svg");
    var mapWrap = holder.querySelector(".fe-map");
    var tipsEl = holder.querySelector("script.fe-tips");
    if (!svg || !mapWrap || !tipsEl) return;
    var tips = JSON.parse(tipsEl.textContent);

    // one reusable hover outline, drawn from the hovered state's own path
    var outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
    outline.setAttribute("class", "fe-hover-outline");
    outline.style.display = "none";
    svg.querySelector("g.racemap").appendChild(outline);

    var tooltip = document.createElement("div");
    tooltip.className = "fe-tooltip";
    mapWrap.appendChild(tooltip);

    var canHover = window.matchMedia("(hover: hover)").matches;

    function stateOf(target) {
      var el = target.closest ? target.closest("path.state, g.box") : null;
      if (!el) return null;
      var m = (el.getAttribute("class") || "").match(/(?:state|box) ([A-Z]{2})/);
      return m ? { abbr: m[1], el: el } : null;
    }

    svg.addEventListener("mouseover", function (e) {
      if (!canHover) return;
      var s = stateOf(e.target);
      if (!s || !tips[s.abbr]) return;
      var statePath = svg.querySelector("path.state." + s.abbr);
      if (statePath) {
        outline.setAttribute("d", statePath.getAttribute("d"));
        outline.style.display = "";
      }
      tooltip.innerHTML = tips[s.abbr].html;
      tooltip.classList.add("on");
    });
    svg.addEventListener("mousemove", function (e) {
      if (!tooltip.classList.contains("on")) return;
      var box = mapWrap.getBoundingClientRect();
      var x = e.clientX - box.left;
      var y = e.clientY - box.top;
      var w = tooltip.offsetWidth || 220;
      var left = x + 18;
      if (left + w > box.width) left = x - w - 18;
      tooltip.style.left = Math.max(0, left) + "px";
      tooltip.style.top = Math.max(0, y - tooltip.offsetHeight - 14) + "px";
    });
    svg.addEventListener("mouseout", function (e) {
      var s = stateOf(e.target);
      if (!s) return;
      outline.style.display = "none";
      tooltip.classList.remove("on");
    });
    svg.addEventListener("click", function (e) {
      var s = stateOf(e.target);
      if (s && tips[s.abbr]) window.location.href = tips[s.abbr].href;
    });
  }

  /* ---------------- flights ---------------- */

  var FL = {
    margin: { top: 45, right: 70, bottom: 0, left: 85 },
    rowHeight: 60,
    totalWidth: 324, // the app's own card width; the stack is scale-fit
    stackW: 364,
  };
  var SVGNS = "http://www.w3.org/2000/svg";

  function fmtDuration(min) {
    var r = Math.round(Math.abs(min));
    return Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
  }
  function fmtDelay(min) {
    var r = Math.round(Math.abs(min));
    var pre = r === 0 ? "" : min > 0 ? "+" : "-";
    return pre + fmtDuration(r);
  }
  function fmtThousands(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
  // the terminal card's delay color ramp: green at -30, gray at 0, red at +30
  function delayColor(min) {
    var G = [68, 171, 67], GRAY = [205, 205, 205], R = [255, 39, 0];
    var t = Math.max(-1, Math.min(1, min / 30));
    var from = GRAY, to = t < 0 ? G : R;
    t = Math.abs(t);
    var c = from.map(function (f, i) {
      return Math.round(f + (to[i] - f) * t);
    });
    return "rgb(" + c.join(",") + ")";
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function initFlights(mount, holder) {
    var stack = holder.querySelector(".fl-stack");
    var island = holder.querySelector("script.fl-default");
    if (!stack) return;
    var defaultData = island ? JSON.parse(island.textContent) : null;

    // stage wrapper for scale-fitting the fixed-width stack
    var stage = el("div", "fl-stage");
    stack.parentNode.insertBefore(stage, stack);
    stage.appendChild(stack);
    stack.style.width = FL.stackW + "px";

    var curScale = 1;
    var curShift = 0;
    function fit() {
      var w = stage.clientWidth;
      if (!w) return;
      // union of the rotated cards' real bounds, normalized to scale 1
      var stageBox = stage.getBoundingClientRect();
      var minL = Infinity,
        maxR = -Infinity,
        maxB = -Infinity;
      stack.querySelectorAll(".cards").forEach(function (c) {
        var r = c.getBoundingClientRect();
        minL = Math.min(minL, r.left - stageBox.left);
        maxR = Math.max(maxR, r.right - stageBox.left);
        maxB = Math.max(maxB, r.bottom - stageBox.top);
      });
      if (maxR === -Infinity) return;
      var natL = (minL - curShift) / curScale;
      var natW = (maxR - minL) / curScale + 4;
      var natB = maxB / curScale;
      curScale = Math.min(w / natW, 1.35);
      curShift = -natL * curScale;
      stack.style.transform =
        "translateX(" + curShift + "px) scale(" + curScale + ")";
      stage.style.height = Math.ceil(natB * curScale + 8) + "px";
    }
    fit();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit);
    }
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(fit, 150);
    });

    if (defaultData) {
      wireRouteHover(stack.querySelector(".route-container"), defaultData.rows);
    }

    // ---- route picker ----
    var picker = holder.querySelector(".fl-picker");
    if (!picker) {
      picker = el("div", "fl-picker");
      picker.innerHTML =
        '<label>from <select class="fl-from"></select></label>' +
        '<span aria-hidden="true">&#9992;</span>' +
        '<label>to <select class="fl-to"></select></label>' +
        '<span class="fl-status" hidden></span>';
      holder.insertBefore(picker, holder.firstChild);
    }
    var selFrom = picker.querySelector(".fl-from");
    var selTo = picker.querySelector(".fl-to");
    var status = picker.querySelector(".fl-status");
    selFrom.innerHTML = '<option value="BOS">BOS &mdash; Boston</option>';
    selTo.innerHTML = '<option value="ORD">ORD &mdash; Chicago</option>';

    var airportsList = null;
    var data = null;
    var loadingLists = null;
    var loadingData = null;

    function fetchJSON(path) {
      return fetch("flights/" + path).then(function (r) {
        if (!r.ok) throw new Error(path + ": " + r.status);
        return r.json();
      });
    }
    function loadLists() {
      if (loadingLists) return loadingLists;
      loadingLists = fetchJSON("data/us-airports.json").then(function (list) {
        airportsList = {};
        list
          .slice()
          .sort(function (a, b) {
            return a.faa_iata_code < b.faa_iata_code ? -1 : 1;
          })
          .forEach(function (a) {
            airportsList[a.faa_iata_code] = a;
          });
        [selFrom, selTo].forEach(function (sel) {
          var keep = sel.value;
          sel.innerHTML = "";
          for (var code in airportsList) {
            var a = airportsList[code];
            var opt = document.createElement("option");
            opt.value = code;
            opt.textContent = code + " — " + a.city + ", " + a.state;
            sel.appendChild(opt);
          }
          sel.value = keep;
        });
      });
      return loadingLists;
    }
    function loadData() {
      if (loadingData) return loadingData;
      status.hidden = false;
      status.textContent = "loading the route data (one-time, ~2 MB)…";
      loadingData = Promise.all([
        fetchJSON("data/routes.json"),
        fetchJSON("data/route-overview.json"),
        fetchJSON("data/airports.json"),
        fetchJSON("data/bestby.json"),
      ]).then(function (r) {
        data = { routes: r[0], overview: r[1], terminals: r[2], bestby: r[3] };
        status.hidden = true;
      });
      return loadingData;
    }

    // the airport list is small: populate the pickers as soon as the teaser
    // mounts; the heavy route data starts loading on first intent
    loadLists().catch(function () {});
    ["pointerdown", "touchstart", "focusin"].forEach(function (evt) {
      picker.addEventListener(evt, primeData, { once: true, passive: true });
    });
    function primeData() {
      loadLists().then(loadData).catch(showLoadError);
    }
    function showLoadError() {
      status.hidden = false;
      status.textContent = "couldn’t load the route data — try the full interactive instead";
    }

    function onPick() {
      var o = selFrom.value;
      var d = selTo.value;
      Promise.all([loadLists(), loadData()])
        .then(function () {
          rerender(o, d);
        })
        .catch(showLoadError);
    }
    selFrom.addEventListener("change", onPick);
    selTo.addEventListener("change", onPick);

    function rerender(o, d) {
      if (o === d) {
        status.hidden = false;
        status.textContent = "pick two different airports";
        return;
      }
      if (!data.routes[o] || !data.routes[o][d]) {
        status.hidden = false;
        status.textContent =
          "no direct " + o + " → " + d + " flights in the data — try another pair";
        return;
      }
      status.hidden = true;
      var oldT = stack.querySelector(".terminal-container");
      var oldR = stack.querySelector(".route-container");
      var newT = renderTerminalCard(o);
      var newR = renderRouteCard(o, d);
      oldT.replaceWith(newT);
      oldR.replaceWith(newR);
      fit();
    }

    function airportName(code) {
      var a = airportsList && airportsList[code];
      return a ? a.name : code;
    }
    function airportCity(code) {
      var a = airportsList && airportsList[code];
      return a ? a.city : code;
    }

    function renderTerminalCard(code) {
      var card = el("div", "cards terminal-container obscured");
      var terminals = data.terminals.origin;
      var delay = terminals[code].delay_typical;
      var keys = Object.keys(terminals);
      var rank = keys.indexOf(code) + 1;

      var top = el("div", "top-div");
      var hc = el("div", "header-container");
      hc.appendChild(el("div", "", "ORIGIN"));
      top.appendChild(hc);
      top.appendChild(
        el("div", "close-out", '<div class="close-out-inside"><p>✕</p></div>')
      );
      card.appendChild(top);
      card.appendChild(
        el("h3", "", airportName(code) + " <span>(" + code + ")</span>")
      );

      var mins = Math.round(Math.abs(delay));
      var verb = delay >= 0 ? "<strong>adds " : "<strong>shaves ";
      var post = delay >= 0 ? "</strong> to" : "</strong> off";
      card.appendChild(
        el(
          "div",
          "",
          "Flying out of " + code + " typically " + verb + mins +
            (mins === 1 ? " minute" : " minutes") + post + " your travel time. Out of " +
            keys.length + " origin airports, " + code + " is the <strong>" +
            rank + ordinal(rank) + "</strong> fastest."
        )
      );

      card.appendChild(el("div", "table-label", "Extra time added"));
      card.appendChild(el("div", "table-label unbold", "By popular destinations"));

      var dests = Object.keys(data.overview[code] || {})
        .map(function (dst) {
          return {
            dest: dst,
            flights: data.overview[code][dst].flights,
            delay: data.terminals.dest[dst].delay_typical,
          };
        })
        .sort(function (a, b) {
          return b.flights - a.flights;
        })
        .slice(0, 3);
      card.appendChild(
        delayTable(
          ["", "Flights", ""],
          dests.map(function (r) {
            return {
              label: "✈ " + airportCity(r.dest) + " (" + r.dest + ")",
              cells: [fmtThousands(r.flights)],
              delay: r.delay,
            };
          })
        )
      );

      var best = data.bestby[code] && data.bestby[code].origin;
      if (best) {
        card.appendChild(el("div", "table-label unbold second", "By airlines"));
        var rows = best.slice().sort(function (a, b) {
          return a.plusminus_typical - b.plusminus_typical;
        });
        card.appendChild(
          delayTable(
            ["", "Routes", "Flights", ""],
            rows.map(function (r) {
              return {
                label: r.airline,
                cells: [fmtThousands(r.routes), fmtThousands(r.flights)],
                delay: r.plusminus_typical,
              };
            })
          )
        );
      }
      return card;
    }

    function delayTable(headers, rows) {
      var table = document.createElement("table");
      var thead = el("thead");
      var tr = el("tr");
      headers.forEach(function (h, i) {
        var th = el("th", i === 0 ? "bold" : "number", h);
        if (i === headers.length - 1) th.className += " time-added";
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
      var tbody = el("tbody");
      rows.forEach(function (r) {
        var tr = el("tr");
        tr.appendChild(el("td", "bold", r.label));
        r.cells.forEach(function (c) {
          tr.appendChild(el("td", "number", c));
        });
        var td = el("td", "number time-added", fmtDelay(r.delay));
        td.style.backgroundColor = delayColor(r.delay);
        if (Math.abs(r.delay) > 14.5) td.className += " white-text";
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      return table;
    }

    function renderRouteCard(o, d) {
      var card = el("div", "cards route-container");
      var rows = Object.values(data.routes[o][d]).sort(function (a, b) {
        return a.actual_time - b.actual_time;
      });
      var overview = data.overview[o][d];
      var reverse = data.routes[d] && data.routes[d][o]
        ? Object.values(data.routes[d][o])
        : [];
      var combined = rows.concat(reverse);

      var width = FL.totalWidth - FL.margin.left - FL.margin.right;
      var rangeUpper = rows.length * FL.rowHeight;
      var bumper = rows.length > 1 ? 0 : 15;
      var height = rangeUpper + 20 + bumper;
      var maxMin = Math.max.apply(
        null,
        combined.map(function (r) {
          return Math.max(r.actual_time, r.typical_time);
        })
      );
      function x(min) {
        return (min / maxMin) * width;
      }

      var top = el("div", "top-div");
      var hc = el("div", "header-container");
      hc.appendChild(el("h3", "", o + "<span> ✈ </span>" + d));
      top.appendChild(hc);
      top.appendChild(
        el("div", "close-out", '<div class="close-out-inside"><p>✕</p></div>')
      );
      card.appendChild(top);
      card.appendChild(
        el(
          "div",
          "flight-count",
          "Flights: <strong>" + fmtThousands(overview.flights) + "</strong>"
        )
      );

      var table = document.createElement("table");
      [
        ["row1", "Target flight time", fmtDuration(overview.target_time)],
        ["row2", "Time added by origin (" + o + ")",
          fmtDelay(data.terminals.origin[o].delay_typical)],
        ["row3", "Time added by destination (" + d + ")",
          fmtDelay(data.terminals.dest[d].delay_typical)],
        ["row4", "Typical flight time", fmtDuration(overview.typical_time)],
      ].forEach(function (r) {
        var tr = el("tr", r[0]);
        tr.appendChild(el("td", "text", r[1]));
        tr.appendChild(el("td", "number", r[2] === "0:00" ? "+0:00" : r[2]));
        table.appendChild(tr);
      });
      card.appendChild(table);

      card.appendChild(el("div", "table-label", "Extra time added by airlines"));

      var chartDiv = el("div", "chart-container");
      var svg = svgEl("svg", {
        width: width + FL.margin.left + FL.margin.right,
        height: height + FL.margin.top + FL.margin.bottom,
      });
      var g = svgEl("g", {
        transform: "translate(" + FL.margin.left + "," + FL.margin.top + ")",
      });
      svg.appendChild(g);
      chartDiv.appendChild(svg);

      // y axis: airline names
      var yAxis = svgEl("g", { class: "y axis" });
      rows.forEach(function (r, i) {
        var tick = svgEl("g", {
          class: "tick",
          transform: "translate(0," + (i * FL.rowHeight + FL.rowHeight / 2) + ")",
        });
        tick.appendChild(svgEl("line", { x2: -6, y2: 0 }));
        var txt = svgEl("text", { dy: ".32em", x: -9, y: 0 });
        txt.style.textAnchor = "end";
        txt.textContent = r.airline;
        tick.appendChild(txt);
        yAxis.appendChild(tick);
      });
      g.appendChild(yAxis);

      // x axis: zero tick + hourly ticks
      var topPad = 15;
      var xAxis = svgEl("g", { class: "x axis" });
      var zero = svgEl("g", {
        class: "tick zero",
        transform: "translate(0,-" + topPad + ")",
      });
      zero.appendChild(svgEl("line", { y2: -17, x2: 0, y1: rangeUpper + topPad + bumper }));
      var st = svgEl("text", { dy: "0em", y: -9, x: -5 });
      st.style.textAnchor = "end";
      st.textContent = "SCHEDULED";
      zero.appendChild(st);
      var dt = svgEl("text", { x: -5, y: 3 });
      dt.style.textAnchor = "end";
      dt.textContent = "DEPARTURE";
      zero.appendChild(dt);
      xAxis.appendChild(zero);
      var tickStep = 60 * Math.max(1, Math.ceil(maxMin / 60 / 3.5));
      for (var hAt = tickStep; hAt < maxMin; hAt += tickStep) {
        var tick = svgEl("g", {
          class: "tick non-zero",
          transform: "translate(" + x(hAt) + ",-" + topPad + ")",
        });
        tick.appendChild(svgEl("line", { y2: -6, x2: 0, y1: rangeUpper + topPad + bumper }));
        var tx = svgEl("text", { dy: "0em", y: -9, x: 0 });
        tx.style.textAnchor = "middle";
        tx.textContent = hAt / 60 + ":00";
        tick.appendChild(tx);
        xAxis.appendChild(tick);
      }
      g.appendChild(xAxis);

      // target/typical bands
      var target = rows[0].target_time;
      var typical = rows[0].typical_time;
      var expected = svgEl("g", {
        transform: "translate(" + x(target) + ",0)",
        class: "expected",
      });
      var gRect = svgEl("rect", {
        x: -x(target), y: -10, width: x(target),
        height: rangeUpper + 10 + bumper, fill: "#44ab43",
      });
      gRect.style.opacity = 0.07;
      expected.appendChild(gRect);
      if (target < typical) {
        var yRect = svgEl("rect", {
          y: -10, width: x(typical - target),
          height: rangeUpper + 10 + bumper, fill: "#f6b900",
        });
        yRect.style.opacity = 0.07;
        expected.appendChild(yRect);
        expected.appendChild(
          svgEl("line", { y1: -10, y2: rangeUpper + bumper + topPad + 7 })
        );
        var et = svgEl("text", { y: rangeUpper + bumper + topPad + 4, x: -5 });
        et.style.textAnchor = "end";
        et.textContent = "TARGET";
        expected.appendChild(et);
      }
      g.appendChild(expected);

      var typicalG = svgEl("g", {
        transform: "translate(" + x(typical) + ",0)",
        class: "typical",
      });
      var rRect = svgEl("rect", {
        y: -10, width: width - x(typical) + 10,
        height: rangeUpper + bumper + 10, fill: "#ff2700",
      });
      rRect.style.opacity =
        rows[0].actual_time > typical && rows[0].color === "green" ? 0 : 0.07;
      typicalG.appendChild(rRect);
      typicalG.appendChild(
        svgEl("line", { y1: -10, y2: rangeUpper + bumper + topPad + 7 })
      );
      var tt = svgEl("text", { y: rangeUpper + bumper + topPad + 4, x: 5 });
      tt.textContent = "TYPICAL";
      typicalG.appendChild(tt);
      g.appendChild(typicalG);

      // per-airline dot plots
      var band = FL.rowHeight;
      rows.forEach(function (r, i) {
        var dp = svgEl("g", {
          transform: "translate(0," + i * band + ")",
          class: "dot-plot " + r.color,
        });
        dp.appendChild(
          svgEl("rect", {
            y: band / 3, height: band / 3,
            width: x(r.scheduled_time), class: "scheduled-time",
          })
        );
        dp.appendChild(
          svgEl("line", {
            y1: band / 2, y2: band / 2, x2: x(r.actual_time), class: "actual-time",
          })
        );
        dp.appendChild(
          svgEl("circle", {
            cx: x(r.actual_time), cy: band / 2, r: 4.5, class: "actual-time",
          })
        );
        g.appendChild(dp);
      });

      // legend labels
      var labels = svgEl("g", { class: "chart-label", transform: "translate(10,3)" });
      var schT = svgEl("text", { class: "label-sch-time", y: (band * 2) / 3 + 20 });
      schT.textContent = "Scheduled";
      labels.appendChild(schT);
      labels.appendChild(
        svgEl("line", {
          x1: 15, x2: 15, y1: (band * 2) / 3 - 4, y2: (band * 2) / 3 + 8,
          class: "label-sch-time",
        })
      );
      var avgT = svgEl("text", { class: "label-avg-time", y: 5 });
      avgT.textContent = "Average flight time";
      labels.appendChild(avgT);
      labels.appendChild(
        svgEl("line", { x1: 15, x2: 15, y1: 8, y2: 26, class: "label-avg-time" })
      );
      g.appendChild(labels);

      rows.forEach(function (r, i) {
        var txt = svgEl("text", {
          x: width + FL.margin.right,
          y: i * band + band / 2,
          dy: ".32em",
          class: "delay-text",
        });
        txt.style.textAnchor = "end";
        txt.textContent = fmtDelay(r.actual_time - r.typical_time);
        g.appendChild(txt);
      });

      g.appendChild(
        svgEl("rect", { class: "hover-rect", width: width, height: height })
      );
      card.appendChild(chartDiv);

      wireRouteHover(
        card,
        rows.map(function (r) {
          return {
            airline: r.airline,
            sched: fmtDuration(r.scheduled_time),
            act: fmtDuration(r.actual_time),
          };
        })
      );
      return card;
    }

    /* crosshair hover: fade the context, show per-airline scheduled and
       actual times (mirrors the app's highlightScheduledTime) */
    function wireRouteHover(card, rows) {
      if (!card) return;
      var hoverRect = card.querySelector(".hover-rect");
      var svg = card.querySelector("svg");
      if (!hoverRect || !svg) return;
      var built = false;
      function build() {
        built = true;
        card.querySelectorAll(".dot-plot").forEach(function (dp, i) {
          if (!rows[i]) return;
          var circle = dp.querySelector("circle.actual-time");
          var cy = +circle.getAttribute("cy");
          var s = svgEl("text", {
            transform: "translate(10," + (cy + 5) + ")",
            class: "sched-time-label",
          });
          s.textContent = rows[i].sched;
          dp.appendChild(s);
          var a = svgEl("text", {
            transform:
              "translate(" + (+circle.getAttribute("cx") + 7) + "," + (cy + 5) + ")",
            class: "act-time-label",
          });
          a.textContent = rows[i].act;
          dp.appendChild(a);
        });
      }
      hoverRect.addEventListener("mouseenter", function () {
        if (!built) build();
        svg.classList.add("fl-peek");
      });
      hoverRect.addEventListener("mouseleave", function () {
        svg.classList.remove("fl-peek");
      });
    }
  }
})();
