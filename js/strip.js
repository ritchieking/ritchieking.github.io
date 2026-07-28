// Career timeline strip — renders into #strip, links through to /resume/
(function () {
  var CAT_COLORS = {
    school: "--cat-school",
    biofuels: "--cat-biofuels",
    writing: "--cat-writing",
    visjourn: "--cat-visjourn",
    vizeng: "--cat-vizeng",
  };

  // lane: 0 = school (thin, top), 1 = work (main)
  var SEGMENTS = [
    {
      org: "Dartmouth",
      role: "B.E. + B.S., engineering",
      dates: "2002–2007",
      cat: "school",
      lane: 0,
      beg: new Date(2006, 8, 1),
      end: new Date(2007, 5, 1),
    },
    {
      org: "NYU",
      role: "M.A., science journalism (SHERP)",
      dates: "2010–2011",
      cat: "school",
      lane: 0,
      beg: new Date(2010, 8, 1),
      end: new Date(2011, 11, 1),
    },
    {
      org: "Mascoma",
      role: "Chemical process engineer at a biofuels start-up",
      dates: "2007–2009",
      cat: "biofuels",
      lane: 1,
      beg: new Date(2007, 6, 1),
      end: new Date(2009, 6, 1),
    },
    {
      org: "The New York Times",
      role: "Science desk intern",
      dates: "2011",
      cat: "writing",
      lane: 1,
      beg: new Date(2011, 8, 1),
      end: new Date(2011, 11, 1),
    },
    {
      org: "The New York Times",
      role: "Graphics intern, then freelance graphics editor",
      dates: "2011–2012",
      cat: "visjourn",
      lane: 1,
      beg: new Date(2011, 11, 1),
      end: new Date(2012, 5, 1),
    },
    {
      org: "Businessweek",
      role: "Freelance graphics editor",
      dates: "2012",
      cat: "visjourn",
      lane: 1,
      beg: new Date(2012, 5, 1),
      end: new Date(2012, 7, 1),
    },
    {
      org: "Quartz",
      role: "Reporter",
      dates: "2012–2014",
      cat: "visjourn",
      lane: 1,
      beg: new Date(2012, 7, 1),
      end: new Date(2014, 1, 1),
    },
    {
      org: "FiveThirtyEight",
      role: "Visual journalist, then senior editor for data visualization",
      dates: "2014–2018",
      cat: "visjourn",
      lane: 1,
      beg: new Date(2014, 1, 1),
      end: new Date(2018, 8, 1),
    },
    {
      org: "Netflix",
      role: "Senior, then staff data visualization engineer",
      dates: "2018–present",
      cat: "vizeng",
      lane: 1,
      beg: new Date(2018, 9, 1),
      end: new Date(),
    },
  ];

  // one label per category, anchored where the category begins
  var LABELS = [
    { text: "SCHOOL", cat: "school", lane: 0, at: new Date(2006, 8, 1) },
    { text: "BIOFUELS ENGINEERING", cat: "biofuels", lane: 1, at: new Date(2007, 6, 1) },
    { text: "WRITING", cat: "writing", lane: 1, at: new Date(2011, 8, 1), prefer: "below" },
    { text: "VISUAL JOURNALISM", cat: "visjourn", lane: 1, at: new Date(2011, 11, 1) },
    { text: "DATA VIZ ENGINEERING", cat: "vizeng", lane: 1, at: new Date(2018, 9, 1) },
  ];

  var YEAR_TICKS = [2010, 2015, 2020, 2025];

  var container = document.getElementById("strip");
  if (!container) return;
  var tooltip = document.getElementById("strip-tooltip");

  var L = {
    padTop: 6,
    topLabelY: 14,
    schoolY: 20,
    schoolH: 9,
    aboveLabelY: 46,
    workY: 52,
    workH: 16,
    belowLabelY: [84, 98],
    baselineY: 108,
    tickLabelY: 122,
    height: 128,
  };

  function render() {
    var width = container.clientWidth;
    if (width < 100) return;
    container.querySelectorAll("svg").forEach(function (el) {
      el.remove();
    });

    var domainBeg = new Date(2006, 8, 1);
    var domainEnd = new Date();
    var x = function (date) {
      return ((date - domainBeg) / (domainEnd - domainBeg)) * width;
    };

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    // attach before drawing so getComputedTextLength() measures real widths
    container.insertBefore(svg, tooltip);
    svg.setAttribute("width", width);
    svg.setAttribute("height", L.height);
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "Career timeline, 2006 to today. Click for the full interactive resume."
    );

    function make(tag, attrs, parent) {
      var el = document.createElementNS(NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(el);
      return el;
    }

    // year gridlines + labels (recessive)
    YEAR_TICKS.forEach(function (year) {
      var tx = x(new Date(year, 0, 1));
      make("line", {
        x1: tx,
        x2: tx,
        y1: L.padTop,
        y2: L.baselineY,
        stroke: "var(--hairline)",
        "stroke-width": 1,
      });
      var lbl = make("text", {
        x: tx,
        y: L.tickLabelY,
        "text-anchor": "middle",
        fill: "var(--muted)",
        "font-size": "10.5px",
        "font-family": "ui-monospace, Menlo, Consolas, monospace",
      });
      lbl.textContent = year;
    });

    // baseline
    make("line", {
      x1: 0,
      x2: width,
      y1: L.baselineY,
      y2: L.baselineY,
      stroke: "var(--baseline)",
      "stroke-width": 1,
    });

    // segment bars
    SEGMENTS.forEach(function (seg) {
      var x0 = x(seg.beg) + 1;
      var w = Math.max(x(seg.end) - x(seg.beg) - 2, 2);
      var y0 = seg.lane === 0 ? L.schoolY : L.workY;
      var h = seg.lane === 0 ? L.schoolH : L.workH;

      var rect = make("rect", {
        x: x0,
        y: y0,
        width: w,
        height: h,
        rx: 3,
        fill: "var(" + CAT_COLORS[seg.cat] + ")",
        tabindex: 0,
        role: "link",
        "aria-label":
          seg.org + " — " + seg.role + ", " + seg.dates + ". Opens the full resume.",
      });

      function showTip() {
        rect.setAttribute("stroke", "var(--ink)");
        rect.setAttribute("stroke-width", 1.25);
        tooltip.innerHTML =
          '<span class="tt-org">' +
          seg.org +
          '</span><br><span class="tt-role">' +
          seg.role +
          '</span><br><span class="tt-dates">' +
          seg.dates +
          "</span>";
        tooltip.style.opacity = 1;
        var tipX = Math.min(x0 + 4, width - 250);
        tooltip.style.left = Math.max(tipX, 0) + "px";
        tooltip.style.top = y0 + h + 10 + "px";
      }
      function hideTip() {
        rect.removeAttribute("stroke");
        tooltip.style.opacity = 0;
      }
      rect.addEventListener("mouseenter", showTip);
      rect.addEventListener("focus", showTip);
      rect.addEventListener("mouseleave", hideTip);
      rect.addEventListener("blur", hideTip);
      rect.addEventListener("click", function () {
        window.location.href = "resume/";
      });
      rect.addEventListener("keydown", function (evt) {
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          window.location.href = "resume/";
        }
      });
    });

    // category labels with greedy row placement (rows never overlap)
    var rows = { top: [], above: [], below0: [], below1: [] };
    function fits(row, x0, x1) {
      return row.every(function (r) {
        return x1 < r[0] - 8 || x0 > r[1] + 8;
      });
    }
    LABELS.forEach(function (lab) {
      var anchor = x(lab.at);
      var text = make("text", {
        x: anchor,
        y: 0,
        fill: "var(--ink-2)",
        "font-size": "10px",
        "font-family": "ui-monospace, Menlo, Consolas, monospace",
        "font-weight": 700,
        "letter-spacing": "0.07em",
        "pointer-events": "none",
      });
      text.textContent = lab.text;
      var w = text.getComputedTextLength();
      var x0 = Math.min(anchor, width - w - 2);
      text.setAttribute("x", x0);

      var placed = null;
      if (lab.lane === 0) {
        placed = { y: L.topLabelY, row: "top" };
      } else {
        var tryRows =
          lab.prefer === "below"
            ? ["below0", "above", "below1"]
            : ["above", "below0", "below1"];
        for (var i = 0; i < tryRows.length; i++) {
          var key = tryRows[i];
          if (fits(rows[key], x0, x0 + w)) {
            placed = {
              y: key === "above" ? L.aboveLabelY : L.belowLabelY[+key.slice(5)],
              row: key,
            };
            break;
          }
        }
        if (!placed) placed = { y: L.belowLabelY[1], row: "below1" };
      }
      rows[placed.row].push([x0, x0 + w]);
      text.setAttribute("y", placed.y);

      // connector tick for labels pushed under the lane
      if (placed.row === "below0" || placed.row === "below1") {
        make("line", {
          x1: anchor + 1,
          x2: anchor + 1,
          y1: L.workY + L.workH + 2,
          y2: placed.y - 9,
          stroke: "var(--baseline)",
          "stroke-width": 1,
        });
      }
    });
  }

  render();
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
})();
