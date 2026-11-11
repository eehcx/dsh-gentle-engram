window.__ModuleLoader__.load({ id: "dsh-gentle-engram", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n$1 = keys.length, key; i < n$1; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js
var require_react_production_min = /* @__PURE__ */ __commonJS({ "node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js": ((exports) => {
	var l = Symbol.for("react.element"), n = Symbol.for("react.portal"), p = Symbol.for("react.fragment"), q = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z = Symbol.iterator;
	var B = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, C = Object.assign, D = {};
	function E(a, b, e$1) {
		this.props = a;
		this.context = b;
		this.refs = D;
		this.updater = e$1 || B;
	}
	E.prototype.isReactComponent = {};
	E.prototype.setState = function(a, b) {
		if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, a, b, "setState");
	};
	E.prototype.forceUpdate = function(a) {
		this.updater.enqueueForceUpdate(this, a, "forceUpdate");
	};
	function F() {}
	F.prototype = E.prototype;
	function G(a, b, e$1) {
		this.props = a;
		this.context = b;
		this.refs = D;
		this.updater = e$1 || B;
	}
	var H = G.prototype = new F();
	H.constructor = G;
	C(H, E.prototype);
	H.isPureReactComponent = !0;
	var I = Array.isArray, J = Object.prototype.hasOwnProperty, K = { current: null }, L = {
		key: !0,
		ref: !0,
		__self: !0,
		__source: !0
	};
	function M(a, b, e$1) {
		var d, c = {}, k = null, h = null;
		if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
		var g = arguments.length - 2;
		if (1 === g) c.children = e$1;
		else if (1 < g) {
			for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
			c.children = f;
		}
		if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
		return {
			$$typeof: l,
			type: a,
			key: k,
			ref: h,
			props: c,
			_owner: K.current
		};
	}
	var U = { current: null }, V = { transition: null }, W = {
		ReactCurrentDispatcher: U,
		ReactCurrentBatchConfig: V,
		ReactCurrentOwner: K
	};
	exports.createElement = M;
	exports.useCallback = function(a, b) {
		return U.current.useCallback(a, b);
	};
	exports.useEffect = function(a, b) {
		return U.current.useEffect(a, b);
	};
	exports.useState = function(a) {
		return U.current.useState(a);
	};
}) });

//#endregion
//#region node_modules/.pnpm/react@18.3.1/node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJS({ "node_modules/.pnpm/react@18.3.1/node_modules/react/index.js": ((exports, module) => {
	module.exports = require_react_production_min();
}) });

