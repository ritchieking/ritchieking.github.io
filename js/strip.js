// Career timeline strip — renders into #strip, links through to /resume/
(function () {
  var CAT_COLORS = {
    school: "--cat-school",
    engineering: "--cat-engineering",
    play: "--cat-play",
    journalism: "--cat-journalism",
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
      label: "DARTMOUTH",
    },
    {
      org: "NYU",
      role: "M.A., science journalism (SHERP)",
      dates: "2010–2011",
      cat: "school",
      lane: 0,
      beg: new Date(2010, 8, 1),
      end: new Date(2011, 11, 1),
      label: "NYU",
    },
    {
      org: "Mascoma",
      role: "Chemical process engineer",
      dates: "2007–2009",
      cat: "engineering",
      lane: 1,
      beg: new Date(2007, 6, 1),
      end: new Date(2009, 6, 1),
      label: "MASCOMA",
    },
    {
      org: "Deer Valley",
      role: "Line cook, ski bum",
      dates: "2009–2010",
      cat: "play",
      lane: 1,
      beg: new Date(2009, 10, 1),
      end: new Date(2010, 4, 1),
      label: "SKI",
    },
    {
      org: "The New York Times",
      role: "Science + graphics intern, then freelance graphics editor",
      dates: "2011–2012",
      cat: "journalism",
      lane: 1,
      beg: new Date(2011, 8, 1),
      end: new Date(2012, 5, 1),
      label: "NYT",
    },
    {
      org: "Businessweek",
      role: "Freelance graphics editor",
      dates: "2012",
      cat: "journalism",
      lane: 1,
      beg: new Date(2012, 5, 1),
      end: new Date(2012, 7, 1),
      label: "BW",
    },
    {
      org: "Quartz",
      role: "Reporter",
      dates: "2012–2014",
      cat: "journalism",
      lane: 1,
      beg: new Date(2012, 7, 1),
      end: new Date(2014, 1, 1),
      label: "QUARTZ",
    },
    {
      org: "FiveThirtyEight",
      role: "Visual journalist, then senior editor for data visualization",
      dates: "2014–2018",
      cat: "journalism",
      lane: 1,
      beg: new Date(2014, 1, 1),
      end: new Date(2018, 8, 1),
      label: "FIVETHIRTYEIGHT",
    },
    {
      org: "Netflix",
      role: "Senior, then staff data visualization engineer",
      dates: "2018–present",
      cat: "vizeng",
      lane: 1,
      beg: new Date(2018, 9, 1),
      end: new Date(),
      label: "NETFLIX",
    },
  ];

  var YEAR_TICKS = [2010, 2015, 2020, 2025];

  var container = document.getElementById("strip");
  if (!container) return;
  var tooltip = document.getElementById("strip-tooltip");

  var LAYOUT = {
    padTop: 6,
    schoolLabelY: 16,
    schoolY: 22,
    schoolH: 10,
    workLabelY: 56,
    workY: 62,
    workH: 16,
    baselineY: 96,
    tickLabelY: 112,
    height: 118,
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
      return (
        ((date - domainBeg) / (domainEnd - domainBeg)) * width
      );
    };

    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    // attach before drawing so getComputedTextLength() measures real widths
    container.insertBefore(svg, tooltip);
    svg.setAttribute("width", width);
    svg.setAttribute("height", LAYOUT.height);
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
        y1: LAYOUT.padTop,
        y2: LAYOUT.baselineY,
        stroke: "var(--hairline)",
        "stroke-width": 1,
      });
      var lbl = make("text", {
        x: tx,
        y: LAYOUT.tickLabelY,
        "text-anchor": "middle",
        fill: "var(--muted)",
        "font-size": "11px",
      });
      lbl.textContent = year;
    });

    // baseline
    make("line", {
      x1: 0,
      x2: width,
      y1: LAYOUT.baselineY,
      y2: LAYOUT.baselineY,
      stroke: "var(--baseline)",
      "stroke-width": 1,
    });

    SEGMENTS.forEach(function (seg) {
      var x0 = x(seg.beg) + 1;
      var w = Math.max(x(seg.end) - x(seg.beg) - 2, 2);
      var y0 = seg.lane === 0 ? LAYOUT.schoolY : LAYOUT.workY;
      var h = seg.lane === 0 ? LAYOUT.schoolH : LAYOUT.workH;

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

      // direct label (dropped if it doesn't fit)
      var labelY = seg.lane === 0 ? LAYOUT.schoolLabelY : LAYOUT.workLabelY;
      var text = make("text", {
        x: x0,
        y: labelY,
        fill: "var(--ink-2)",
        "font-size": "10.5px",
        "font-family": "Montserrat, system-ui, sans-serif",
        "font-weight": 700,
        "letter-spacing": "0.06em",
        "pointer-events": "none",
      });
      text.textContent = seg.label;
      if (text.getComputedTextLength() > w + 6) text.remove();

      function showTip(evt) {
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
  }

  render();
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
})();
