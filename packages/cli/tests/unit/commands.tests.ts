import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { createCommand } from "../../src/commands/models/create";
import * as activate from "../../src/activate";
import { FxCore, UserCancelError } from "@microsoft/teamsfx-core";
import { err, ok } from "@microsoft/teamsfx-api";
import { CLIContext } from "../../src/commands/types";

describe("CLI commands", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("createCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok("..."));
      const ctx: CLIContext = {
        command: createCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createCommand.handler(ctx);
      assert.isTrue(res.isOk());
    });
    it("core return error", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: createCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createCommand.handler(ctx);
      assert.isTrue(res.isErr());
    });
  });
});
