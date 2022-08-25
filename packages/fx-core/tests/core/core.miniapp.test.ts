// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Func,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { newProjectSettings } from "../../src";
import { FxCore, setTools } from "../../src/core";
import { loadEnvInfoV3 } from "../../src/core/middleware/envInfoLoaderV3";
import { TabOptionItem } from "../../src/plugins/solution/fx-solution/question";
import { ResourcePluginsV2 } from "../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { deleteFolder, MockTools, randomAppName } from "./utils";
describe("Core API for mini app", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let projectPath: string;
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    setTools(tools);
    mockedEnvRestore = mockedEnv({ TEAMSFX_APIV3: "false" });
  });
  afterEach(async () => {
    sandbox.restore();
    deleteFolder(projectPath);
    mockedEnvRestore();
  });
  it("init", async () => {
    const appName = randomAppName();
    projectPath = path.join(os.tmpdir(), appName);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: projectPath,
      "app-name": appName,
    };
    const core = new FxCore(tools);
    const initRes = await core.init(inputs);
    assert.isTrue(initRes.isOk());
  });
});
