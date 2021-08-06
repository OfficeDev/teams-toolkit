// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Provision from "../../../src/cmds/provision";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import { expect } from "../utils";
import { NotFoundSubscriptionId, NotSupportedProjectType } from "../../../src/error";
import UI from "../../../src/userInteraction";
import LogProvider from "../../../src/commonlib/log";

describe("Provision Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let allArguments = new Map<string, any>();

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
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
    sandbox.stub(Utils, "setSubscriptionId").callsFake(async (id?: string, folder?: string) => {
      if (!id) return ok(null);
      else return err(NotFoundSubscriptionId());
    });
    sandbox.stub(FxCore.prototype, "provisionResources").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(UI, "updatePresetAnswers").callsFake((a: any, args: { [_: string]: any }) => {
      for (const key of Object.keys(args)) {
        allArguments.set(key, args[key]);
      }
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    telemetryEvents = [];
    logs = [];
    allArguments = new Map<string, any>();
  });

  it("Builder Check", () => {
    const cmd = new Provision();
    cmd.builder(yargs);
  });

  it("Provision Command Running -- with sqlPasswordQustionName", async () => {
    const cmd = new Provision();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      [constants.sqlPasswordQustionName]: "123",
    };
    await cmd.handler(args);
    expect(allArguments.get(constants.sqlPasswordConfirmQuestionName)).equals("123");
    expect(telemetryEvents).deep.equals([TelemetryEvent.ProvisionStart, TelemetryEvent.Provision]);
  });

  it("Provision Command Running -- setSubscriptionId error", async () => {
    const cmd = new Provision();
    const args = {
      subscription: "fake",
    };
    try {
      await cmd.handler(args);
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.ProvisionStart,
        TelemetryEvent.Provision,
      ]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotFoundSubscriptionId");
    }
  });

  it("Provision Command Running -- provisionResources error", async () => {
    const cmd = new Provision();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.ProvisionStart,
        TelemetryEvent.Provision,
      ]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
