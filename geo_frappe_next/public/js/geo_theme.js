/**
 * Geo Theme Engine — per-user theme switcher for geo_frappe_next
 *
 * Themes:
 *   geo-light   — Geo Light
 *   geo-dark    — Geo Dark
 *   geo-ocean   — Geo Ocean
 *   geo-sunset  — Geo Sunset
 *   geo-forest  — Geo Forest
 *   geo-jam     — Geo Jam (Space Jam '96)
 */

(function () {
	"use strict";

	var ATTR = "data-geo-theme";
	var STORAGE_KEY = "geo_theme";
	var DARK_THEMES = ["geo-dark", "geo-ocean", "geo-jam"];

	var GEO_THEMES = [
		{ value: "geo-light", label: "🌤 Geo Light" },
		{ value: "geo-dark", label: "🌑 Geo Dark" },
		{ value: "geo-ocean", label: "🌊 Geo Ocean" },
		{ value: "geo-sunset", label: "🌇 Geo Sunset" },
		{ value: "geo-forest", label: "🌲 Geo Forest" },
		{ value: "geo-jam", label: "🏀 Geo Jam" },
	];

	// -----------------------------------------------------------------------
	// Starfield lifecycle
	// -----------------------------------------------------------------------
	function startStarfield() {
		if (typeof window.initGeoJamStarfield === "function") {
			window.initGeoJamStarfield();
		}
	}

	function stopStarfield() {
		if (typeof window.destroyGeoJamStarfield === "function") {
			window.destroyGeoJamStarfield();
		}
	}

	// -----------------------------------------------------------------------
	// Apply theme to <html> element
	// -----------------------------------------------------------------------
	function applyTheme(themeValue) {
		var html = document.documentElement;

		// Remove old theme
		html.removeAttribute(ATTR);

		// Stop starfield if switching away from geo-jam
		stopStarfield();

		if (!themeValue || themeValue === "default") {
			// Restore Frappe default
			html.removeAttribute("data-theme-mode");
			return;
		}

		html.setAttribute(ATTR, themeValue);

		// Set dark mode attribute so Frappe charts/modals respect dark styling
		if (DARK_THEMES.indexOf(themeValue) !== -1) {
			html.setAttribute("data-theme-mode", "dark");
		} else {
			html.removeAttribute("data-theme-mode");
		}

		// Start starfield for Geo Jam
		if (themeValue === "geo-jam") {
			startStarfield();
		}
	}

	// -----------------------------------------------------------------------
	// Persist theme selection
	// -----------------------------------------------------------------------
	function saveTheme(themeValue) {
		try {
			localStorage.setItem(STORAGE_KEY, themeValue || "");
		} catch (e) {
			// localStorage may be blocked in some contexts
		}

		// Persist to server if Frappe is available
		if (
			typeof frappe !== "undefined" &&
			frappe.call &&
			typeof frappe.session !== "undefined" &&
			frappe.session.user &&
			frappe.session.user !== "Guest"
		) {
			frappe.call({
				method: "geo_frappe_next.api.set_user_theme",
				args: { theme: themeValue || "" },
				freeze: false,
				callback: function () {}, // fire-and-forget
			});
		}
	}

	function loadTheme() {
		// 1. Try frappe.boot (synchronous, injected server-side — fastest, no flicker)
		if (typeof frappe !== "undefined" && frappe.boot && frappe.boot.geo_theme) {
			applyTheme(frappe.boot.geo_theme);
			// Keep localStorage in sync
			try { localStorage.setItem(STORAGE_KEY, frappe.boot.geo_theme); } catch(e) { console.warn("Geo Theme: failed to sync to localStorage", e); }
			return;
		}

		// 2. Fall back to localStorage for immediate paint
		var stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			applyTheme(stored);
			return;
		}

		// 3. Last resort: async API call (handles edge cases where boot data is missing)
		if (
			typeof frappe !== "undefined" &&
			frappe.call &&
			typeof frappe.session !== "undefined" &&
			frappe.session.user &&
			frappe.session.user !== "Guest"
		) {
			frappe.call({
				method: "geo_frappe_next.api.get_user_theme",
				freeze: false,
				callback: function (r) {
					var theme = r && r.message ? r.message : "";
					if (theme) {
						applyTheme(theme);
						try { localStorage.setItem(STORAGE_KEY, theme); } catch(e) { console.warn("Geo Theme: failed to sync to localStorage", e); }
					}
				},
			});
		}
	}

	// -----------------------------------------------------------------------
	// Theme picker UI injected into Frappe's navbar user dropdown
	// -----------------------------------------------------------------------
	function buildThemePicker() {
		var wrapper = document.createElement("div");
		wrapper.className = "geo-theme-picker";
		wrapper.style.cssText =
			"padding: 6px 12px; border-top: 1px solid var(--border-color, #ccc); margin-top: 4px;";

		var label = document.createElement("div");
		label.textContent = "🎨 Geo Theme";
		label.style.cssText = "font-size: 11px; color: var(--text-muted, #888); margin-bottom: 4px; font-weight: 600;";
		wrapper.appendChild(label);

		var select = document.createElement("select");
		select.style.cssText =
			"width: 100%; font-size: 12px; padding: 2px 4px; border-radius: 4px;" +
			"background: var(--control-bg, #fff); color: var(--text-color, #333);" +
			"border: 1px solid var(--border-color, #ccc); cursor: pointer;";

		var defaultOpt = document.createElement("option");
		defaultOpt.value = "";
		defaultOpt.textContent = "— Frappe Default —";
		select.appendChild(defaultOpt);

		GEO_THEMES.forEach(function (t) {
			var opt = document.createElement("option");
			opt.value = t.value;
			opt.textContent = t.label;
			select.appendChild(opt);
		});

		// Reflect current theme in the select
		var currentTheme = document.documentElement.getAttribute(ATTR) || "";
		select.value = currentTheme;

		select.addEventListener("change", function () {
			var chosen = select.value;
			applyTheme(chosen);
			saveTheme(chosen);
		});

		wrapper.appendChild(select);
		return wrapper;
	}

	function injectThemePicker() {
		// Look for the user dropdown menu in Frappe's navbar
		var dropdownMenu = document.querySelector(
			".navbar .dropdown-menu.user-menu, " +
			".navbar .dropdown-menu[id*='navbar-user'], " +
			"#navbar-user .dropdown-menu, " +
			".nav-item.dropdown .dropdown-menu"
		);
		if (!dropdownMenu) return;

		// Don't inject twice
		if (dropdownMenu.querySelector(".geo-theme-picker")) return;

		dropdownMenu.appendChild(buildThemePicker());
	}

	// -----------------------------------------------------------------------
	// Expose public API
	// -----------------------------------------------------------------------
	window.GeoTheme = {
		apply: applyTheme,
		save: saveTheme,
		load: loadTheme,
		themes: GEO_THEMES,
	};

	// -----------------------------------------------------------------------
	// Boot — wait for Frappe desk to be ready, then load theme and inject UI
	// -----------------------------------------------------------------------
	function boot() {
		// Apply immediately — frappe.boot is available synchronously at this point
		loadTheme();

		if (typeof frappe !== "undefined" && frappe.after_ajax) {
			frappe.after_ajax(function () {
				injectThemePicker();
			});
		}

		document.addEventListener("frappe-desk-ready", injectThemePicker);

		if (window.MutationObserver) {
			var observer = new MutationObserver(function () {
				var dropdown = document.querySelector(
					".navbar .dropdown-menu.user-menu, " +
					".navbar .dropdown-menu[id*='navbar-user'], " +
					"#navbar-user .dropdown-menu, " +
					".nav-item.dropdown .dropdown-menu"
				);
				if (dropdown) {
					injectThemePicker();
					observer.disconnect();
				}
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot);
	} else {
		boot();
	}
})();
