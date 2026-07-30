// Vertical reverse-chronological timeline. Bars are laid out by this script;
// the parallax + highlight coordination is pure CSS scroll-driven animation
// (see style.css). Falls back to IntersectionObserver where scroll-driven
// animations are unsupported.
(function () {
	// one column per career category; jobs within a category never overlap,
	// so each column is a clean stack of bars
	var LANES = ['school', 'engineering', 'journalism', 'vizeng', 'play'];
	// with parallax on, the track is this multiple of the sticky window — kept
	// low so most of the 24 years is visible at once and the highlighted bar
	// stays in frame even through the dense 2011-12 stretch
	var TRACK_RATIO = 1.25;
	// room above the "present" edge for the today dot + column labels
	var TOP_PAD = 44;

	// era labels sit horizontally just above the top of the run of bars they
	// describe; date marks that top edge (reverse chron)
	var ERAS = [
		{ label: 'DATA VIZ\nENGINEERING', lane: 'vizeng', date: 'present' },
		{ label: 'VISUAL\nJOURNALISM', lane: 'journalism', date: '2018-09' },
		{ label: 'J-SCHOOL', lane: 'school', date: '2011-12' },
		{ label: 'SKI\nBUMMING', lane: 'play', date: '2010-05' },
		{ label: 'BIOFUELS\nENGINEERING', lane: 'engineering', date: '2009-07' },
		// overhangs the (empty) axis gutter instead of the mascoma bar
		{ label: 'UNDERGRAD', lane: 'school', date: '2007-06', minLeft: 2, lift: 2 }
	];

	var scrollWrap = document.getElementById('history-scroll');
	var track = document.getElementById('tl-track');
	var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
	if (!scrollWrap || !track || !cards.length) return;

	var sda =
		window.CSS &&
		CSS.supports &&
		CSS.supports('animation-timeline: view()');
	var reducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;
	var parallax = sda && !reducedMotion;
	if (!sda) scrollWrap.classList.add('no-sda');

	var MIN_DATE = parseDate('2002-09');

	function parseDate(str) {
		if (str === 'present') return new Date();
		var parts = str.split('-');
		return new Date(+parts[0], +parts[1] - 1, 1);
	}

	function catClass(el) {
		var m = el.className.match(/cat-[a-z]+/);
		return m ? m[0] : 'cat-journalism';
	}

	function render() {
		track.innerHTML = '';

		var winH = track.parentElement.clientHeight;
		var trackW = track.clientWidth;
		var maxDate = new Date();
		var span = maxDate - MIN_DATE;
		var trackH = parallax ? winH * TRACK_RATIO : winH;
		track.style.height = trackH + 'px';
		track.style.setProperty('--tl-shift', -(Math.max(trackH - winH, 0)) + 'px');
		if (parallax) {
			// confine the shift to the pinned phase; scroll(root) would otherwise
			// start it at the top of the page and clip the era labels by the time
			// the timeline is even in view
			var pinTop = scrollWrap.getBoundingClientRect().top + window.scrollY;
			var pinLen = Math.max(scrollWrap.clientHeight - winH, 1);
			track.style.animationRange =
				Math.round(pinTop) + 'px ' + Math.round(pinTop + pinLen) + 'px';
		}

		var y = function (d) {
			return TOP_PAD + ((maxDate - d) / span) * (trackH - TOP_PAD);
		};

		var axisW = 34;
		var laneStep = (trackW - axisW) / LANES.length;
		var barW = Math.min(12, Math.max(6, laneStep * 0.35));
		var laneX = function (lane) {
			return axisW + LANES.indexOf(lane) * laneStep + 2;
		};

		// lane group headers — centered within their divider-bounded band
		var heads = document.querySelector('.tl-lane-heads');
		if (heads) {
			var pos = function (el, x) {
				if (el) el.style.left = x + 'px';
			};
			pos(heads.querySelector('.lh-school'), axisW + laneStep * 0.5);
			pos(heads.querySelector('.lh-work'), axisW + laneStep * 2.5);
			pos(heads.querySelector('.lh-play'), axisW + laneStep * 4.5);
		}

		// year ticks — every year, full label
		for (var yr = 2003; yr <= maxDate.getFullYear(); yr++) {
			var ty = y(new Date(yr, 0, 1));
			var tick = document.createElement('div');
			tick.className = 'tl-tick';
			tick.style.top = ty + 'px';
			track.appendChild(tick);
			var lab = document.createElement('div');
			lab.className = 'tl-year';
			lab.textContent = yr;
			lab.style.top = ty + 'px';
			track.appendChild(lab);
		}

		// dividers between the lane groups (school | work | play); they start
		// just below the today marker so the header strip stays clean
		[1, 4].forEach(function (idx) {
			var div = document.createElement('div');
			div.className = 'tl-lane-div';
			div.style.left = axisW + idx * laneStep + 'px';
			div.style.top = TOP_PAD - 2 + 'px';
			track.appendChild(div);
		});

		// today marker — a dot capping the "present" edge of the timeline
		var now = new Date();
		var MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');
		var dot = document.createElement('div');
		dot.className = 'tl-today-dot';
		dot.style.left = laneX('vizeng') + barW / 2 + 'px';
		dot.style.top = TOP_PAD + 'px';
		track.appendChild(dot);
		var tdy = document.createElement('div');
		tdy.className = 'tl-today';
		tdy.textContent =
			'TODAY · ' +
			MONTHS[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
		track.appendChild(tdy);
		tdy.style.left = laneX('vizeng') - 9 - tdy.offsetWidth + 'px';
		tdy.style.top = TOP_PAD - tdy.offsetHeight / 2 + 'px';

		// era labels — horizontal, centered above their column of bars
		ERAS.forEach(function (era) {
			var el = document.createElement('div');
			el.className = 'tl-era';
			el.textContent = era.label;
			track.appendChild(el);
			var cx = laneX(era.lane) + barW / 2;
			var minLeft = era.minLeft != null ? era.minLeft : axisW + 2;
			var left = Math.max(cx - el.offsetWidth / 2, minLeft);
			left = Math.min(left, trackW - el.offsetWidth);
			el.style.left = left + 'px';
			// present-edge label sits above the today dot, others hug their bar
			var lift = era.lift != null ? era.lift : era.date === 'present' ? 14 : 5;
			el.style.top = y(parseDate(era.date)) - el.offsetHeight - lift + 'px';
		});

		// bars — one per card, sharing the card's view timeline
		cards.forEach(function (card, i) {
			var beg = parseDate(card.getAttribute('data-beg'));
			var end = parseDate(card.getAttribute('data-end'));
			var bar = document.createElement('div');
			bar.className = 'tl-bar ' + catClass(card);
			bar.style.left = laneX(card.getAttribute('data-lane')) + 'px';
			bar.style.width = barW + 'px';
			bar.style.top = y(end) + 'px';
			bar.style.height = Math.max(y(beg) - y(end) - 2, 4) + 'px';
			bar.style.setProperty('animation-timeline', '--c' + (i + 1));
			bar.addEventListener('click', function () {
				card.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
			bar._card = card;
			track.appendChild(bar);
		});
	}

	render();

	// highlight fallback without scroll-driven animations
	if (!sda && !reducedMotion && 'IntersectionObserver' in window) {
		var io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					var i = cards.indexOf(entry.target);
					var bars = track.querySelectorAll('.tl-bar');
					entry.target.classList.toggle('active', entry.isIntersecting);
					if (bars[i])
						bars[i].classList.toggle('active', entry.isIntersecting);
				});
			},
			{ rootMargin: '-42% 0px -42% 0px', threshold: 0 }
		);
		cards.forEach(function (c) {
			io.observe(c);
		});
	}

	var resizeTimer;
	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(render, 150);
	});
})();
