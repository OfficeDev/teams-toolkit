// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert, expect } from "chai";
import sinon from "sinon";
import { CancellationToken, createMessageConnection, Event } from "vscode-jsonrpc";
import ServerConnection from "../src/serverConnection";
import { Duplex } from "stream";
import { Inputs, ok, Platform, Stage, Void } from "@microsoft/teamsfx-api";
import { setFunc } from "../src/customizedFuncAdapter";
import * as tools from "@microsoft/teamsfx-core/build/common/tools";

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("serverConnections", () => {
  const sandbox = sinon.createSandbox();
  const up = new TestStream();
  const down = new TestStream();
  const msgConn = createMessageConnection(up as any, down as any);

  afterEach(() => {
    sandbox.restore();
  });

  it("connection", () => {
    const connection = new ServerConnection(msgConn);
    assert.equal(connection["connection"], msgConn);
  });

  it("listen", () => {
    const stub = sandbox.stub(msgConn, "listen");
    const connection = new ServerConnection(msgConn);
    connection.listen();
    assert.isTrue(stub.calledOnce);
  });

  it("getQuestionsRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns(undefined);
    sandbox.replace(connection["core"], "getQuestions", fake);
    const stage = Stage.create;
    const inputs = { platform: Platform.VS };
    const token = {};
    const res = connection.getQuestionsRequest(stage, inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok(undefined));
    });
  });

  it("createProjectRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "createProject", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.createProjectRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("localDebugRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "localDebug", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.localDebugRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("preProvisionResourcesRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns({
      needAzureLogin: true,
      needM365Login: true,
      resolvedAzureSubscriptionId: undefined,
      resolvedAzureResourceGroupName: undefined,
    });
    sandbox.replace(connection["core"], "preProvisionForVS", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.preProvisionResourcesRequest(
      inputs as Inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(
        data,
        ok({
          needAzureLogin: true,
          needM365Login: true,
          resolvedAzureSubscriptionId: undefined,
          resolvedAzureResourceGroupName: undefined,
        })
      );
    });
  });

  it("provisionResourcesRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "provisionResources", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.provisionResourcesRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("deployArtifactsRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "deployArtifacts", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.deployArtifactsRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("deployTeamsAppManifestRequest should return {}", async () => {
    sandbox.stub(tools, "isV3Enabled").returns(false);
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.resolves(ok("test"));
    sandbox.replace(connection["core"], "executeUserTask", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = await connection.deployTeamsAppManifestRequest(
      inputs as Inputs,
      token as CancellationToken
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.deepEqual(res.value, {});
    }
  });

  it("deployTeamsAppManifestRequest - v3", async () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.resolves(ok("test"));
    sandbox.replace(connection["core"], "deployTeamsManifest", fake);
    sandbox.stub(tools, "isV3Enabled").returns(true);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = await connection.deployTeamsAppManifestRequest(
      inputs as Inputs,
      token as CancellationToken
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.deepEqual(res.value, {});
    }
    sandbox.restore();
  });

  it("buildArtifactsRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "buildArtifacts", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.buildArtifactsRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("buildArtifactsRequest - V3", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.resolves(ok("test"));
    sandbox.replace(connection["core"], "executeUserTask", fake);
    sandbox.stub(tools, "isV3Enabled").returns(true);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.buildArtifactsRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("publishApplicationRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "publishApplication", fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.publishApplicationRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("customizeLocalFuncRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    const id = setFunc(fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.customizeLocalFuncRequest(
      id,
      inputs as Inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("customizeValidateFuncRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    const id = setFunc(fake);
    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.customizeValidateFuncRequest(
      id,
      inputs,
      inputs as Inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("customizeOnSelectionChangeFuncRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    const id = setFunc(fake);
    const inputs = new Set<string>("test");
    const token = {};
    const res = connection.customizeOnSelectionChangeFuncRequest(
      id,
      inputs,
      inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("getSideloadingStatusRequest", () => {
    const connection = new ServerConnection(msgConn);
    const accountToken = {
      token: "test token",
    };
    const cancelToken = {};
    const res = connection.getSideloadingStatusRequest(
      accountToken,
      cancelToken as CancellationToken
    );
    res.then((data) => {
      assert.equal(data, ok("undefined"));
    });
  });

  it("addSsoRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns("test");
    sandbox.replace(connection["core"], "createProject", fake);

    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.addSsoRequest(inputs as Inputs, token as CancellationToken);
    res.then((data) => {
      assert.equal(data, ok("test"));
    });
  });

  it("getProjectMigrationStatusRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.returns({
      currentVersion: "3.0.0",
      isSupport: 0,
      trackingId: "1234-3213-4325-1231",
    });
    sandbox.replace(connection["core"], "projectVersionCheck", fake);

    const inputs = {
      platform: "vs",
    };
    const token = {};
    const res = connection.getProjectMigrationStatusRequest(
      inputs as Inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(data.isOk(), true);
    });
  });

  it("migrateProjectRequest - ok(true)", async () => {
    const connection = new ServerConnection(msgConn);
    sandbox.replace(connection["core"], "phantomMigrationV3", sandbox.fake.returns(Void));
    connection
      .migrateProjectRequest(
        {
          platform: "vs",
        } as Inputs,
        {} as CancellationToken
      )
      .then((data) => {
        assert.equal(data, ok(true));
      });
  });

  it("migrateProjectRequest - ok(false)", async () => {
    const connection = new ServerConnection(msgConn);
    sandbox.replace(connection["core"], "phantomMigrationV3", sandbox.fake.returns("test"));
    connection
      .migrateProjectRequest(
        {
          platform: "vs",
        } as Inputs,
        {} as CancellationToken
      )
      .then((data) => {
        assert.equal(data, ok(false));
      });
  });

  it("publishInDeveloperPortalRequest", () => {
    const connection = new ServerConnection(msgConn);
    const fake = sandbox.fake.resolves(ok(Void));
    sandbox.replace(connection["core"], "publishInDeveloperPortal", fake);
    const inputs = {
      platform: "vs",
      projectPath: "test",
      appPackage: "appPackage",
    };
    const token = {};
    const res = connection.publishInDeveloperPortalRequest(
      inputs as Inputs,
      token as CancellationToken
    );
    res.then((data) => {
      assert.equal(data.isOk(), true);
    });
  });
});
