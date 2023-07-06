// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";

import ScreenManager, { Row } from "../../../src/console/screen";
import { expect } from "../utils";

describe("Row", () => {
  it("create with an string.", () => {
    const row = new Row("Test");
    expect(row.freezed).equals(false);
    expect(row.content).equals("Test");
  });

  it("create with an callback.", () => {
    const cb = () => "Test cb";
    const row = new Row(cb);
    expect(row.freezed).equals(false);
    expect(row.update()).equals("Test cb");
  });

  it("update content.", () => {
    const row = new Row("Test");
    expect(row.update("Test2")).equals("Test2");
  });

  it("remove cb.", () => {
    const cb = () => "Test cb";
    const row = new Row(cb);
    row.removeCB();
    expect(row["cb"]).equals(undefined);
  });

  it("freeze.", () => {
    const row = new Row("Test");
    row.freeze();
    expect(row.freezed).equals(true);
  });
});

describe("Screen Manager", function () {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    ScreenManager["rows"] = [];
    ScreenManager["cursorY"] = 0;
    ScreenManager["paused"] = false;
    ScreenManager["cacheLogs"] = [];
    ScreenManager["clearTimer"]();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add progress", () => {
    const refreshStub = sandbox.stub(ScreenManager, "refresh");
    const row = ScreenManager.addProgress(() => "Test add progress");
    expect(ScreenManager["rows"]).deep.equals([row]);
    sinon.assert.calledOnce(refreshStub);
  });

  it("write when paused", () => {
    ScreenManager["paused"] = true;
    ScreenManager.write("Test write when paused");
    expect(ScreenManager["cacheLogs"]).deep.equals([["Test write when paused", false]]);
  });

  it("write and write line (out stream)", () => {
    const clearScreenStub = sandbox.stub<any, any>(ScreenManager, "clearScreen");
    const renderScreenStub = sandbox.stub<any, any>(ScreenManager, "renderScreen");
    const outWriteStub = sandbox.stub(process.stdout, "write");
    ScreenManager.writeLine("Test out");
    sinon.assert.calledOnce(clearScreenStub);
    sinon.assert.calledOnce(renderScreenStub);
    sinon.assert.calledOnce(outWriteStub);
  });

  it("write and write line (err stream)", () => {
    const clearScreenStub = sandbox.stub<any, any>(ScreenManager, "clearScreen");
    const renderScreenStub = sandbox.stub<any, any>(ScreenManager, "renderScreen");
    const errWriteStub = sandbox.stub(process.stderr, "write");
    ScreenManager.writeLine("Test err", true);
    sinon.assert.calledOnce(clearScreenStub);
    sinon.assert.calledOnce(renderScreenStub);
    sinon.assert.calledOnce(errWriteStub);
  });

  it("refresh", () => {
    const clearTimerStub = sandbox.stub<any, any>(ScreenManager, "clearTimer");
    const renderScreenStub = sandbox.stub<any, any>(ScreenManager, "renderScreen");
    const setTimerStub = sandbox.stub<any, any>(ScreenManager, "setTimer");
    ScreenManager.refresh();
    sinon.assert.calledOnce(clearTimerStub);
    sinon.assert.calledOnce(renderScreenStub);
    sinon.assert.calledOnce(setTimerStub);
  });

  it("freeze", () => {
    const writeLineStub = sandbox.stub(ScreenManager, "writeLine");
    const row = new Row(() => "Test freeze");
    ScreenManager["rows"] = [row];
    ScreenManager.freeze(row);
    sinon.assert.calledOnce(writeLineStub);
    expect(ScreenManager["rows"].length).equals(0);
  });

  it("delete", () => {
    const row = new Row(() => "Test delete");
    ScreenManager["rows"] = [row];
    ScreenManager.delete(row);
    expect(ScreenManager["rows"].length).equals(0);
  });

  it("pause", () => {
    const clearScreenStub = sandbox.stub<any, any>(ScreenManager, "clearScreen");
    ScreenManager.pause();
    sinon.assert.calledOnce(clearScreenStub);
    expect(ScreenManager["paused"]).equals(true);
  });

  it("continue", () => {
    ScreenManager["paused"] = true;
    ScreenManager.continue();
    expect(ScreenManager["paused"]).equals(false);
  });

  it("set timer", () => {
    sandbox.stub(ScreenManager, "refresh");
    const row = new Row(() => "Test freeze");
    ScreenManager["rows"] = [row];
    ScreenManager["setTimer"]();
    expect(ScreenManager["timer"]).not.equals(undefined);
  });

  it("clear timer", () => {
    ScreenManager["timer"] = setTimeout(() => {}, 2000);
    ScreenManager["clearTimer"]();
    expect(ScreenManager["timer"]).equals(undefined);
  });
});
