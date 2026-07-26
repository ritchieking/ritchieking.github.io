// Vertical reverse-chronological timeline. Bars are laid out by this script;
// the parallax + highlight coordination is pure CSS scroll-driven animation
// (see style.css). Falls back to IntersectionObserver where scroll-driven
// animations are unsupported.
(function () {
	var LANES = ['school', 'engineering', 'wandg', 'graphics', 'play'];
	// with parallax on, the track is this multiple of the sticky window, so the
	// visible slice always covers most of the 20 years and the highlighted bar
	// stays in frame even through the dense 2011-12 stretch
	var TRACK_RATIO = 1.6;

	// era labels; date marks the era's most recent edge (= top, reverse chron)
	var ERAS = [
		{ label: 'DATA VIZ ENGINEERING', lane: 'graphics', date: 'present' },
		{ label: 'BOTH', lane: 'wandg', date: '2016-04' },
		{ label: 'INTERNSHIPS + FREELANCING', lane: 'graphics', date: '2012-08' },
		{ label: 'J-SCHOOL', lane: 'school', date: '2011-12' },
		{ label: 'SKI BUMMING', lane: 'play', date: '2010-05' },
		{ label: 'ENGINEERING', lane: 'engineering', date: '2009-07' },
		{ label: 'UNDERGRAD', lane: 'school', date: '2007-06' }
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

	var MIN_DATE = parseDate('2006-09');

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

		var y = function (d) {
			return ((maxDate - d) / span) * trackH;
		};

		var axisW = 34;
		var laneStep = (trackW - axisW) / LANES.length;
		var barW = Math.min(12, Math.max(6, laneStep * 0.35));
		var laneX = function (lane) {
			return axisW + LANES.indexOf(lane) * laneStep + 2;
		};

		// lane group headers
		var heads = document.querySelector('.tl-lane-heads');
		if (heads) {
			var pos = function (el, x) {
				if (el) el.style.left = x + barW / 2 + 'px';
			};
			pos(heads.querySelector('.lh-school'), laneX('school'));
			pos(
				heads.querySelector('.lh-work'),
				(laneX('engineering') + laneX('graphics')) / 2
			);
			pos(heads.querySelector('.lh-play'), laneX('play'));
		}

		// year ticks
		for (var yr = 2007; yr <= maxDate.getFullYear(); yr++) {
			var ty = y(new Date(yr, 0, 1));
			var tick = document.createElement('div');
			tick.className = 'tl-tick';
			tick.style.top = ty + 'px';
			track.appendChild(tick);
			if (yr % 2 === 1) {
				var lab = document.createElement('div');
				lab.className = 'tl-year';
				lab.textContent = yr === 2007 ? '2007' : String(yr).slice(2);
				lab.style.top = ty + 'px';
				track.appendChild(lab);
			}
		}

		// era labels
		ERAS.forEach(function (era) {
			var el = document.createElement('div');
			el.className = 'tl-era';
			el.textContent = era.label;
			el.style.left = laneX(era.lane) + barW + 1 + 'px';
			el.style.top = y(parseDate(era.date)) + 3 + 'px';
			track.appendChild(el);
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
