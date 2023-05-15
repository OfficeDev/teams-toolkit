// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
"use strict";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import * as spies from "chai-spies";
import { ExtensionUpgrade } from "../../../src/utils/upgrade";
import * as versionUtil from "../../../src/utils/versionUtil";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as chai from "chai";
chai.use(spies);
const spy = chai.spy;
function gloablStateKeys(): readonly string[] {
  return ["PrereleaseState.Version"];
}
function globalStateGet(key: string): string {
  return "0.0.0";
}
function globalStateUpdate(key: string, value: any): any {}
const reporterSpy = spy.interface({
  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {},
});
describe("upgrade show what's new log", () => {
  const sandbox = sinon.createSandbox();
  let context: vscode.ExtensionContext;
  const mockGlobalState: vscode.Memento = {
    keys: gloablStateKeys,
    get: globalStateGet,
    update: globalStateUpdate,
  };
  before(() => {
    chai.util.addProperty(ExtTelemetry, "reporter", () => reporterSpy);
  });
  beforeEach(() => {
    context = {
      subscriptions: [],
      globalState: mockGlobalState,
    } as unknown as vscode.ExtensionContext;
    sandbox.stub(versionUtil, "getExtensionId").returns("");
    sandbox.stub(vscode.window, "showInformationMessage").resolves();
    sandbox.stub(vscode.extensions, "getExtension").returns({
      packageJSON: { version: "5.0.0" },
      id: "",
      extensionPath: "",
      isActive: true,
      exports: {},
      extensionKind: vscode.ExtensionKind.UI,
      extensionUri: vscode.Uri.parse("https://www.test.com"),
      activate(): Thenable<void> {
        return Promise.resolve();
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("show what's new notification happy path", async () => {
    const contextSpy = sandbox.spy(context.globalState, "update");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new ExtensionUpgrade(context);
    await instance.showChangeLog();
    chai.assert(contextSpy.callCount == 2);
    chai
      .expect(reporterSpy.sendTelemetryEvent)
      .to.have.been.called.with("show-what-is-new-notification");
  });
  it("should not show whate's new log when version is not changed", async () => {
    const contextSpy = sandbox.spy(context.globalState, "update");
    sandbox.stub(context.globalState, "get").returns("5.0.0");
    const instance = new ExtensionUpgrade(context);
    await instance.showChangeLog();
    sinon.assert.notCalled(contextSpy);
    chai.expect(reporterSpy.sendTelemetryEvent).to.not.have.been.called;
  });
});