//#endregion
//#region src/client.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
const e = import_react.createElement;
const name = "dsh-gentle-engram";
const inject = ["slots", "locale"];
const DEFAULT_SETTINGS = {
	ambientMemory: true,
	capturePrompts: true,
	captureToolResults: true,
	contextLimit: 8e3
};
const STORAGE_KEY = "dsh:engram:settings";
function loadSavedSettings() {
	try {
		if (typeof localStorage !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) return {
				...DEFAULT_SETTINGS,
				...JSON.parse(saved)
			};
		}
	} catch {}
	return DEFAULT_SETTINGS;
}
function saveSettings(settings) {
	try {
		if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {}
}
function EngramSettingsView(props) {
	const [health, setHealth] = (0, import_react.useState)({
		status: "checking",
		port: 7437
	});
	const [stats, setStats] = (0, import_react.useState)(null);
	const [settings, setSettings] = (0, import_react.useState)(loadSavedSettings);
	const [savedNotice, setSavedNotice] = (0, import_react.useState)(null);
	const checkServer = (0, import_react.useCallback)(async () => {
		setHealth((prev) => ({
			...prev,
			status: "checking"
		}));
		try {
			const res = await fetch("http://127.0.0.1:7437/health", { signal: AbortSignal.timeout(1500) });
			if (res.ok) {
				const data = await res.json();
				setHealth({
					status: "online",
					port: 7437,
					instanceId: data.instance_id,
					version: data.version ?? "3.6.2+"
				});
				try {
					const statsRes = await fetch("http://127.0.0.1:7437/stats", { signal: AbortSignal.timeout(1500) });
					if (statsRes.ok) {
						const statsData = await statsRes.json();
						setStats({
							projectsCount: typeof statsData.projects === "number" ? statsData.projects : void 0,
							observationsCount: typeof statsData.observations === "number" ? statsData.observations : void 0,
							sessionsCount: typeof statsData.sessions === "number" ? statsData.sessions : void 0
						});
					}
				} catch {}
				return;
			}
		} catch {}
		setHealth({
			status: "offline",
			port: 7437
		});
		setStats(null);
	}, []);
	(0, import_react.useEffect)(() => {
		checkServer();
	}, [checkServer]);
	const updateSetting = (key, value) => {
		setSettings((prev) => {
			const next = {
				...prev,
				[key]: value
			};
			saveSettings(next);
			try {
				if (props.ctx?.settingsScope) props.ctx.settingsScope.bind({ namespace: "engram" })?.update?.({ [key]: value });
			} catch {}
			return next;
		});
		setSavedNotice("Guardado automáticamente");
		setTimeout(() => setSavedNotice(null), 2500);
	};
	const renderToggle = (label, description, checked, onToggle) => {
		return e("div", { style: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "flex-start",
			padding: "12px 0",
			borderBottom: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.06))"
		} }, e("div", { style: { maxWidth: "80%" } }, e("div", { style: {
			fontWeight: 500,
			fontSize: "14px"
		} }, label), e("div", { style: {
			fontSize: "12px",
			color: "var(--dsw-alias-label-secondary, #a1a1aa)",
			marginTop: "4px",
			lineHeight: 1.4
		} }, description)), e("button", {
			role: "switch",
			"aria-checked": checked,
			onClick: onToggle,
			style: {
				cursor: "pointer",
				width: "44px",
				height: "24px",
				borderRadius: "12px",
				border: "none",
				background: checked ? "var(--dsw-alias-brand-primary, #3b82f6)" : "var(--dsw-alias-bg-layer-4, #52525b)",
				position: "relative",
				transition: "background 0.2s",
				flexShrink: 0
			}
		}, e("span", { style: {
			position: "absolute",
			top: "2px",
			left: checked ? "22px" : "2px",
			width: "20px",
			height: "20px",
			borderRadius: "50%",
			background: "#ffffff",
			transition: "left 0.2s"
		} })));
	};
	return e("div", { style: {
		display: "flex",
		flexDirection: "column",
		gap: "24px",
		padding: "24px",
		maxWidth: "720px",
		color: "var(--dsw-alias-label-primary, #f4f4f5)",
		fontFamily: "inherit"
	} }, e("div", { style: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "18px 20px",
		background: "var(--dsw-alias-bg-layer-3, #27272a)",
		borderRadius: "12px",
		border: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.1))"
	} }, e("div", null, e("div", { style: {
		display: "flex",
		alignItems: "center",
		gap: "10px"
	} }, e("h2", { style: {
		margin: 0,
		fontSize: "18px",
		fontWeight: 600
	} }, "Engram Persistent Memory"), e("span", { style: {
		display: "inline-flex",
		alignItems: "center",
		gap: "6px",
		padding: "3px 10px",
		borderRadius: "9999px",
		fontSize: "12px",
		fontWeight: 500,
		background: health.status === "online" ? "rgba(34, 197, 94, 0.15)" : health.status === "checking" ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
		color: health.status === "online" ? "#22c55e" : health.status === "checking" ? "#eab308" : "#ef4444"
	} }, e("span", { style: {
		width: "7px",
		height: "7px",
		borderRadius: "50%",
		background: health.status === "online" ? "#22c55e" : health.status === "checking" ? "#eab308" : "#ef4444"
	} }), health.status === "online" ? `HTTP Conectado (puerto ${health.port})` : health.status === "checking" ? "Comprobando..." : "Servidor HTTP inactivo (Puente MCP activo)")), e("p", { style: {
		margin: "6px 0 0",
		fontSize: "13px",
		color: "var(--dsw-alias-label-secondary, #a1a1aa)"
	} }, health.status === "online" ? `Instancia: ${health.instanceId ? health.instanceId.slice(0, 12) + "..." : "local"} · Versión: ${health.version ?? "activa"}` : "DSH ejecuta las herramientas mediante el puente MCP stdio de Engram. Puedes iniciar el servidor HTTP local con `engram serve` si requieres API web.")), e("button", {
		onClick: checkServer,
		style: {
			cursor: "pointer",
			padding: "8px 14px",
			fontSize: "12px",
			fontWeight: 500,
			borderRadius: "8px",
			background: "var(--dsw-alias-bg-layer-4, #3f3f46)",
			color: "inherit",
			border: "1px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.15))"
		}
	}, "Refrescar")), stats && e("div", { style: {
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: "12px"
	} }, e("div", { style: {
		padding: "14px",
		borderRadius: "10px",
		background: "var(--dsw-alias-bg-layer-3, #27272a)",
		border: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))"
	} }, e("div", { style: {
		fontSize: "12px",
		color: "var(--dsw-alias-label-secondary, #a1a1aa)"
	} }, "Proyectos Registrados"), e("div", { style: {
		fontSize: "20px",
		fontWeight: 600,
		marginTop: "4px"
	} }, stats.projectsCount ?? "—")), e("div", { style: {
		padding: "14px",
		borderRadius: "10px",
		background: "var(--dsw-alias-bg-layer-3, #27272a)",
		border: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))"
	} }, e("div", { style: {
		fontSize: "12px",
		color: "var(--dsw-alias-label-secondary, #a1a1aa)"
	} }, "Observaciones Guardadas"), e("div", { style: {
		fontSize: "20px",
		fontWeight: 600,
		marginTop: "4px"
	} }, stats.observationsCount ?? "—")), e("div", { style: {
		padding: "14px",
		borderRadius: "10px",
		background: "var(--dsw-alias-bg-layer-3, #27272a)",
		border: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))"
	} }, e("div", { style: {
		fontSize: "12px",
		color: "var(--dsw-alias-label-secondary, #a1a1aa)"
	} }, "Sesiones Registradas"), e("div", { style: {
		fontSize: "20px",
		fontWeight: 600,
		marginTop: "4px"
	} }, stats.sessionsCount ?? "—"))), e("div", { style: {
		display: "flex",
		flexDirection: "column",
		gap: "16px",
		background: "var(--dsw-alias-bg-layer-3, #27272a)",
		padding: "20px",
		borderRadius: "12px",
		border: "1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.1))"
	} }, e("div", { style: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center"
	} }, e("h3", { style: {
		margin: 0,
		fontSize: "15px",
		fontWeight: 600
	} }, "Comportamiento de Memoria"), savedNotice && e("span", { style: {
		fontSize: "12px",
		color: "#22c55e"
	} }, savedNotice)), renderToggle("Inyección de Memoria Inicial (ambientMemory)", "Inyecta automáticamente observaciones recientes al iniciar una sesión o tras compactación. Desactívalo para ahorrar tokens y recuperar memoria bajo demanda con mem_context o mem_search.", settings.ambientMemory, () => updateSetting("ambientMemory", !settings.ambientMemory)), renderToggle("Captura Automática de Prompts (capturePrompts)", "Registra los mensajes y peticiones del usuario en Engram para mantener el historial de intenciones entre sesiones.", settings.capturePrompts, () => updateSetting("capturePrompts", !settings.capturePrompts)), renderToggle("Captura Pasiva de Aprendizajes (captureToolResults)", "Extrae automáticamente hallazgos y notas estructuradas en encabezados ## Key Learnings: o ## Aprendizajes Clave:.", settings.captureToolResults, () => updateSetting("captureToolResults", !settings.captureToolResults)), e("div", { style: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "12px 0"
	} }, e("div", { style: { maxWidth: "80%" } }, e("div", { style: {
		fontWeight: 500,
		fontSize: "14px"
	} }, "Límite de Bytes de Contexto (contextLimit)"), e("div", { style: {
		fontSize: "12px",
		color: "var(--dsw-alias-label-secondary, #a1a1aa)",
		marginTop: "4px"
	} }, "Capacidad máxima del bloque inyectado (por defecto: 8000 bytes).")), e("input", {
		type: "number",
		min: 0,
		max: 1e5,
		step: 1e3,
		value: settings.contextLimit,
		onChange: (ev) => updateSetting("contextLimit", Number(ev.target.value) || 0),
		style: {
			width: "100px",
			padding: "6px 10px",
			borderRadius: "6px",
			border: "1px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.15))",
			background: "var(--dsw-alias-bg-layer-4, #3f3f46)",
			color: "inherit",
			fontSize: "13px",
			textAlign: "right"
		}
	}))), e("div", { style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "14px 18px",
		borderRadius: "10px",
		background: "rgba(59, 130, 246, 0.08)",
		border: "1px solid rgba(59, 130, 246, 0.2)",
		fontSize: "13px"
	} }, e("span", { style: { color: "var(--dsw-alias-label-secondary, #a1a1aa)" } }, "💡 ¿Deseas explorar o buscar recuerdos manualmente? Ejecuta ", e("code", null, "engram tui"), " en tu terminal.")));
}
function apply(ctx) {
	ctx.slots?.inject?.("settings.section", () => {
		return ctx.slots.register({
			name: "settings.section",
			id: "engram",
			order: 85,
			label: () => "Engram Memory",
			inject: () => ({ ctx })
		}, EngramSettingsView);
	});
	ctx.slots?.inject?.("settings.plugins.tab", () => {
		return ctx.slots.register({
			name: "settings.plugins.tab",
			id: "engram",
			order: 5,
			label: () => "Engram Memory",
			inject: () => ({ ctx })
		}, EngramSettingsView);
	});
}

//#endregion
exports.EngramSettingsView = EngramSettingsView;
exports.apply = apply;
exports.inject = inject;
exports.name = name;
return module.exports; } });