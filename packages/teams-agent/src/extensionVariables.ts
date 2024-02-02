/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ExtensionContext } from "vscode";
/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
  export let context: ExtensionContext;
  //export let ignoreBundle: boolean | undefined;
  //export const prefix: string = "teamsAgent";
}
