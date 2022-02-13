// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";

export class AzDoProvider extends CICDProvider {
  private static instance: AzDoProvider;
  static getInstance() {
    if (!AzDoProvider.instance) {
      AzDoProvider.instance = new AzDoProvider();
    }
    return AzDoProvider.instance;
  }
}
