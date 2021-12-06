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
import {
  environmentManager,
  EnvStateFiles,
  FxCore,
  isMultiEnvEnabled,
  PathNotExistError,
} from "@microsoft/teamsfx-core";

import * as resourceCmd from "../../../src/cmds/resource";
import Resource, {
  ResourceAdd,
  ResourceAddApim,
  ResourceAddFunction,
  ResourceAddSql,
  ResourceList,
  ResourceShow,
  ResourceShowApim,
  ResourceShowFunction,
  ResourceShowSQL,
} from "../../../src/cmds/resource";
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
    if (!isMultiEnvEnabled()) {
      sandbox.stub(Utils, "readEnvJsonFile").callsFake(async (folder: string) => {
        if (folder.includes("real")) {
          return ok({
            "fx-resource-function": "fx-resource-function",
            "fx-resource-azure-sql": "fx-resource-azure-sql",
            "fx-resource-apim": "fx-resource-apim",
          });
        }
        return err(NotSupportedProjectType());
      });
    }
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "addResource",
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(UI, "updatePresetAnswer").callsFake((key: any, value: any) => {
      allArguments.set(key, value);
    });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    if (isMultiEnvEnabled()) {
      sandbox
        .stub(environmentManager, "listEnvConfigs")
        .callsFake(async function (projectPath: string): Promise<Result<string[], FxError>> {
          if (path.normalize(projectPath).endsWith("real")) {
            return ok(envs);
          } else {
            return err(PathNotExistError(projectPath));
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
    }
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

  it("Builder Check", () => {
    const cmd = new Resource();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals([
      "resource <action>",
      "add <resource-type>",
      "azure-sql",
      "azure-apim",
      "azure-function",
      "azure-keyvault",
      "show <resource-type>",
      "azure-function",
      "azure-sql",
      "azure-apim",
      "list",
    ]);
  });

  it("Resource Command Running Check", async () => {
    const cmd = new Resource();
    await cmd.handler({});
  });

  it("Resource Add Command Running Check", async () => {
    const cmd = new ResourceAdd();
    await cmd.handler({});
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

  it("Resource Show Command Running Check", async () => {
    const cmd = new ResourceShow();
    await cmd.handler({});
  });

  it("Resource Show Sql Command Running Check", async () => {
    const cmd = new ResourceShowSQL();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    await cmd.handler(args);
    expect(JSON.parse(logs[0])).deep.equals({ "fx-resource-azure-sql": "fx-resource-azure-sql" });
  });

  it("Resource Show Sql Command Running Check with NotSupportedProjectType Error", async () => {
    const cmd = new ResourceShowSQL();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Resource Show Function Command Running Check", async () => {
    const cmd = new ResourceShowFunction();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    await cmd.handler(args);
    expect(JSON.parse(logs[0])).deep.equals({ "fx-resource-function": "fx-resource-function" });
  });

  it("Resource Show Function Command Running Check with NotSupportedProjectType Error", async () => {
    const cmd = new ResourceShowFunction();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Resource Show Apim Command Running Check", async () => {
    const cmd = new ResourceShowApim();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    await cmd.handler(args);
    expect(JSON.parse(logs[0])).deep.equals({ "fx-resource-apim": "fx-resource-apim" });
  });

  it("Resource Show Apim Command Running Check with NotSupportedProjectType Error", async () => {
    const cmd = new ResourceShowApim();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Resource List Command Running Check", async () => {
    const cmd = new ResourceList();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    await cmd.handler(args);
    expect(JSON.parse(logs[0])).deep.equals({
      "fx-resource-azure-sql": "fx-resource-azure-sql",
      "fx-resource-function": "fx-resource-function",
      "fx-resource-apim": "fx-resource-apim",
    });
  });

  it("Resource List Command Running Check with NotSupportedProjectType Error", async () => {
    const cmd = new ResourceList();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    if (isMultiEnvEnabled()) {
      args[constants.EnvNodeNoCreate.data.name as string] = "dev";
    }
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
