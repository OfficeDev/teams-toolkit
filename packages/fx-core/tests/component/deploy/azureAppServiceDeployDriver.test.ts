// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import { AzureAppServiceDeployDriver } from "../../../src/component/deploy/azureAppServiceDeployDriver";

describe("Azure App Service Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy happy path", () => {});
});
