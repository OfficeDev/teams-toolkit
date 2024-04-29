// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
declare module "*.png";
declare module "*.svg";
declare module "*.gif";

declare const vscode: vscode;
declare const DOMPurify: {
  sanitize(source: string | Node): string;
};
declare const mermaid: {
  initialize: (configs?: { theme: string }) => void;
  run(): Promise<void>;
};
declare const panelType: string;
declare const containerType: string;
