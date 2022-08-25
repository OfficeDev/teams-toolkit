// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import {
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  SubscriptionInfo,
  UserError,
} from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Provision, { ProvisionManifest } from "../../../src/cmds/provision";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import { expect } from "../utils";
import { NotFoundSubscriptionId, NotSupportedProjectType } from "../../../src/error";
import UI from "../../../src/userInteraction";
import LogProvider from "../../../src/commonlib/log";
import { AzureAccountManager } from "../../../src/commonlib/azureLoginCI";

describe("Provision Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let allArguments = new Map<string, any>();

  const existedSubId = "existedSubId";

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
      if (id === existedSubId) return ok(null);
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
      interactive: false,
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

  it("Provision Command Running -- provision with set subscription error", async () => {
    const cmd = new Provision();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: "fake",
      tenantId: "fakeTenantId",
      subscriptionName: "fakeSubscriptionName",
    };
    const azureAccountManager = AzureAccountManager.getInstance();
    sandbox.stub(azureAccountManager, "readSubscription").callsFake(async () => {
      return Promise.resolve(subscriptionInfo);
    });

    sandbox
      .stub(azureAccountManager, "setSubscription")
      .callsFake(async (subscriptionId: string) => {
        throw new UserError(
          "CI",
          "NotFoundSubscriptionId",
          "Inputed subscription not found in your tenant"
        );
      });

    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.ProvisionStart, TelemetryEvent.Provision]);
  });

  it("Provision Command Running -- with subscriptionId", async () => {
    const cmd = new Provision();
    const subscriptionParam = "subscription";
    const args = {
      interactive: false,
      [constants.RootFolderNode.data.name as string]: "real",
      [subscriptionParam]: existedSubId,
    };
    await cmd.handler(args);
    expect(allArguments.get(subscriptionParam)).equals(existedSubId);
    expect(telemetryEvents).deep.equals([TelemetryEvent.ProvisionStart, TelemetryEvent.Provision]);
  });
});

describe("teamsfx provision manifest", async () => {
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
    sandbox.stub(yargs, "option").callsFake((ops: { [key: string]: Options }) => {
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

    sandbox.stub(FxCore.prototype, "provisionTeamsAppForCLI").callsFake(async (inputs: Inputs) => {
      return ok("aaa");
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

  it("should pass builder check", async () => {
    const cmd = new ProvisionManifest();
    cmd.builder(yargs);
    expect(options).deep.equals([cmd.filePathParam]);
  });

  it("should work on happy path", async () => {
    const cmd = new ProvisionManifest();
    const args = {
      [cmd.filePathParam]: "./",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ProvisionManifestStart,
      TelemetryEvent.ProvisionManifest,
    ]);
  });
});
