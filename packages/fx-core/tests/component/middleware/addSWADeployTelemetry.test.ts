// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Siglud <siglud@gmail.com>
 */

import "mocha";
import { HookContext, NextFunction } from "@feathersjs/hooks";
import * as sinon from "sinon";
import * as tlp from "../../../src/component/utils/teamsFxTelemetryReporter";
import { addSWADeployTelemetry } from "../../../src/component/driver/middleware/addSWADeployTelemetry";
import { expect } from "chai";
import { FxError } from "@microsoft/teamsfx-api";

describe("addSWADeployTelemetry", () => {
  let clock: sinon.SinonFakeTimers;
  let next: NextFunction;
  let ctx: HookContext;
  let telemetryReporter: tlp.TeamsFxTelemetryReporter;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    next = sinon.spy(() => {
      return Promise.resolve(12);
    }) as NextFunction;
    telemetryReporter = new tlp.TeamsFxTelemetryReporter(sinon.fake() as any, {});
    ctx = {
      arguments: [
        { args: "test command" },
        { telemetryReporter } as any,
        undefined,
        "",
        "deploy to Azure Static Web Apps",
      ],
      result: { isOk: sinon.fake.returns(true) },
    } as HookContext;
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it("should not add telemetry for script", async () => {
    const middleware = addSWADeployTelemetry("testEvent");
    const res = await middleware(ctx, next);
    expect(res === 12);
  });

  it("should add telemetry for non-script", async () => {
    const middleware = addSWADeployTelemetry("testEvent");
    sinon.stub(tlp, "TeamsFxTelemetryReporter").returns(telemetryReporter);
    const sendStartEventSpy = sinon.stub(telemetryReporter, "sendStartEvent").resolves();
    const sendEndEventSpy = sinon.stub(telemetryReporter, "sendEndEvent").resolves();
    await middleware(ctx, next);
    clock.tick(1000); // Simulate time passing
    expect(sendStartEventSpy.called).to.be.true;
    expect(sendEndEventSpy.called).to.be.true;
  });

  it("When name is not deploy to Azure Static Web Apps", async () => {
    const ctx = {
      arguments: [
        { args: "test command" },
        { telemetryReporter } as any,
        undefined,
        "",
        "Anything else",
      ],
      result: { isOk: sinon.fake.returns(true) },
    } as HookContext;
    sinon.stub(tlp, "TeamsFxTelemetryReporter").returns(telemetryReporter);
    const sendStartEventSpy = sinon.stub(telemetryReporter, "sendStartEvent").resolves();
    const sendEndEventSpy = sinon.stub(telemetryReporter, "sendEndEvent").resolves();
    const middleware = addSWADeployTelemetry("testEvent");
    const res = await middleware(ctx, next);
    expect(res === 12);
    expect(sendStartEventSpy.called).to.be.false;
    expect(sendEndEventSpy.called).to.be.false;
  });

  it("When return value is not ok", async () => {
    const err = { e: "error" } as unknown as FxError;
    const ctx = {
      arguments: [
        { args: "test command" },
        { telemetryReporter } as any,
        undefined,
        "",
        "deploy to Azure Static Web Apps",
      ],
      result: { isOk: sinon.fake.returns(false), error: err },
    } as HookContext;
    sinon.stub(tlp, "TeamsFxTelemetryReporter").returns(telemetryReporter);
    const sendStartEventSpy = sinon.stub(telemetryReporter, "sendStartEvent").resolves();
    const sendEndEventSpy = sinon.stub(telemetryReporter, "sendEndEvent").resolves();
    const middleware = addSWADeployTelemetry("testEvent");
    const res = await middleware(ctx, next);
    expect(sendStartEventSpy.called).to.be.true;
    sinon.assert.calledWith(sendEndEventSpy, sinon.match.any, err);
  });
});
