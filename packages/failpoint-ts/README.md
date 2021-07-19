# `@microsoft/failpoint-ts`

> A fault injection library for TypeScript

## Overview
[Fault injection is a testing technique used in computer systems to test both hardware and software.  It is the deliberate introduction of faults into a system, and the subsequent examination of the system for the errors and failures that result.](https://users.ece.cmu.edu/~koopman/des_s99/fault_injection/index.html#introduction).
This library helps you to inject fault into TypeScript projects with zero(or close to zero) cost in production. 

## A naive approach to Fault Injection
Below is a contrived code snippet of what a normal remote API call looks like.
```typescript
let result = callRemoteAPI();

if (result.status !== "ok") {
	// handle the error
	return;
}
```
Services fail time to time in distrubuted systems, so we need to handle cases where `callRemoteAPI()` fails. In this example, we detect the error by checking `result.status`. A problem here is that in E2E/integration test, our code usually connects to an environment that is close to production one, which means we can't deliberately make `callRemoteAPI()` fail in E2E/integration tests to ensure every corner cases are fully tested.
This is where fault injection comes into play. We need a way to trigger failure in a human-controlled manner.
The idea of fault injection can be captured by the following code:
```typescript
function failpointActivated(name: string): boolean {
	let env = process.env["FAILPOINTS"];
	if (env !== undefined) {
		if (env.includes(name)) {
			return true;
		}
	}
	return false;
}

let result = callRemoteAPI();

if (failpointActivated("remoteAPIReturnsError")) {
	result.status = "error"
}

if (result.status !== "ok") {
	// handle the error
	return;
}
```
In its simplest form, fault injection can be implemented by introducing an if statement, whose body sets the result of `callRemoteAPI()` to error when its condition evaluates to true. But it introduces a new problem: The condition of this if statement should always evaluate to false in production. Its existence could hurt performance if we are running a service. It's also dangerous to ship user facing products with these if statements, because users' machines may accidentally define the same env variable that is used to trigger failpoints.

In conclusion, we need a way to define failpoints in tests, but theses failpoints should not be shipped in production. This is the main problem this library solves.

## Usage
### Basic Usage
This library allows you to define failpoint using `failpoint.inject()` instead of using a plain if statement.
```typescript
import * as failpointTs from "@microsoft/failpoint-ts";

let result = callRemoteAPI();

failpoint.inject("callRemoteAPIFailed", () => {
	result.status = "error";
});

if (result.status !== "ok") {
	// handle the error
	return;
}
```
`failpoint.inject()` is just a marker function. Its definition is quite simple:
```typescript
export function inject(failpointName: string, body: () => unknown): void {}
```
The function body of `failpoint.inject()` is deliberately empty, so that it can be shipped to production but imposes zero cost.
For testing build, this library provides an [TypeScript transformer](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#a-simple-transform-function), which edits TypeScript's AST and rewrites `failpoint.inject()` into a if statement before emitting JavaScript:
```typescript
let result = callRemoteAPI();

// source code
failpoint.inject("callRemoteAPIFailed", () => {
	result.status = "error";
});

// compiled to
if (failpoint.evaluate("callRemoteAPIFailed") !== undefined) {
	result.status = "error";
}
```
`failpoint.evaluate("callRemoteAPIFailed")` will check environment varaible `TEAMSFX_FAILPOINTS`'s value, and return whether failpoint "callRemoteAPIFailed" is actived. One can active it using:
```bash
TEAMSFX_FAILPOINTS="callRemoteAPIFailed" node ./index.js
```
### Inject Values
`failpoint.inject()` has another overload that allows you to inject runtime values controlled by `TEAMSFX_FAILPOINTS` environment variable:
```typescript
export type Value = 
  | { kind: "string", value: string } 
  | { kind: "number", value:number } 
  | { kind: "boolean", value: boolean }

export function inject(failpointName: string, body: (val: Value | undefined) => unknown): void {}
```
An example is shown blow:
```typescript
let result = callRemoteAPI();

// source code
failpoint.inject("callRemoteAPIFailed", (val: Value | undefined) => {
	if (val && val.kind === "string") {
		result.status = val.value;
	}
});

// compiled to
if (failpoint.evalute("callRemoteAPIFailed") !== undefined) {
	if (failpoint.evalute("callRemoteAPIFailed") && failpoint.evalute("callRemoteAPIFailed").kind === "string") {
		result.status = failpoint.evalute("callRemoteAPIFailed").value;
	}
}
```
Every `val` inside the failpoint `body` are replaced by `failpoint.evaluate("callRemoteAPIFailed")`
One can dynamically set `val` to `"error"` using:
```bash
TEAMSFX_FAILPOINTS="callRemoteAPIFailed=\"error\"" node ./index.js
```
### Syntax of TEAMSFX_FAILPOINTS environment vairable
Injecting ints:
`TEAMS_FAILPOINTS="failpointName=1"`

Injecting strings:
`TEAMS_FAILPOINTS="failpointName=\"error\""`

Injecting boolean:
`TEAMS_FAILPOINTS="failpointName=true"`
`TEAMS_FAILPOINTS="failpointName=false"`

As a shorthand, `TEAMS_FAILPOINTS="failpointName"` is equivalent to `TEAMS_FAILPOINTS="failpointName=true"`

Multiple failpoints are sperated using `;`:
`TEAMS_FAILPOINTS="failpoint1=false;failpiont2=true;failpint3=1"`

## How to build my component with failpoint activated
Please check fx-core and vscode-extension for examples. General steps are:
1. Add `ttypescript` (not a typo, typescript prepended by an extra t) to your devDependency using `npx lerna add ttypescript --dev --scope=your-package-name`
2. Add `@microsoft/failpoint-ts` to your devDependency using `npx lerna add @microsoft/failpoint-ts --dev --scope=your-package-name`
3. Add `"plugins": [{ "transform": "../failpoint-ts/transformer/transformer.ts" }]` to `compilerOptions` in `tsconfig.json`
4. Add `"build-failpoint": "npx ttsc -p ./"`

## How to build the whole world with failpoint actived
In TeamsFx's root folder, run `npm run setup-failpoint`. Every thing is setup and you are good to go.

## Known limitations
Currently, source map doesn't work for transformed code. So you may run into problems in debugging failpoint body.
This library does its best to preserve line numbers. So debugging code other than failpoint body still works.
## Acknowledgement
This library is greatly inspired by [pingcap/failpoint](https://github.com/pingcap/failpoint)