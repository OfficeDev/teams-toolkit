import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { createCommand } from "../../src/commands/models/create";
import * as activate from "../../src/activate";
import { FxCore, UserCancelError } from "@microsoft/teamsfx-core";
import { err, ok } from "@microsoft/teamsfx-api";
import { CLIContext } from "../../src/commands/types";
import { createSampleCommand } from "../../src/commands/models/createSample";
import * as utils from "../../src/utils";
import { listSampleCommand } from "../../src/commands/models/listSamples";
import { logger } from "../../src/commonlib/logger";

describe("CLI commands", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(logger, "info").resolves(true);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("createCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok({ projectPath: "..." }));
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

  describe("createSampleCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok({ projectPath: "..." }));
      const ctx: CLIContext = {
        command: createSampleCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createSampleCommand.handler(ctx);
      assert.isTrue(res.isOk());
    });
    it("core return error", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: createSampleCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createSampleCommand.handler(ctx);
      assert.isTrue(res.isErr());
    });
  });
  describe("listSampleCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(utils, "getTemplates").resolves([]);
      const ctx: CLIContext = {
        command: listSampleCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await listSampleCommand.handler(ctx);
      assert.isTrue(res.isOk());
    });
  });
});
