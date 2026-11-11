window.__ModuleLoader__.load({ id: "dsh-gentle-engram", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
import React from "react";

//#region src/client.d.ts
declare const name = "dsh-gentle-engram";
declare const inject: string[];
declare const settingsUiCss = "\n.engram-settings { color-scheme: light; }\nbody[data-ds-dark-theme] .engram-settings { color-scheme: dark; }\n.engram-settings button:hover:not(:disabled):not([role=\"switch\"]) { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-3)); }\n.engram-settings button:active:not(:disabled):not([role=\"switch\"]) { background: var(--dsw-alias-interactive-bg-active, var(--dsw-alias-bg-layer-3)); }\n.engram-settings button:disabled { opacity: .45; cursor: default; }\n.engram-settings button:focus-visible,\n.engram-settings input:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary))); outline-offset: 2px; }\n.engram-settings input[type=\"checkbox\"] { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }\n.engram-settings input[type=\"number\"] { width: 104px; padding: 0 10px; text-align: right; font-variant-numeric: tabular-nums; }\n.engram-settings [role=\"switch\"] { width: 36px; height: 20px; padding: 0; border: 0; border-radius: 999px; background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1)); position: relative; }\n.engram-settings [role=\"switch\"][aria-checked=\"true\"] { background: var(--dsw-alias-brand-primary); }\n.engram-settings [role=\"switch\"] span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--dsw-alias-label-primary-foreground, var(--dsw-alias-bg-layer-1)); transition: transform 150ms ease-out; }\n.engram-settings [role=\"switch\"][aria-checked=\"true\"] span { transform: translateX(16px); }\n.engram-settings [role=\"status\"] { color: var(--dsw-alias-state-success-primary); font-size: 12px; }\n.engram-settings .engram-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }\n.engram-settings .engram-stat { padding: 0 14px; border-right: .5px solid var(--dsw-alias-border-l2); }\n.engram-settings .engram-stat:first-child { padding-left: 0; }\n.engram-settings .engram-stat:last-child { padding-right: 0; border-right: 0; }\n.engram-settings .engram-stat-label { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }\n.engram-settings .engram-stat-value { margin-top: 2px; font-size: 16px; line-height: 24px; font-weight: 500; font-variant-numeric: tabular-nums; }\n@media (max-width: 520px) {\n  .engram-settings .engram-stats { grid-template-columns: 1fr; gap: 10px; }\n  .engram-settings .engram-stat, .engram-settings .engram-stat:first-child, .engram-settings .engram-stat:last-child { padding: 0; border: 0; }\n  .engram-settings .engram-stat { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }\n}\n@media (prefers-reduced-motion: reduce) { .engram-settings [role=\"switch\"] span { transition: none; } }\n";
declare function EngramSettingsView(props: {
  ctx?: any;
}): React.ReactElement<{
  className: string;
  style: {
    display: string;
    flexDirection: string;
    gap: string;
    width: string;
    maxWidth: string;
    color: string;
    fontFamily: string;
    fontSize: string;
    lineHeight: number;
  };
}, string | React.JSXElementConstructor<any>>;
declare function apply(ctx: any): void;
//#endregion
export { EngramSettingsView, apply, inject, name, settingsUiCss };
return module.exports; } });