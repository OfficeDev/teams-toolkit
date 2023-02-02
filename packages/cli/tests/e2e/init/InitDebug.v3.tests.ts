// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huajie Zhang <huajiezhasng@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import path from "path";
import { CliHelper } from "../../commonlib/cliHelper";
import { cleanUp, getTestFolder, getUniqueAppName } from "../commonUtils";

describe("teamsfx init debug", function () {
  const testFolder = getTestFolder();
  let appName: string;
  let projectPath: string;
  let mockedEnvRestore: RestoreFn | undefined;
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
      TEAMSFX_DEBUG_TEMPLATE: "true",
      NODE_ENV: "development",
    });
  });
  afterEach(async () => {
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
    await cleanUp(appName, projectPath, false, false, false);
  });
  const params = [
    {
      name: "vsc + bot",
      caseId: 16774467,
      editor: "vsc",
      capability: "bot",
      spfx: undefined,
      files: [
        ".vscode/launch.json",
        ".vscode/settings.json",
        ".vscode/tasks.json",
        "env/.env.local",
        "teamsapp.local.yml",
        "teamsapp.yml",
      ],
    },
    {
      name: "vsc + spfx tab",
      caseId: 16774613,
      editor: "vsc",
      capability: "tab",
      spfx: "true",
      files: [
        ".vscode/launch.json",
        ".vscode/settings.json",
        ".vscode/tasks.json",
        "env/.env.local",
        "teamsapp.local.yml",
        "teamsapp.yml",
      ],
    },
    {
      name: "vsc + tab",
      caseId: 16774612,
      editor: "vsc",
      capability: "tab",
      spfx: "false",
      files: [
        ".vscode/launch.json",
        ".vscode/settings.json",
        ".vscode/tasks.json",
        "env/.env.local",
        "teamsapp.local.yml",
        "teamsapp.yml",
      ],
    },
    {
      name: "vs + tab",
      caseId: 16774614,
      editor: "vs",
      capability: "tab",
      spfx: undefined,
      files: ["env/.env.local", "teamsapp.local.yml", "teamsapp.yml"],
    },
    {
      name: "vs + bot",
      caseId: 16774615,
      editor: "vs",
      capability: "bot",
      spfx: undefined,
      files: ["env/.env.local", "teamsapp.local.yml", "teamsapp.yml"],
    },
  ];
  for (const param of params) {
    it(`teamsfx init debug (${param.name})`, { testPlanCaseId: param.caseId }, async function () {
      appName = getUniqueAppName();
      projectPath = path.resolve(testFolder, appName);
      await fs.ensureDir(projectPath);
      await CliHelper.initDebug(
        appName,
        projectPath,
        param.editor as "vsc" | "vs",
        param.capability as "tab" | "bot",
        param.spfx as "true" | "false" | undefined
      );
      for (const file of param.files) {
        const filePath = path.resolve(projectPath, file);
        const exists = await fs.pathExists(filePath);
        if (!exists) {
          console.error(`file not exits: ${filePath}`);
        }
        chai.assert.isTrue(exists);
      }
    });
  }
});
