// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Deploy from "../../../src/cmds/deploy";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";
import UI from "../../../src/userInteraction";
import LogProvider from "../../../src/commonlib/log";

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
  };

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return params;
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

  it("Builder Check", () => {
    const cmd = new Deploy();
    cmd.builder(yargs);
    expect(options).deep.equals(
      ["open-api-document", "api-prefix", "api-version"],
      JSON.stringify(options)
    );
    expect(positionals).deep.equals(["components"], JSON.stringify(positionals));
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
    expect(allArguments.get(constants.deployPluginNodeName)).deep.equals(["a", "b", "c"]);
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
    expect(allArguments.get(constants.deployPluginNodeName)).deep.equals(["a"]);
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
});
