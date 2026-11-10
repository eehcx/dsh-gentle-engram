import Schema from "@deepseek-ai/schemastery";

//#region src/config.d.ts

/** The plugin config, as cordis consumes it. */
declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
  binary: Schema<string, string, "defined">;
  url: Schema<string, string, "defined">;
  port: Schema<number, number, "defined">;
  ambientMemory: Schema<boolean, boolean, "defined">;
  contextLimit: Schema<number, number, "defined">;
  captureToolResults: Schema<boolean, boolean, "defined">;
  capturePrompts: Schema<boolean, boolean, "defined">;
  requestTimeoutMs: Schema<number, number, "defined">;
  startupTimeoutMs: Schema<number, number, "defined">;
  fetchMaxAttempts: Schema<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  binary: Schema<string, string, "defined">;
  url: Schema<string, string, "defined">;
  port: Schema<number, number, "defined">;
  ambientMemory: Schema<boolean, boolean, "defined">;
  contextLimit: Schema<number, number, "defined">;
  captureToolResults: Schema<boolean, boolean, "defined">;
  capturePrompts: Schema<boolean, boolean, "defined">;
  requestTimeoutMs: Schema<number, number, "defined">;
  startupTimeoutMs: Schema<number, number, "defined">;
  fetchMaxAttempts: Schema<number, number, "defined">;
}>>, "plain">;
/** Schema input: every field optional, unknown keys tolerated by the schema itself. */
type ConfigInput = Schemastery.TypeS<typeof Config>;
//#endregion
//#region src/index.d.ts
type JsonRecord = Record<string, unknown>;
type Agent = {
  id?: string;
  session?: {
    requestHeader?: () => {
      cwd?: string;
    };
    header?: {
      cwd?: string;
    };
  };
  inject: (message: UserMessage) => void;
};
type UserMessage = {
  id: string;
  role: 'user';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  source: {
    kind: 'plugin';
    plugin: string;
  };
};
type ToolResult = JsonRecord & {
  content?: unknown;
};
type ToolRegistry = {
  get: (name: string, agent?: Agent) => unknown;
  execute: (input: JsonRecord) => Promise<ToolResult>;
};
type CordisContext = {
  tools: ToolRegistry;
  logger?: {
    warn: (message: string) => void;
  };
  get: (name: string) => unknown;
  on: (event: string, listener: (...args: any[]) => unknown) => unknown;
  provide: (name: string, value: unknown) => unknown;
};
declare const name = "dsh-gentle-engram";
declare const inject: string[];
declare function apply(ctx: CordisContext, rawConfig?: ConfigInput): void;
//#endregion
export { Config, apply, inject, name };