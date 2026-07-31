// Career timeline strip — renders into #strip, links through to /resume/
(function () {
    var CAT_COLORS = {
        school: "--cat-school",
        biofuels: "--cat-biofuels",
        visjourn: "--cat-visjourn",
        vizeng: "--cat-vizeng",
    };

    // lane: 0 = school (thin, bottom), 1 = work (main, top)
    var SEGMENTS = [
        {
            org: "Dartmouth",
            role: "B.E. + B.S., engineering",
            dates: "2002–2007",
            cat: "school",
            lane: 0,
            beg: new Date(2002, 8, 1),
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
            cat: "visjourn",
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
            role: "Visual journalism",
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

    // one label per stretch, anchored where the stretch begins; long ones
    // wrap on narrow screens. JOURNALISM is listed first so it claims the
    // row hugging the lane — its neighbors' connectors then drop cleanly
    // past it instead of through it.
    var LABELS = [
        {
            text: "JOURNALISM",
            lane: 1,
            at: new Date(2011, 8, 1),
        },
        {
            text: "BIOFUELS ENGINEERING",
            wrap: ["BIOFUELS", "ENGINEERING"],
            lane: 1,
            at: new Date(2007, 6, 1),
        },
        {
            text: "DATA VIZ ENGINEERING",
            wrap: ["DATA VIZ", "ENGINEERING"],
            lane: 1,
            at: new Date(2018, 9, 1),
        },
        { text: "UNDERGRAD", lane: 0, at: new Date(2002, 8, 1) },
        { text: "GRAD SCHOOL", lane: 0, at: new Date(2010, 8, 1) },
    ];

    var YEAR_TICKS = [2005, 2010, 2015, 2020, 2025];
    var NARROW = 520; // below this: wrapped labels, sparser year ticks

    var container = document.getElementById("strip");
    if (!container) return;
    var tooltip = document.getElementById("strip-tooltip");

    // rows, top to bottom: year labels, work labels (however many rows fit),
    // work lane, school lane, school labels
    var L = {
        tickLabelY: 12,
        gridTop: 18,
        labelRowH: 14,
        workH: 16,
        schoolH: 16,
    };

    function render() {
        var width = container.clientWidth;
        if (width < 100) return;
        container.querySelectorAll("svg").forEach(function (el) {
            el.remove();
        });

        var domainBeg = new Date(2002, 8, 1);
        var domainEnd = new Date();
        var x = function (date) {
            return ((date - domainBeg) / (domainEnd - domainBeg)) * width;
        };

        var NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(NS, "svg");
        // attach before drawing so getComputedTextLength() measures real widths
        container.insertBefore(svg, tooltip);
        svg.setAttribute("width", width);
        svg.setAttribute("role", "img");
        svg.setAttribute(
            "aria-label",
            "Career timeline, 2002 to today. Click for the full interactive resume.",
        );

        function make(tag, attrs, parent) {
            var el = document.createElementNS(NS, tag);
            for (var k in attrs) el.setAttribute(k, attrs[k]);
            (parent || svg).appendChild(el);
            return el;
        }

        // paint order: grid + connectors, then bars, then label text
        var gGrid = make("g", {});
        var gBars = make("g", {});
        var gLabels = make("g", {});

        // measure the labels first — the number of work-label rows decides
        // where the lanes sit, and the svg grows to fit
        function fits(row, x0, x1) {
            return row.every(function (r) {
                return x1 < r[0] - 8 || x0 > r[1] + 8;
            });
        }
        function assignRow(rows, x0, x1) {
            for (var i = 0; ; i++) {
                if (!rows[i]) rows[i] = [];
                if (fits(rows[i], x0, x1)) {
                    rows[i].push([x0, x1]);
                    return i;
                }
            }
        }
        var narrow = width < NARROW;
        var lineH = 12;
        var workRows = [];
        var workRowLines = []; // tallest label (in lines) per work row
        var schoolRows = [];
        var placed = LABELS.map(function (lab) {
            var anchor = x(lab.at);
            var lines = narrow && lab.wrap ? lab.wrap : [lab.text];
            var text = make(
                "text",
                {
                    fill: "var(--ink-2)",
                    stroke: "var(--surface)",
                    "stroke-width": 3,
                    "paint-order": "stroke",
                    "font-size": "10px",
                    "font-family": "ui-monospace, Menlo, Consolas, monospace",
                    "font-weight": 700,
                    "letter-spacing": "0.07em",
                    "pointer-events": "none",
                },
                gLabels,
            );
            var spans = lines.map(function (line) {
                var ts = document.createElementNS(NS, "tspan");
                ts.textContent = line;
                text.appendChild(ts);
                return ts;
            });
            var w = Math.max.apply(
                null,
                spans.map(function (ts) {
                    return ts.getComputedTextLength();
                }),
            );
            var x0 = Math.max(Math.min(anchor, width - w - 2), 0);
            spans.forEach(function (ts) {
                ts.setAttribute("x", x0);
            });
            var row;
            if (lab.lane === 1) {
                row = assignRow(workRows, x0, x0 + w);
                workRowLines[row] = Math.max(
                    workRowLines[row] || 0,
                    lines.length,
                );
            } else {
                row = assignRow(schoolRows, x0, x0 + w);
            }
            return { lab: lab, spans: spans, anchor: anchor, row: row };
        });

        // lane geometry, now that the work-label rows are known; each row is
        // as tall as its tallest (possibly wrapped) label
        var rowH = workRowLines.map(function (n) {
            return n * lineH + 2;
        });
        var labelBand = rowH.reduce(function (a, b) {
            return a + b;
        }, 0);
        var workY = L.gridTop + 6 + labelBand;
        var schoolY = workY + L.workH + 8;
        var gridBottom = schoolY + L.schoolH + 2;
        var schoolLabelY = gridBottom + 13;
        var height = schoolLabelY + (schoolRows.length - 1) * L.labelRowH + 6;
        svg.setAttribute("height", height);

        placed.forEach(function (p) {
            var baseY; // baseline of the label's bottom line
            if (p.lab.lane === 1) {
                // row 0 hugs the work lane; extra rows stack upward
                baseY = workY - 8;
                for (var j = 0; j < p.row; j++) baseY -= rowH[j];
                if (p.row > 0) {
                    make(
                        "line",
                        {
                            x1: p.anchor + 1,
                            x2: p.anchor + 1,
                            y1: baseY + 3,
                            y2: workY - 2,
                            stroke: "var(--baseline)",
                            "stroke-width": 1,
                        },
                        gGrid,
                    );
                }
            } else {
                baseY = schoolLabelY + p.row * L.labelRowH;
            }
            p.spans.forEach(function (ts, i) {
                ts.setAttribute(
                    "y",
                    baseY - (p.spans.length - 1 - i) * lineH,
                );
            });
        });

        // year gridlines + labels up top (recessive)
        var ticks = narrow ? [2005, 2015, 2025] : YEAR_TICKS;
        ticks.forEach(function (year) {
            var tx = x(new Date(year, 0, 1));
            make(
                "line",
                {
                    x1: tx,
                    x2: tx,
                    y1: L.gridTop,
                    y2: gridBottom,
                    stroke: "var(--hairline)",
                    "stroke-width": 1,
                },
                gGrid,
            );
            var lbl = make(
                "text",
                {
                    x: tx,
                    y: L.tickLabelY,
                    "text-anchor": "middle",
                    fill: "var(--muted)",
                    "font-size": "10.5px",
                    "font-family": "ui-monospace, Menlo, Consolas, monospace",
                },
                gGrid,
            );
            lbl.textContent = year;
        });

        // segment bars
        SEGMENTS.forEach(function (seg) {
            var x0 = x(seg.beg) + 1;
            var w = Math.max(x(seg.end) - x(seg.beg) - 2, 2);
            var y0 = seg.lane === 1 ? workY : schoolY;
            var h = seg.lane === 1 ? L.workH : L.schoolH;

            var rect = make(
                "rect",
                {
                    x: x0,
                    y: y0,
                    width: w,
                    height: h,
                    rx: 3,
                    fill: "var(" + CAT_COLORS[seg.cat] + ")",
                    tabindex: 0,
                    role: "link",
                    "aria-label":
                        seg.org +
                        " — " +
                        seg.role +
                        ", " +
                        seg.dates +
                        ". Opens the full resume.",
                },
                gBars,
            );

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
    }

    render();
    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 150);
    });
})();
