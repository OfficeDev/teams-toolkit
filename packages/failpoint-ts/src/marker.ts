export type Value = 
  | { kind: "string", value: string } 
  | { kind: "number", value:number } 
  | { kind: "boolean", value: boolean }

export function inject(_name: string, _body: (val: Value | undefined) => unknown) { }