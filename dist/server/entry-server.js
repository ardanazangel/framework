//#region src/pages/home.html?raw
var home_default = "<section id=\"home-wrapper\">\n  <h1 class=\"chars\"><span>Fwk*</span><br /><span>26'</span></h1>\n  <div class=\"paragraph\">\n    <p class=\"lines\">\n      Lightweight SPA framework for Vite with a single-page entry and simple\n      client-side routing.\n    </p>\n  </div>\n</section>\n";
//#endregion
//#region src/pages/about.html?raw
var about_default = "<section class=\"hero\">\n  <h1 class=\"chars\">About <a href=\"\">testing</a></h1>\n  <p class=\"lines\">\n    A minimal SPA framework built for creative devs who want full control\n    over motion, scroll, and Three.js — without the overhead.\n  </p>\n</section>\n\n<section class=\"intro\">\n  <h2 class=\"chars\">Philosophy</h2>\n  <p class=\"lines\">\n    One RAF loop. One renderer. Sections that know where they live.\n    No wrappers, no virtual DOM, no magic. Just code you can read.\n    The scroll engine is 60 lines. The RAF is 15. The router is 150.\n    Every piece is replaceable.\n  </p>\n  <p class=\"lines\" style=\"margin-top:2rem;\">\n    We believe frameworks should disappear into the project.\n    Not the other way around.\n  </p>\n</section>\n\n<section class=\"stack\">\n  <h2 class=\"chars\">Stack</h2>\n  <ul>\n    <li>Vite + vanilla JS/TS — no build magic you can't explain</li>\n    <li>Three.js WebGPU — one renderer, per-page scenes, shared camera</li>\n    <li>Custom fake-scroll engine — damp frame-rate independent, virtualized sections</li>\n    <li>SSR / SSG via NDJSON streaming — body first, cache second</li>\n    <li>SPA router — clip-path transitions, prefetch, 15s safety valve</li>\n    <li>Loader — tracks images + Three.js textures, numeric progress</li>\n  </ul>\n</section>\n\n<section class=\"principles\">\n  <h2 class=\"chars\">Principles</h2>\n  <p class=\"lines\" >\n    No abstraction without a reason. No dependency you didn't choose.\n    No lifecycle you can't follow by reading entry-client.js top to bottom.\n  </p>\n  <p class=\"lines\">\n    The scroll engine doesn't know about Three.js.\n    Three.js doesn't know about the router.\n    The router doesn't know about scroll.\n    Each piece does one thing.\n  </p>\n  <p class=\"lines\">\n    When something breaks, you know where to look.\n  </p>\n</section>\n\n<section class=\"footer\">\n  <h2 class=\"chars\">Built in 2026</h2>\n  <p class=\"lines\">\n    No dependencies you didn't ask for.\n    No conventions you can't override.\n    No magic you can't delete.\n  </p>\n  <a href=\"/\">← Home</a>\n</section>\n";
//#endregion
//#region src/pages/contact.html?raw
var contact_default = "<section class=\"container\">\n  <h1 class=\"chars\">Contact</h1>\n  <form data-form=\"contact\" class=\"form\" novalidate></form>\n  <a href=\"/\">Home</a>\n</section>\n";
//#endregion
//#region src/pages/morphing.html?raw
var morphing_default = "<h1>Morphing letters</h1>\n\n<svg\n  width=\"200\"\n  height=\"200\"\n  viewBox=\"0 0 200 200\"\n  fill=\"none\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n>\n  <path\n    d=\"M104.736 57.12C97.056 64.288 83.488 65.568 67.616 65.568V43.04C98.848 42.272 108.064 32.8 110.368 11.552H132.384V188.448H104.736V57.12Z\"\n    id=\"A\"\n    fill=\"black\"\n  />\n</svg>\n";
//#endregion
//#region src/pages/slider.html?raw
var slider_default = "<section class=\"slider-section\">\n  <div class=\"slider-wrapper\" data-slider>\n    <div class=\"slide\"><span>01</span><small data-pv></small></div>\n    <div class=\"slide\"><span>02</span><small data-pv></small></div>\n    <div class=\"slide\"><span>03</span><small data-pv></small></div>\n    <div class=\"slide\"><span>04</span><small data-pv></small></div>\n    <div class=\"slide\"><span>05</span><small data-pv></small></div>\n    <div class=\"slide\"><span>06</span><small data-pv></small></div>\n    <div class=\"slide\"><span>07</span><small data-pv></small></div>\n    <div class=\"slide\"><span>08</span><small data-pv></small></div>\n    <div class=\"slide\"><span>09</span><small data-pv></small></div>\n    <div class=\"slide\"><span>10</span><small data-pv></small></div>\n    <div class=\"slide\"><span>11</span><small data-pv></small></div>\n    <div class=\"slide\"><span>12</span><small data-pv></small></div>\n    <div class=\"slide\"><span>13</span><small data-pv></small></div>\n    <div class=\"slide\"><span>14</span><small data-pv></small></div>\n  </div>\n  <div class=\"slider-ui\">\n    <button class=\"slider-btn\" data-prev>←</button>\n    <div class=\"slider-progress\">\n      <div class=\"slider-progress-fill\"></div>\n    </div>\n    <button class=\"slider-btn\" data-next>→</button>\n  </div>\n</section>\n";
//#endregion
//#region src/layout.html?raw
var layout_default = "<nav>\n  <a href=\"/\">Home</a>\n  <a href=\"/about\">About</a>\n  <a href=\"/nike\">Nike</a>\n  <a href=\"/sony\">Sony</a>\n  <a href=\"/apple\">Apple</a>\n  <a href=\"/morphing\">Morphing</a>\n</nav>\n";
//#endregion
//#region src/core/split-engine/text-split.js
var INLINE_TAGS = new Set([
	"a",
	"i",
	"b",
	"em",
	"strong",
	"span",
	"u",
	"s"
]);
function tagName(tag) {
	return tag.match(/<\/?([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase() ?? "";
}
function wrapWord(word) {
	return `<span class="word"><span class="word-inner">${word}</span></span>`;
}
function wrapChar(ch) {
	return `<span class="char"><span class="char-inner">${ch}</span></span>`;
}
function tokenize(html) {
	const tokens = [];
	let i = 0;
	while (i < html.length) if (html[i] !== "<") {
		const end = html.indexOf("<", i);
		tokens.push({
			type: "text",
			value: html.slice(i, end === -1 ? html.length : end)
		});
		i = end === -1 ? html.length : end;
	} else {
		const end = html.indexOf(">", i) + 1;
		const raw = html.slice(i, end);
		const closing = raw[1] === "/";
		const selfClosing = raw[raw.length - 2] === "/";
		const name = tagName(raw);
		tokens.push({
			type: "tag",
			value: raw,
			closing,
			selfClosing,
			name
		});
		i = end;
	}
	return tokens;
}
function splitWordsText(text) {
	return text.replace(/(\S+)/g, wrapWord);
}
function splitCharsText(text) {
	return [...text].map((ch) => ch === " " ? " " : wrapChar(ch)).join("");
}
function processTokens(tokens, mode) {
	const out = [];
	let i = 0;
	while (i < tokens.length) {
		const t = tokens[i];
		if (t.type === "text") {
			out.push(mode === "words" ? splitWordsText(t.value) : splitCharsText(t.value));
			i++;
		} else if (t.type === "tag" && !t.closing && !t.selfClosing && INLINE_TAGS.has(t.name)) {
			const openTag = t.value;
			const inner = [];
			let depth = 1;
			i++;
			while (i < tokens.length && depth > 0) {
				const cur = tokens[i];
				if (cur.type === "tag" && cur.name === t.name) if (cur.closing) depth--;
				else depth++;
				if (depth > 0) inner.push(cur);
				i++;
			}
			const closeTag = `</${t.name}>`;
			out.push(openTag + processTokens(inner, mode) + closeTag);
		} else {
			out.push(t.value);
			i++;
		}
	}
	return out.join("");
}
function splitText(html) {
	if (!/\b(words|chars)\b/.test(html)) return html;
	const tokens = tokenize(html);
	const out = [];
	let i = 0;
	let mode = null;
	let depth = 0;
	let innerTokens = [];
	while (i < tokens.length) {
		const t = tokens[i];
		if (!mode) {
			if (t.type === "tag" && !t.closing && !t.selfClosing) {
				if (/\bwords\b/.test(t.value)) {
					mode = "words";
					depth = 1;
					innerTokens = [];
					out.push(t.value);
					i++;
					continue;
				}
				if (/\bchars\b/.test(t.value)) {
					mode = "chars";
					depth = 1;
					innerTokens = [];
					out.push(t.value);
					i++;
					continue;
				}
			}
			out.push(t.value);
		} else {
			if (t.type === "tag" && !t.selfClosing) if (!t.closing) depth++;
			else depth--;
			if (depth === 0) {
				out.push(processTokens(innerTokens, mode));
				out.push(t.value);
				mode = null;
				innerTokens = [];
			} else innerTokens.push(t);
		}
		i++;
	}
	return out.join("");
}
//#endregion
//#region src/data/projects.js
var projects = [
	{
		slug: "nike",
		title: "Nike",
		year: 2024,
		prefetch: true,
		imgs: [
			"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=2400",
			"https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=2400",
			"https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=2400",
			"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=2400",
			"https://images.unsplash.com/photo-1539185441755-769473a23570?w=2400"
		]
	},
	{
		slug: "sony",
		title: "Sony",
		year: 2023,
		prefetch: true,
		imgs: [
			"https://images.unsplash.com/photo-1588508065123-287b28e013da?w=2400",
			"https://images.unsplash.com/photo-1484704849700-f032a568e944?w=2400",
			"https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=2400",
			"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=2400",
			"https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=2400",
			"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=2400"
		]
	},
	{
		slug: "apple",
		title: "Apple",
		year: 2022,
		prefetch: true,
		imgs: [
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=2400",
			"https://images.unsplash.com/photo-1569770218135-bea267ed7e84?w=2400",
			"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=2400",
			"https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=2400",
			"https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=2400"
		]
	}
];
//#endregion
//#region src/core/form-engine/render.js
function renderField(field) {
	const { name, type, label, required, minLength, maxLength, min, max, pattern, options } = field;
	const attrs = [
		`name="${name}"`,
		`id="field-${name}"`,
		required ? "required" : "",
		minLength ? `minlength="${minLength}"` : "",
		maxLength ? `maxlength="${maxLength}"` : "",
		min != null ? `min="${min}"` : "",
		max != null ? `max="${max}"` : "",
		pattern ? `pattern="${pattern}"` : ""
	].filter(Boolean).join(" ");
	let input;
	if (type === "textarea") input = `<textarea ${attrs}></textarea>`;
	else if (type === "select") input = `<select ${attrs}><option value="">— Select —</option>${(options ?? []).map((o) => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`;
	else if (type === "checkbox") input = `<input type="checkbox" name="${name}" id="field-${name}" value="on"${required ? " required" : ""}>`;
	else input = `<input type="${type}" ${attrs}>`;
	return `<div class="form-field" data-name="${name}">
  <label for="field-${name}">${label}</label>
  ${input}
  <span class="form-error" aria-live="polite"></span>
</div>`;
}
function renderForm(schema) {
	return `${schema.fields.map(renderField).join("\n")}
<button type="submit" class="form-submit">Send</button>
<p class="form-status" aria-live="polite"></p>`;
}
//#endregion
//#region src/core/form-engine/schemas.js
var schemas = {
	contact: {
		action: "/api/contact",
		fields: [
			{
				name: "name",
				type: "text",
				label: "Name",
				required: true
			},
			{
				name: "email",
				type: "email",
				label: "Email",
				required: true
			},
			{
				name: "message",
				type: "textarea",
				label: "Message",
				required: true,
				minLength: 10
			}
		]
	},
	login: {
		action: "/api/login",
		fields: [{
			name: "email",
			type: "email",
			label: "Email",
			required: true
		}, {
			name: "password",
			type: "password",
			label: "Password",
			required: true,
			minLength: 8
		}]
	},
	search: {
		action: "/api/search",
		fields: [{
			name: "query",
			type: "text",
			label: "Search",
			required: true
		}]
	},
	signup: {
		action: "/api/signup",
		fields: [
			{
				name: "email",
				type: "email",
				label: "Email",
				required: true
			},
			{
				name: "password",
				type: "password",
				label: "Password",
				required: true,
				minLength: 8
			},
			{
				name: "confirmPassword",
				type: "password",
				label: "Confirm Password",
				required: true,
				minLength: 8,
				match: "password"
			},
			{
				name: "agreeTerms",
				type: "checkbox",
				label: "I agree to the terms and conditions",
				required: true
			}
		]
	},
	newsletter: {
		action: "/api/newsletter",
		fields: [{
			name: "email",
			type: "email",
			label: "Email",
			required: true
		}, {
			name: "frequency",
			type: "select",
			label: "Frequency",
			required: true,
			options: [
				{
					value: "daily",
					label: "Daily"
				},
				{
					value: "weekly",
					label: "Weekly"
				},
				{
					value: "monthly",
					label: "Monthly"
				}
			]
		}]
	},
	profile: {
		action: "/api/profile",
		fields: [
			{
				name: "fullName",
				type: "text",
				label: "Full Name",
				required: true
			},
			{
				name: "email",
				type: "email",
				label: "Email",
				required: true
			},
			{
				name: "phone",
				type: "tel",
				label: "Phone",
				pattern: "^[\\d\\s+\\-()]+$"
			},
			{
				name: "bio",
				type: "textarea",
				label: "Bio",
				maxLength: 500
			}
		]
	},
	feedback: {
		action: "/api/feedback",
		fields: [
			{
				name: "rating",
				type: "select",
				label: "Rating",
				required: true,
				options: [
					{
						value: "5",
						label: "5 - Excellent"
					},
					{
						value: "4",
						label: "4 - Good"
					},
					{
						value: "3",
						label: "3 - Average"
					},
					{
						value: "2",
						label: "2 - Poor"
					},
					{
						value: "1",
						label: "1 - Very Poor"
					}
				]
			},
			{
				name: "category",
				type: "select",
				label: "Category",
				required: true,
				options: [
					{
						value: "bug",
						label: "Bug Report"
					},
					{
						value: "feature",
						label: "Feature Request"
					},
					{
						value: "general",
						label: "General Feedback"
					}
				]
			},
			{
				name: "comment",
				type: "textarea",
				label: "Comment",
				required: true,
				minLength: 10,
				maxLength: 1e3
			}
		]
	}
};
//#endregion
//#region src/core/form-engine/validate.js
function validate(field, value, allValues = {}) {
	if (field.required && !value.trim()) return `${field.label} is required`;
	if (!value) return null;
	if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
	if (field.minLength && value.length < field.minLength) return `Minimum ${field.minLength} characters`;
	if (field.maxLength && value.length > field.maxLength) return `Maximum ${field.maxLength} characters`;
	if (field.pattern && !new RegExp(field.pattern).test(value)) return `${field.label} format is invalid`;
	if (field.min != null && Number(value) < field.min) return `Minimum value is ${field.min}`;
	if (field.max != null && Number(value) > field.max) return `Maximum value is ${field.max}`;
	if (field.match && allValues[field.match] !== value) return `${field.label} does not match`;
	return null;
}
//#endregion
//#region src/entry-server.js
function injectForms(html) {
	return html.replace(/(<form[^>]*\sdata-form="([^"]+)"[^>]*>)[\s\S]*?(<\/form>)/g, (_, open, name, close) => {
		const schema = schemas[name];
		if (!schema) {
			console.warn(`[form] no schema found for "${name}"`);
			return _;
		}
		return `${open}\n${renderForm(schema)}\n${close}`;
	});
}
var projectPage = (p) => `
  <section>
    <h1 class="chars">${p.title}</h1>
    <p>${p.year}</p>
    </section>
      ${p.imgs.map((src) => `<section><img src="${src}" loading="lazy" width="2400" height="1600"></section>`).join("\n  ")}
    <section>
    <video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" loading="lazy" width="1920" height="1080" loop muted playsinline controls></video>
    <a href="/">← Back</a>
  </section>
`;
var routeConfig = {
	"/": {
		html: home_default,
		title: "Home",
		type: "home",
		prefetch: true
	},
	"/about": {
		html: about_default,
		title: "About",
		type: "about",
		prefetch: true
	},
	"/contact": {
		html: contact_default,
		title: "Contact",
		type: "contact"
	},
	"/morphing": {
		html: morphing_default,
		title: "Morphing",
		type: "morphing"
	},
	"/slider": {
		html: slider_default,
		title: "Slider",
		type: "slider"
	}
};
var processedRoutes = Object.fromEntries(Object.entries(routeConfig).map(([url, { html, title, prefetch }]) => [url, {
	body: splitText(injectForms(html)),
	title,
	...prefetch && { prefetch }
}]));
for (const p of projects) processedRoutes[`/${p.slug}`] = {
	body: splitText(projectPage(p)),
	title: p.title,
	prefetch: true
};
var routes = {
	...Object.fromEntries(Object.entries(routeConfig).map(([path, { type }]) => [path, type])),
	...Object.fromEntries(projects.map((p) => [`/${p.slug}`, "project"]))
};
var page404 = {
	body: "<section><h1>404</h1><p>Page not found</p><a href=\"/\">← Home</a></section>",
	title: "404"
};
function render(url) {
	return processedRoutes[url] ?? page404;
}
function renderAll() {
	return Object.fromEntries(Object.keys(processedRoutes).map((url) => [url, render(url)]));
}
//#endregion
export { layout_default as layout, render, renderAll, routes, schemas, validate };
