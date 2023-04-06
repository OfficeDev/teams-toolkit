// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import * as vscode from "vscode";
import { DevTunnelStateManager } from "../../src/debug/taskTerminal/utils/devTunnelStateManager";
import * as globalVariables from "../../src/globalVariables";
chai.use(chaiAsPromised);

describe("devTunnelStateManager", () => {
  const sandbox = sinon.createSandbox();
  const baseDir = path.resolve(__dirname, "data", "devTunnelStateManager");
  beforeEach(async () => {
    const filePath = path.resolve(baseDir, uuid.v4().substring(0, 6));
    await fs.ensureDir(filePath);
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.parse(filePath));
    sandbox.stub(process, "env").value({ TEAMSFX_DEV_TUNNEL_TEST: "true" });
  });

  afterEach(async () => {
    sandbox.restore();
    await fs.remove(baseDir);
  });

  it("happy path", async () => {
    const devTunnelStateManager = DevTunnelStateManager.create();
    let states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.isEmpty(states);
    await devTunnelStateManager.setTunnelState({
      tunnelId: "id1",
      clusterId: "cluster1",
      sessionId: "test-session",
    });
    states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.deepEqual(states, [
      { tunnelId: "id1", clusterId: "cluster1", sessionId: "test-session" },
    ]);
    await devTunnelStateManager.setTunnelState({
      tunnelId: "id2",
      clusterId: "cluster2",
      sessionId: "test-session",
    });
    states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.deepEqual(states, [
      { tunnelId: "id1", clusterId: "cluster1", sessionId: "test-session" },
      { tunnelId: "id2", clusterId: "cluster2", sessionId: "test-session" },
    ]);
    await devTunnelStateManager.deleteTunnelState({ tunnelId: "id1", clusterId: "cluster1" });
    states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.deepEqual(states, [
      { tunnelId: "id2", clusterId: "cluster2", sessionId: "test-session" },
    ]);
    await devTunnelStateManager.deleteTunnelState({ tunnelId: "id2", clusterId: "cluster2" });
    states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.isEmpty(states);
  });

  it("concurrency", async () => {
    const randomOperation = async () => {
      const testData = {
        tunnelId: "id-" + uuid.v4(),
        clusterId: "cluster-" + uuid.v4(),
        sessionId: uuid.v4(),
      };
      const devTunnelStateManager = DevTunnelStateManager.create();
      await devTunnelStateManager.setTunnelState(testData);
      let states = await devTunnelStateManager.listDevTunnelStates();
      chai.assert.deepInclude(states, testData);
      await devTunnelStateManager.deleteTunnelState(testData);
      states = await devTunnelStateManager.listDevTunnelStates();
      chai.assert.notInclude(states, testData);
    };

    const promises = [randomOperation(), randomOperation(), randomOperation()];
    await Promise.all(promises);
  });

  it("delete a non-existent item", async () => {
    const devTunnelStateManager = DevTunnelStateManager.create();
    let states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.isEmpty(states);
    await devTunnelStateManager.deleteTunnelState({ tunnelId: "id1", clusterId: "cluster1" });
    states = await devTunnelStateManager.listDevTunnelStates();
    chai.assert.isEmpty(states);
  });
});
