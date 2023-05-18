// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, QTreeNode, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Deploy from "../../../src/cmds/deploy";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockTelemetry, mockYargs } from "../utils";
import * as utils from "../../../src/utils";

describe("Deploy Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
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

  beforeEach(() => {
    mockYargs(sandbox, options, positionals);
    mockTelemetry(sandbox, telemetryEvents);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
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
    sandbox.stub(utils, "promptSPFxUpgrade").resolves();
    sandbox.stub(FxCore.prototype, "deployArtifacts").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
  });

  afterEach(() => {
    telemetryEvents = [];
    options = [];
    positionals = [];
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Builder Check - V2", () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Deploy();
    cmd.builder(yargs);
    expect(options).deep.equals(
      ["open-api-document", "api-prefix", "api-version", "include-app-manifest"],
      JSON.stringify(options)
    );
    expect(positionals).deep.equals(["components"], JSON.stringify(positionals));
  });

  it("Deploy Command Running -- no components - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Deploy();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });

  it("Deploy Command Running -- 1 component - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Deploy();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      components: ["a"],
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });

  it("Builder Check", () => {
    const cmd = new Deploy();
    cmd.builder(yargs);
    expect(options).to.include.members(["folder", "env"]);
  });

  it("Deploy Command Running -- deployArtifacts error", async () => {
    const cmd = new Deploy();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).to.be.true;
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
    if (result.isErr()) {
      expect(result.error.name).equals("NotSupportedProjectType");
    }
  });

  it("Deploy Command Running -- aad manifest component - V2", async () => {
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
    const result = await cmd.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
  });
});
