export type Value = 
  | { kind: "string", value: string } 
  | { kind: "number", value:number } 
  | { kind: "boolean", value: boolean }

export function inject(name: string, body: () => unknown): void;
export function inject(name: string, body: (val: Value | undefined) => unknown): void;

export function inject(_name: string, _body: (() => unknown) | ((val: Value | undefined) => unknown)) { }