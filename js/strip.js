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

    // one label per stretch, anchored where the stretch begins
    var LABELS = [
        {
            text: "BIOFUELS ENGINEERING",
            lane: 1,
            at: new Date(2007, 6, 1),
        },
        {
            text: "JOURNALISM",
            lane: 1,
            at: new Date(2011, 8, 1),
        },
        {
            text: "DATA VIZ ENGINEERING",
            lane: 1,
            at: new Date(2018, 9, 1),
        },
        { text: "UNDERGRAD", lane: 0, at: new Date(2002, 8, 1) },
        { text: "GRAD SCHOOL", lane: 0, at: new Date(2010, 8, 1) },
    ];

    var YEAR_TICKS = [2005, 2010, 2015, 2020, 2025];

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
        var workRows = [];
        var schoolRows = [];
        var placed = LABELS.map(function (lab) {
            var anchor = x(lab.at);
            var text = make(
                "text",
                {
                    x: anchor,
                    y: 0,
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
            text.textContent = lab.text;
            var w = text.getComputedTextLength();
            var x0 = Math.max(Math.min(anchor, width - w - 2), 0);
            text.setAttribute("x", x0);
            var rows = lab.lane === 1 ? workRows : schoolRows;
            return {
                lab: lab,
                text: text,
                anchor: anchor,
                row: assignRow(rows, x0, x0 + w),
            };
        });

        // lane geometry, now that the work-label row count is known
        var nWork = workRows.length;
        var workY = L.gridTop + 6 + nWork * L.labelRowH;
        var schoolY = workY + L.workH + 8;
        var gridBottom = schoolY + L.schoolH + 2;
        var schoolLabelY = gridBottom + 13;
        var height = schoolLabelY + (schoolRows.length - 1) * L.labelRowH + 6;
        svg.setAttribute("height", height);

        placed.forEach(function (p) {
            var y;
            if (p.lab.lane === 1) {
                // row 0 hugs the work lane; extra rows stack upward
                y = workY - 8 - p.row * L.labelRowH;
                if (p.row > 0) {
                    make(
                        "line",
                        {
                            x1: p.anchor + 1,
                            x2: p.anchor + 1,
                            y1: y + 3,
                            y2: workY - 2,
                            stroke: "var(--baseline)",
                            "stroke-width": 1,
                        },
                        gGrid,
                    );
                }
            } else {
                y = schoolLabelY + p.row * L.labelRowH;
            }
            p.text.setAttribute("y", y);
        });

        // year gridlines + labels up top (recessive)
        YEAR_TICKS.forEach(function (year) {
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
