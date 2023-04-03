// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import sinon from "sinon";
import yargs, { Options } from "yargs";

import {
  ConfigFolderName,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  err,
  Func,
  FxError,
  Inputs,
  LogLevel,
  ok,
  Result,
  StatesFolderName,
  UserError,
} from "@microsoft/teamsfx-api";
import { environmentManager, FxCore } from "@microsoft/teamsfx-core";
import { ProjectSettingsHelper } from "@microsoft/teamsfx-core/build/common/local";
import { FileNotFoundError } from "@microsoft/teamsfx-core/build/error/common";
import { EnvStateFiles } from "@microsoft/teamsfx-core/build/core/environment";
import { ResourceAddApim, ResourceAddFunction, ResourceAddSql } from "../../../src/cmds/resource";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotFoundSubscriptionId, NotSupportedProjectType } from "../../../src/error";
import UI from "../../../src/userInteraction";
import * as path from "path";
import * as npmInstallHandler from "../../../src/cmds/preview/npmInstallHandler";

describe("Resource Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;
  let logs: string[] = [];
  let allArguments = new Map<string, any>();
  const envs = ["dev"];
  const allEnvs = ["dev", "local"];
  const params = {
    "apim-resource-group": {},
    "apim-service-name": {},
  };

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").returns({});
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
      if (typeof ops === "string") {
        options.push(ops);
      } else {
        options = options.concat(...Object.keys(ops));
      }
      return yargs;
    });
    sandbox.stub(yargs, "positional").callsFake((name: string) => {
      positionals.push(name);
      return yargs;
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryEvent")
      .callsFake((eventName: string, options?: { [_: string]: string }) => {
        telemetryEvents.push(eventName);
        if (options && TelemetryProperty.Success in options) {
          telemetryEventStatus = options[TelemetryProperty.Success];
        }
      });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
        telemetryEventStatus = TelemetrySuccess.No;
      });
    sandbox.stub(Utils, "setSubscriptionId").callsFake(async (id?: string, folder?: string) => {
      if (!id) return ok(null);
      else return err(NotFoundSubscriptionId());
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals(constants.AddFeatureFunc);
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(FxCore.prototype, "getProjectConfig").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) {
        return ok({});
      } else {
        return err(NotSupportedProjectType());
      }
    });
    sandbox.stub(ProjectSettingsHelper, "includeBackend").returns(false);
    sandbox.stub(npmInstallHandler, "automaticNpmInstallHandler").callsFake(async () => {});
    sandbox.stub(UI, "updatePresetAnswer").callsFake((key: any, value: any) => {
      allArguments.set(key, value);
    });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    sandbox
      .stub(environmentManager, "listRemoteEnvConfigs")
      .callsFake(async function (projectPath: string): Promise<Result<string[], FxError>> {
        if (path.normalize(projectPath).endsWith("real")) {
          return ok(envs);
        } else {
          return err(new FileNotFoundError("test", projectPath));
        }
      });
    sandbox
      .stub(environmentManager, "listAllEnvConfigs")
      .callsFake(async function (projectPath: string): Promise<Result<string[], FxError>> {
        if (path.normalize(projectPath).endsWith("real")) {
          return ok(allEnvs);
        } else {
          return err(new FileNotFoundError("test", projectPath));
        }
      });
    sandbox
      .stub(environmentManager, "getEnvStateFilesPath")
      .callsFake(function (envName: string, projectPath: string): EnvStateFiles {
        return {
          envState: path.join(
            projectPath,
            `.${ConfigFolderName}`,
            StatesFolderName,
            EnvStateFileNameTemplate.replace(EnvNamePlaceholder, envName)
          ),
          userDataFile: path.join(
            projectPath,
            `.${ConfigFolderName}`,
            StatesFolderName,
            `${envName}.userdata`
          ),
        };
      });
    const readJsonOriginal = fs.readJson;
    sandbox.stub(fs, "readJson").callsFake(async (file: string, options: fs.ReadOptions) => {
      if (file.match(/state\.[^.]+\.json/)) {
        // env state
        return {
          "fx-resource-function": "fx-resource-function",
          "fx-resource-azure-sql": "fx-resource-azure-sql",
          "fx-resource-apim": "fx-resource-apim",
        };
      } else if (file.endsWith(".userdata")) {
        // userdata
        return "";
      } else {
        return readJsonOriginal(file, options);
      }
    });
    sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike): boolean => {
      return path.toString().match(/(state\.[^.]+\.json)|(\.userdata)$/) ? true : false;
    });
    sandbox.stub(FxCore.prototype, "getProjectConfigV3").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) {
        return ok({ projectSettings: { appName: "test", projectId: "" }, envInfos: {} });
      } else {
        return err(NotSupportedProjectType());
      }
    });
    sandbox.stub(ProjectSettingsHelper, "includeFrontend").returns(false);
    sandbox.stub(ProjectSettingsHelper, "includeBot").returns(false);
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    positionals = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
    logs = [];
    allArguments = new Map<string, any>();
  });

  it("Resource Add Sql Command Running Check", async () => {
    const cmd = new ResourceAddSql();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateProjectStart,
      TelemetryEvent.UpdateProject,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Resource Add Sql Command Running Check with Error", async () => {
    const cmd = new ResourceAddSql();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateProjectStart,
        TelemetryEvent.UpdateProject,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Resource Add Function Command Running Check", async () => {
    const cmd = new ResourceAddFunction();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateProjectStart,
      TelemetryEvent.UpdateProject,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Resource Add Function Command Running Check with Error", async () => {
    const cmd = new ResourceAddFunction();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateProjectStart,
        TelemetryEvent.UpdateProject,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Resource Add APIM Command Running Check", async () => {
    const cmd = new ResourceAddApim();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(allArguments.get("apim-resource-group")).equals(undefined);
    expect(allArguments.get("apim-service-name")).equals(undefined);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateProjectStart,
      TelemetryEvent.UpdateProject,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Resource Add APIM Command Running Check with setSubscriptionId Error", async () => {
    const cmd = new ResourceAddApim();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      subscription: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateProjectStart,
        TelemetryEvent.UpdateProject,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotFoundSubscriptionId");
    }
  });

  it("Resource Add APIM Command Running Check with NotSupportedProjectType Error", async () => {
    const cmd = new ResourceAddApim();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateProjectStart,
        TelemetryEvent.UpdateProject,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
