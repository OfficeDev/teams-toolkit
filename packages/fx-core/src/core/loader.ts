// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { err, FxError, ok, ConfigFolderName, Result, Solution } from "fx-api";

import { Default } from "../plugins/solution/fx-solution";

export interface Meta {
  name: string;
  displayName: string;
  version: string;
}

export class Loader {
  /*
   * This is our contract that each plugin & solution should follow this prefix.
   */
  public static PLUGIN_PREFIX = `${ConfigFolderName}-resource-`;
  public static SOLUTION_PREFIX = `${ConfigFolderName}-solution-`;

  /*
   * TODO @Long
   * We implement this method with specific solutions instead of dynamically loading for 3.19.
   */
  public static async loadSolutions(): Promise<
    Result<Map<string, Solution & Meta>, FxError>
  > {
    const resources: Map<string, Solution & Meta> = new Map();
    const result = await Default();
    if (result.isErr()) {
      return err(result.error);
    }
    const as = Object.assign(result.value, {
      name: "fx-solution-azure",
      displayName: "azure",
      version: "1.0.0",
    });
    resources.set("fx-solution-azure", as);
    return ok(resources);
  }
}
