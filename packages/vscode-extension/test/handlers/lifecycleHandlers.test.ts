import { err } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import * as sinon from "sinon";
import { provisionHandler } from "../../src/handlers/lifecycleHandlers";
import * as shared from "../../src/handlers/sharedOpts";

describe("Lifecycle handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });
  describe("provision handlers", () => {
    it("error", async () => {
      sandbox.stub(shared, "runCommand").resolves(err(new UserCancelError()));
      const res = await provisionHandler();
      assert.isTrue(res.isErr());
    });
  });
});
