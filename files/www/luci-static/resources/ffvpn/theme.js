/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Theme sampling adapted from Zirgozar.
 */
'use strict';
'require baseclass';
'require poll';
function readTheme() { try { var value = localStorage.getItem('ffvpn-theme'); return value === 'light' || value === 'dark' ? value : 'auto'; } catch(e) { return 'auto'; } }
function followTheme(root) {
	var attached = false;
	function sync() {
		if (!root.isConnected) {
			if (attached) {
				poll.remove(sync);
				if (!document.querySelector('.mk')) {
					['pwp-active', 'pwp-follow', 'pwp-dark', 'pwp-fa'].forEach(function(name) { document.body.classList.remove(name); });
				}
			}
			return;
		}
		attached = true;
		if (root.zgzSyncHeader) root.zgzSyncHeader();
		var automatic = readTheme() === 'auto';
		root.classList.toggle('mk-follow', automatic);
		document.body.classList.toggle('pwp-follow', automatic);
		if (!automatic) return;
		var probe = E('div', { 'class': 'cbi-section', 'style': 'position:absolute;visibility:hidden;pointer-events:none' });
		var button = E('button', { 'class': 'cbi-button cbi-button-apply', 'type': 'button' });
		var input = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'tabindex': '-1' });
		probe.appendChild(button);
		probe.appendChild(input);
		(root.parentElement || document.body).appendChild(probe);
		function opaque(color) {
			return color && color !== 'transparent' && !/rgba\([^)]*,\s*0\s*\)/.test(color);
		}
		var host = root.parentElement, background;
		while (host && !opaque(background = getComputedStyle(host).backgroundColor)) host = host.parentElement;
		background = opaque(background) ? background : 'rgb(255, 255, 255)';
		var style = getComputedStyle(probe), panel = style.backgroundColor;
		var control = getComputedStyle(input), action = getComputedStyle(button);
		var text = style.color, accent = action.backgroundColor;
		/* Some themes use tonal buttons for Apply. Resolve their primary and
		   surface tokens separately so selected tabs retain enough contrast. */
		var swatch = E('span', { 'style': 'background:var(--brand,var(--primary-color-high,var(--primary,' + accent + ')));color:var(--on-brand,var(--on-primary-color,var(--on-primary,' + action.color + ')))' });
		probe.appendChild(swatch);
		var primary = getComputedStyle(swatch);
		var surface = E('span', { 'style': 'background:var(--material3-card-background,' + panel + ');color:var(--on-surface,' + text + ')' });
		probe.appendChild(surface);
		var surfaceStyle = getComputedStyle(surface);
		panel = surfaceStyle.backgroundColor;
		text = surfaceStyle.color;
		accent = primary.backgroundColor;
		function pixels(color) {
			var match = color.match(/^rgba?\(([^)]+)\)/);
			if (match) return match[1].match(/[\d.]+/g).slice(0, 3).map(Number);
			/* Resolve lab()/oklch() through the browser's colour engine. */
			var canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			var context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) return null;
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return Array.prototype.slice.call(context.getImageData(0, 0, 1, 1).data, 0, 3);
		}
		function contrast(a, b) {
			function luminance(rgb) {
				return rgb.reduce(function(sum, value, index) {
					value /= 255;
					return sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
				}, 0);
			}
			var x = luminance(a), y = luminance(b);
			return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
		}
		var panelPixels = pixels(opaque(panel) ? panel : background);
		var accentPixels = pixels(opaque(accent) ? accent : '#5e72e4');
		var onAccent = primary.color, onPixels = pixels(onAccent);
		/* Older themes use white buttons with coloured text. Their text is
		   the accent; treating the white surface as primary hides our tabs. */
		if (panelPixels && accentPixels && onPixels && contrast(accentPixels, panelPixels) < 1.6 && contrast(onPixels, panelPixels) >= 3) {
			var oldAccent = accent, oldPixels = accentPixels;
			accent = onAccent; onAccent = oldAccent;
			accentPixels = onPixels;
			onPixels = oldPixels;
		}
		if (accentPixels && onPixels && contrast(accentPixels, onPixels) < 4.5) {
			onAccent = contrast(accentPixels, [0, 0, 0]) > contrast(accentPixels, [255, 255, 255]) ? '#000' : '#fff';
		}
		var ink = accentPixels && accentPixels.slice(), textPixels = pixels(text);
		if (ink && panelPixels && textPixels) {
			var tonalPixels = panelPixels.map(function(value, index) { return value * 0.88 + accentPixels[index] * 0.12; });
			for (var step = 0; step < 20 && Math.min(contrast(ink, panelPixels), contrast(ink, tonalPixels)) < 4.6; step++) {
				ink = ink.map(function(value, index) { return value * 0.85 + textPixels[index] * 0.15; });
			}
		}
		var values = { bg: background, panel: opaque(panel) ? panel : background,
			text: text, line: style.borderTopColor, soft: opaque(panel) ? panel : background,
			accent: opaque(accent) ? accent : '#5e72e4', 'on-accent': onAccent,
			'accent-ink': ink ? 'rgb(' + ink.map(Math.round).join(', ') + ')' : text,
			'card-radius': style.borderRadius, 'card-padding': parseFloat(style.padding) > 0 ? style.padding : '20px',
			'card-shadow': style.boxShadow, 'button-radius': action.borderRadius,
			'button-padding': action.padding, 'button-size': action.fontSize,
			'button-weight': action.fontWeight, 'button-line-height': action.lineHeight, 'control-radius': control.borderRadius,
			'control-bg': opaque(control.backgroundColor) ? control.backgroundColor : background,
			'control-line': control.borderTopColor, 'font': style.fontFamily,
			'font-size': style.fontSize };
		Object.keys(values).forEach(function(key) {
			var name = '--zgz-' + key;
			if (root.style.getPropertyValue(name) !== values[key]) {
				root.style.setProperty(name, values[key]);
				document.body.style.setProperty(name, values[key]);
			}
		});
		probe.remove();
		var rgb = panelPixels;
		var dark = rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) < 128 : false;
		root.classList.toggle('mk-dark', dark);
		document.body.classList.toggle('pwp-dark', dark);
		if (root.zgzPaintTheme) root.zgzPaintTheme();
		if (root.zgzSyncHeader) root.zgzSyncHeader();
	}
	poll.add(sync, 5);
	return sync;
}


return baseclass.extend({ attach: followTheme, mode: readTheme });
