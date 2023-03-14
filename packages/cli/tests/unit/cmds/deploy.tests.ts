// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { Err, err, FxError, Inputs, ok, QTreeNode, UserError } from "@microsoft/teamsfx-api";
import { environmentManager, FxCore } from "@microsoft/teamsfx-core";

import Deploy from "../../../src/cmds/deploy";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import * as constants from "../../../src/constants";
import { expect } from "../utils";
import { assert } from "chai";
import { NotSupportedProjectType } from "../../../src/error";
import UI from "../../../src/userInteraction";
import LogProvider from "../../../src/commonlib/log";
import mockedEnv, { RestoreFn } from "mocked-env";
import CLIUIInstance from "../../../src/userInteraction";

describe("Deploy Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let allArguments = new Map<string, any>();
  const params = {
    [constants.deployPluginNodeName]: {
      choices: ["a", "b", "c"],
      description: "deployPluginNodeName",
    },
    "open-api-document": {},
    "api-prefix": {},
    "api-version": {},
    "include-app-manifest": {},
  };
  let mockedEnvRestore: RestoreFn = () => {};

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return params;
    });
    sandbox.stub(HelpParamGenerator, "getQuestionRootNodeForHelp").callsFake(() => {
      return new QTreeNode({
        name: constants.deployPluginNodeName,
        type: "multiSelect",
        title: "deployPluginNodeName",
        staticOptions: ["a", "b", "c"],
      });
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
    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });
    sandbox.stub(FxCore.prototype, "deployArtifacts").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(UI, "updatePresetAnswer").callsFake((key: any, value: any) => {
      allArguments.set(key, value);
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    CLIUIInstance.interactive = false;
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    telemetryEvents = [];
    options = [];
    positionals = [];
    allArguments = new Map<string, any>();
  });

  afterEach(() => {
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Deploy();
    cmd.builder(yargs);
    expect(options).deep.equals(
      ["open-api-document", "api-prefix", "api-version", "include-app-manifest"],
      JSON.stringify(options)
    );
    expect(positionals).deep.equals(["components"], JSON.stringify(positionals));
  });

  it("Builder Check V3", () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const cmd = new Deploy();
    cmd.builder(yargs);
  });

  it("Deploy Command Running -- no components", async () => {
    const cmd = new Deploy();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(allArguments.get("open-api-document")).equals(undefined);
    expect(allArguments.get("api-prefix")).equals(undefined);
    expect(allArguments.get("api-version")).equals(undefined);
    expect(allArguments.get("include-app-manifest")).equals(undefined);
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });

  it("Deploy Command Running -- 1 component", async () => {
    const cmd = new Deploy();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      components: ["a"],
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });

  it("Deploy Command Running -- deployArtifacts error", async () => {
    const cmd = new Deploy();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Deploy Command Running -- aad manifest component", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Deploy();
    cmd["params"] = {
      [constants.deployPluginNodeName]: {
        choices: ["aad-manifest"],
        default: ["fx-resource-aad-app-for-teams"],
        description: "deployPluginNodeName",
      },
      "open-api-document": {},
      "api-prefix": {},
      "api-version": {},
    };
    (HelpParamGenerator.getQuestionRootNodeForHelp as any).restore();
    sandbox.stub(HelpParamGenerator, "getQuestionRootNodeForHelp").callsFake(() => {
      return new QTreeNode({
        name: constants.deployPluginNodeName,
        type: "multiSelect",
        title: "deployPluginNodeName",
        staticOptions: ["fx-resource-aad-app-for-teams"],
      });
    });

    (FxCore.prototype.deployArtifacts as any).restore();
    sandbox.stub(FxCore.prototype, "deployArtifacts").callsFake(async (inputs: Inputs) => {
      if (inputs["include-aad-manifest"] === "yes") return ok("");
      else return err(NotSupportedProjectType());
    });

    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      components: ["aad-manifest"],
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });
});
