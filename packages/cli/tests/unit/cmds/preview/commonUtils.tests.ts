// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, ok } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import {
  createTaskStartCb,
  createTaskStopCb,
  generateAccountHint,
} from "../../../../src/cmds/preview/commonUtils";
import { signedIn, signedOut } from "../../../../src/commonlib/common/constant";
import M365TokenInstance from "../../../../src/commonlib/m365Login";
import { expect } from "../../utils";

describe("commonUtils", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("createTaskStartCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStartCallback = createTaskStartCb(progressHandler, "start message");
      await taskStartCallback("start", true);
      expect(progressHandler.start.calledOnce).to.be.true;
    });
  });
  describe("createTaskStopCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStopCallback = createTaskStopCb(progressHandler);
      await taskStopCallback("stop", true, {
        command: "command",
        success: true,
        stdout: [],
        stderr: [],
        exitCode: null,
      });
      expect(progressHandler.end.calledOnce).to.be.true;
    });
  });

  describe("generateAccountHint", () => {
    it("not signed", async () => {
      sandbox.stub(M365TokenInstance, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedOut,
            accountInfo: undefined,
          })
        )
      );
      const tenantIdFromConfig = "tenantIdFromConfig";
      expect(await generateAccountHint(tenantIdFromConfig, true)).to.deep.equals(
        `appTenantId=${tenantIdFromConfig}&login_hint=login_your_m365_account`
      );
      expect(await generateAccountHint(tenantIdFromConfig, false)).to.deep.equals(
        "login_hint=login_your_m365_account"
      );
    });

    it("signed", async () => {
      const tenantId = "tenantId";
      const upn = "upn";
      sandbox.stub(M365TokenInstance, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedIn,
            accountInfo: {
              tid: tenantId,
              upn,
            },
          })
        )
      );
      const tenantIdFromConfig = "tenantIdFromConfig";
      expect(await generateAccountHint(tenantIdFromConfig, true)).to.deep.equals(
        `appTenantId=${tenantId}&login_hint=${upn}`
      );
      expect(await generateAccountHint(tenantIdFromConfig, false)).to.deep.equals(
        `login_hint=${upn}`
      );
    });
  });
});

class MockProgressHandler implements IProgressHandler {
  start(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  next(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  end(success: boolean): Promise<void> {
    return Promise.resolve();
  }
}
