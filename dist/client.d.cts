window.__ModuleLoader__.load({ id: "dsh-gentle-engram", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
import React from "react";

//#region src/client.d.ts
declare const name = "dsh-gentle-engram";
declare const inject: string[];
declare function EngramSettingsView(props: {
  ctx?: any;
}): React.DetailedReactHTMLElement<{
  style: {
    display: "flex";
    flexDirection: "column";
    gap: string;
    padding: string;
    maxWidth: string;
    color: "var(--dsw-alias-label-primary, #f4f4f5)";
    fontFamily: "inherit";
  };
}, HTMLElement>;
declare function apply(ctx: any): void;
//#endregion
export { EngramSettingsView, apply, inject, name };
return module.exports; } });