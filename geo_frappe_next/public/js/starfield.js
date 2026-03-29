/**
 * Geo Jam Starfield — Animated warp/tunnel starfield canvas engine
 *
 * Usage:
 *   initGeoJamStarfield()   — inject canvas and start animation
 *   destroyGeoJamStarfield() — remove canvas and cancel animation
 */

(function (root) {
	"use strict";

	var STAR_COUNT = 200;
	var CANVAS_ID = "geo-jam-starfield";
	var FRAME_INTERVAL = 1000 / 30; // target 30 fps
	var animFrameId = null;
	var lastFrameTime = 0;
	var canvas = null;
	var ctx = null;
	var stars = [];
	var W = 0;
	var H = 0;
	var CX = 0; // center X
	var CY = 0; // center Y

	/** One star in the warp tunnel */
	function Star() {
		this.reset();
	}

	Star.prototype.reset = function () {
		// Start at a random angle and distance from center
		var angle = Math.random() * Math.PI * 2;
		var dist = Math.random() * 2; // start very close to center
		this.x = CX + Math.cos(angle) * dist;
		this.y = CY + Math.sin(angle) * dist;
		this.z = Math.random() * 1000; // depth: 0 = close, 1000 = far
		this.speed = 0.3 + Math.random() * 0.7; // outward speed multiplier
		// Direction vector from center
		this.dx = this.x - CX;
		this.dy = this.y - CY;
		// Normalize
		var len = Math.sqrt(this.dx * this.dx + this.dy * this.dy) || 1;
		this.dx /= len;
		this.dy /= len;
	};

	function initStars() {
		stars = [];
		for (var i = 0; i < STAR_COUNT; i++) {
			var s = new Star();
			// Spread them across the screen initially rather than all starting at center
			s.x = Math.random() * W;
			s.y = Math.random() * H;
			s.dx = (s.x - CX) || 0.1;
			s.dy = (s.y - CY) || 0.1;
			var len = Math.sqrt(s.dx * s.dx + s.dy * s.dy) || 1;
			s.dx /= len;
			s.dy /= len;
			stars.push(s);
		}
	}

	function resizeCanvas() {
		W = canvas.width = window.innerWidth;
		H = canvas.height = window.innerHeight;
		CX = W / 2;
		CY = H / 2;
	}

	function animate(now) {
		if (!canvas) return;

		animFrameId = requestAnimationFrame(animate);

		// Time-based throttle to ~30 fps
		if (now - lastFrameTime < FRAME_INTERVAL) return;
		lastFrameTime = now;
		ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
		ctx.fillRect(0, 0, W, H);

		for (var i = 0; i < stars.length; i++) {
			var s = stars[i];

			// Move star outward from center
			var speed = s.speed * (1 - s.z / 1000) * 2.5 + 0.4;
			s.x += s.dx * speed;
			s.y += s.dy * speed;
			s.z -= speed * 0.8;

			// Reset if star leaves canvas or gets too close (z ≤ 0)
			if (s.z <= 0 || s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) {
				// Assign new star at center
				s.z = 900 + Math.random() * 100;
				var angle = Math.random() * Math.PI * 2;
				var dist = Math.random() * 3;
				s.x = CX + Math.cos(angle) * dist;
				s.y = CY + Math.sin(angle) * dist;
				s.dx = Math.cos(angle);
				s.dy = Math.sin(angle);
				s.speed = 0.3 + Math.random() * 0.7;
			}

			// Size and brightness scale with depth (closer = larger/brighter)
			var depth = 1 - s.z / 1000; // 0 (far) → 1 (close)
			var size = 0.5 + depth * 2.5; // 0.5px → 3px
			var alpha = 0.3 + depth * 0.7; // 0.3 → 1.0

			// Color: white or pale cyan
			var color = depth > 0.7 ? "rgba(224, 255, 255, " + alpha + ")" : "rgba(255, 255, 255, " + alpha + ")";

			ctx.beginPath();
			ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		}
	}

	function initGeoJamStarfield() {
		// Remove any existing canvas first
		destroyGeoJamStarfield();

		canvas = document.createElement("canvas");
		canvas.id = CANVAS_ID;

		// Inject as very first child of body
		document.body.insertBefore(canvas, document.body.firstChild);

		ctx = canvas.getContext("2d");
		resizeCanvas();
		initStars();

		// Fill initial black background
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, W, H);

		// Listen for resize
		window._geoJamResizeHandler = function () {
			resizeCanvas();
		};
		window.addEventListener("resize", window._geoJamResizeHandler);

		// Start animation loop
		animate(0);
	}

	function destroyGeoJamStarfield() {
		if (animFrameId !== null) {
			cancelAnimationFrame(animFrameId);
			animFrameId = null;
		}
		var existing = document.getElementById(CANVAS_ID);
		if (existing) {
			existing.parentNode.removeChild(existing);
		}
		canvas = null;
		ctx = null;
		stars = [];
		if (window._geoJamResizeHandler) {
			window.removeEventListener("resize", window._geoJamResizeHandler);
			window._geoJamResizeHandler = null;
		}
	}

	// Expose to global scope
	root.initGeoJamStarfield = initGeoJamStarfield;
	root.destroyGeoJamStarfield = destroyGeoJamStarfield;
})(window);
