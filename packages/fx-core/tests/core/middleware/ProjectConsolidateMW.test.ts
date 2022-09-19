// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ConfigFolderName,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ok,
  Platform,
  ProjectSettings,
  ProjectSettingsFileName,
  Result,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { ProjectConsolidateMW } from "../../../src/core/middleware/consolidateLocalRemote";
import { CoreHookContext } from "../../../src/core/types";
import {
  MockProjectSettings,
  MockSPFxProjectSettings,
  MockTools,
  MockUserInteraction,
  randomAppName,
} from "../utils";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import * as projectMigrator from "../../../src/core/middleware/projectMigrator";
import { setTools } from "../../../src/core/globalVars";
import { environmentManager } from "../../../src/core/environment";

describe("Middleware - ProjectSettingsWriterMW", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (path: string) => {
      if (path.endsWith(".fx")) {
        return true;
      }
      if (path.endsWith("remote.template.json")) {
        return true;
      }
      if (path.endsWith("local.template.json")) {
        return true;
      }
      if (path.endsWith("localSettings.json")) {
        return true;
      }
      return false;
    });
    setTools(new MockTools());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("not consolidate local remote", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectConsolidateMW],
    });
    const my = new MyClass();
    const inputs1: Inputs = { platform: Platform.VSCode };
    await my.myMethod(inputs1);
    const inputs2: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs2);
  });

  it("consolidate happy path", async () => {
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    const appName = randomAppName();
    const projectSettings: ProjectSettings = MockProjectSettings(appName);
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));
    sandbox.stub(environmentManager, "writeEnvConfig").resolves(ok(""));
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "readFile").resolves(Buffer.from("{\n}", "utf-8"));
    sandbox.stub(fs, "copy").resolves();
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "remove").resolves();
    sandbox.stub(projectMigrator, "addPathToGitignore").resolves();

    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectConsolidateMW],
    });
    const my = new MyClass();
    try {
      const inputs1: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), appName),
      };
      await my.myMethod(inputs1);
      const inputs2: Inputs = {
        platform: Platform.CLI_HELP,
        projectPath: path.join(os.tmpdir(), appName),
      };
      await my.myMethod(inputs2);
    } catch (e) {
      console.log(e);
    }
  });

  it("consolidate SPFx happy path", async () => {
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    const appName = randomAppName();
    const projectSettings: ProjectSettings = MockSPFxProjectSettings(appName);
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));
    sandbox.stub(environmentManager, "writeEnvConfig").resolves(ok(""));
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "writeFile").resolves();
    sandbox
      .stub(fs, "readFile")
      .resolves(
        Buffer.from(
          '{\n    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.9/MicrosoftTeams.schema.json",\n    "manifestVersion": "1.9",\n    "packageName": "todoList",\n    "id": "",\n    "version": "1.0.0.0",\n    "developer": {\n        "name": "SPFx + Teams Dev",\n        "websiteUrl": "https://products.office.com/en-us/sharepoint/collaboration",\n        "privacyUrl": "https://privacy.microsoft.com/en-us/privacystatement",\n        "termsOfUseUrl": "https://www.microsoft.com/en-us/servicesagreement"\n    },\n    "name": {\n        "short": "",\n        "full": ""\n    },\n    "description": {\n        "short": "todoList",\n        "full": "todoList"\n    },\n    "icons": {\n        "outline": "resources/outline.png",\n        "color": "resources/color.png"\n    },\n    "accentColor": "#004578",\n    "configurableTabs": [\n        {\n            "configurationUrl": "https://",\n            "canUpdateConfiguration": true,\n            "scopes": [\n                "team"\n            ]\n        }\n    ],\n    "permissions": [\n        "identity",\n        "messageTeamMembers"\n    ],\n    "validDomains": [\n        "*.login.microsoftonline.com",\n        "*.sharepoint.com",\n        "*.sharepoint-df.com",\n        "spoppe-a.akamaihd.net",\n        "spoprod-a.akamaihd.net",\n        "resourceseng.blob.core.windows.net",\n        "msft.spoppe.com"\n    ],\n    "webApplicationInfo": {\n        "resource": "https://",\n        "id": "00000003-0000-0ff1-ce00-000000000000"\n    }\n}',
          "utf-8"
        )
      );
    sandbox.stub(fs, "copy").resolves();
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "remove").resolves();
    sandbox.stub(projectMigrator, "addPathToGitignore").resolves();

    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectConsolidateMW],
    });
    const my = new MyClass();
    const inputs1: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), appName),
    };
    await my.myMethod(inputs1);
  });
});
