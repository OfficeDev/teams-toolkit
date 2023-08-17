import {
  CLICommandOption,
  CLIContext,
  CLIFoundCommand,
  LogLevel,
  SystemError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  FxCore,
  InputValidationError,
  MissingEnvironmentVariablesError,
  UserCancelError,
} from "@microsoft/teamsfx-core";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as sinon from "sinon";
import * as activate from "../../src/activate";
import { getFxCore, resetFxCore } from "../../src/activate";
import { engine } from "../../src/commands/engine";
import { start } from "../../src/commands/index";
import { listCapabilitiesCommand } from "../../src/commands/models";
import { getCreateCommand } from "../../src/commands/models/create";
import { createSampleCommand } from "../../src/commands/models/createSample";
import { rootCommand } from "../../src/commands/models/root";
import { logger } from "../../src/commonlib/logger";
import { InvalidChoiceError } from "../../src/error";
import * as main from "../../src/index";
import CliTelemetry from "../../src/telemetry/cliTelemetry";
import { getVersion } from "../../src/utils";

describe("CLI Engine", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(process, "exit");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("findCommand", async () => {
    it("should find new template command", async () => {
      const result = engine.findCommand(rootCommand, ["new", "sample"]);
      assert.equal(result.cmd.name, createSampleCommand.name);
      assert.deepEqual(result.remainingArgs, []);
    });
  });
  describe("parseArgs", async () => {
    it("array type options", async () => {
      const command: CLIFoundCommand = {
        name: "test",
        fullName: "test",
        description: "test command",
        options: [
          {
            type: "array",
            name: "option1",
            description: "test option",
          },
        ],
      };
      const ctx: CLIContext = {
        command: command,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const result = engine.parseArgs(ctx, rootCommand, ["--option1", "a,b,c"], []);
      assert.isTrue(result.isOk());
      assert.deepEqual(ctx.optionValues["option1"], ["a", "b", "c"]);
    });
    it("array type options 2", async () => {
      const command: CLIFoundCommand = {
        name: "test",
        fullName: "test",
        description: "test command",
        options: [
          {
            type: "array",
            name: "option1",
            description: "test option",
          },
        ],
      };
      const ctx: CLIContext = {
        command: command,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const result = engine.parseArgs(
        ctx,
        rootCommand,
        ["--option1", "a", "--option1", "b", "--option1", "c"],
        []
      );
      assert.isTrue(result.isOk());
      assert.deepEqual(ctx.optionValues["option1"], ["a", "b", "c"]);
    });
    it("array type options 3", async () => {
      const command: CLIFoundCommand = {
        name: "test",
        fullName: "test",
        description: "test command",
        options: [
          {
            type: "array",
            name: "option1",
            description: "test option",
          },
        ],
      };
      const ctx: CLIContext = {
        command: command,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const result = engine.parseArgs(ctx, rootCommand, ["--option1=a,b,c"], []);
      assert.isTrue(result.isOk());
      assert.deepEqual(ctx.optionValues["option1"], ["a", "b", "c"]);
    });
  });
  describe("validateOption", async () => {
    it("InvalidChoiceError", async () => {
      const option: CLICommandOption = {
        type: "array",
        description: "test",
        name: "test",
        choices: ["a", "b", "c"],
        value: ["d"],
      };
      const result = engine.validateOption(
        { name: "test", fullName: "test", description: "" },
        option,
        "option"
      );
      assert.isTrue(result.isErr() && result.error instanceof InvalidChoiceError);
    });
  });
  describe("processResult", async () => {
    it("sendTelemetryErrorEvent", async () => {
      const sendTelemetryErrorEventStub = sandbox
        .stub(CliTelemetry, "sendTelemetryErrorEvent")
        .returns();
      sandbox.stub(logger, "outputError").returns();
      const ctx: CLIContext = {
        command: { ...getCreateCommand(), fullName: "abc" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      await engine.processResult(ctx, new InputValidationError("test", "no reason"));
      assert.isTrue(sendTelemetryErrorEventStub.calledOnce);
    });
  });
  describe("start", async () => {
    it("command not found", async () => {
      sandbox.stub(process, "argv").value(["node", "cli", "abc123"]);
      const stub = sandbox.stub(engine, "printError").returns();
      await engine.start(rootCommand);
      assert.isTrue(stub.called);
    });
    it("command has no handler", async () => {
      sandbox.stub(process, "argv").value(["node", "cli", "list", "capabilities"]);
      sandbox.stub(listCapabilitiesCommand, "handler").value(undefined);
      await engine.start(rootCommand);
    });
    it("should display version", async () => {
      sandbox.stub(process, "argv").value(["node", "cli", "--version"]);
      const loggerStub = sandbox.stub(logger, "info");
      await engine.start(rootCommand);
      assert.isTrue(loggerStub.calledWith(getVersion()));
    });
    it("should display help message", async () => {
      sandbox.stub(process, "argv").value(["node", "cli", "-h"]);
      const loggerStub = sandbox.stub(logger, "info");
      await engine.start(rootCommand);
      assert.isTrue(loggerStub.calledOnce);
    });
    it("should validation failed for capability", async () => {
      sandbox
        .stub(process, "argv")
        .value(["node", "cli", "new", "-c", "tab", "-n", "myapp", "-i", "false"]);
      let error: any = {};
      sandbox.stub(engine, "processResult").callsFake(async (context, fxError) => {
        error = fxError;
      });
      await engine.start(rootCommand);
      assert.isTrue(error && error instanceof InvalidChoiceError);
    });
    it("should run command with argument success", async () => {
      sandbox.stub(activate, "getFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createSampleProject").resolves(ok({ projectPath: "..." }));
      sandbox
        .stub(process, "argv")
        .value(["node", "cli", "new", "sample", "hello-world-tab-with-backend", "-i", "false"]);
      const loggerStub = sandbox.stub(logger, "info");
      await engine.start(rootCommand);
      assert.isTrue(loggerStub.calledOnce);
    });
    it("should validate argument failed", async () => {
      sandbox.stub(createSampleCommand, "arguments").value([
        {
          type: "string",
          name: "sample",
          description: "Select a sample app to create",
          choices: ["a", "b", "c"],
        },
      ]);
      sandbox.stub(FxCore.prototype, "createSampleProject").resolves(ok({ projectPath: "..." }));
      sandbox.stub(process, "argv").value(["node", "cli", "new", "sample", "d", "-i", "false"]);
      let error: any = {};
      sandbox.stub(engine, "processResult").callsFake(async (context, fxError) => {
        error = fxError;
      });
      sandbox.stub(logger, "info");
      await engine.start(rootCommand);
      assert.isTrue(error instanceof InvalidChoiceError);
    });
    it("should discard useless args and options for interactive mode", async () => {
      sandbox.stub(FxCore.prototype, "createSampleProject").resolves(ok({ projectPath: "..." }));
      sandbox.stub(process, "argv").value(["node", "cli", "new", "sample", "abc"]);
      const stub = sandbox.stub(logger, "info");
      await engine.start(rootCommand);
      assert.isTrue(stub.called);
    });
    it("should run handler return error", async () => {
      sandbox.stub(process, "argv").value(["node", "cli"]);
      const command: CLIFoundCommand = {
        name: "test",
        description: "test",
        fullName: "test",
        handler: async () => err(new UserCancelError()),
      };
      let error: any = {};
      sandbox.stub(engine, "processResult").callsFake(async (context, fxError) => {
        error = fxError;
      });
      await engine.start(command);
      assert.isTrue(error instanceof UserCancelError);
    });
    it("should run handler throw error", async () => {
      sandbox.stub(process, "argv").value(["node", "cli"]);
      const command: CLIFoundCommand = {
        name: "test",
        description: "test",
        fullName: "test",
        handler: async () => {
          throw new UserCancelError();
        },
      };
      let error: any = {};
      sandbox.stub(engine, "processResult").callsFake(async (context, fxError) => {
        error = fxError;
      });
      await engine.start(command);
      assert.isTrue(error instanceof UserCancelError);
    });
  });
  describe("index.start", async () => {
    it("happy path", async () => {
      sandbox.stub(main, "initTelemetryReporter").returns();
      sandbox.stub(engine, "start").resolves();
      await start();
      assert.isTrue(true);
    });
  });
  describe("getFxCore", async () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });
    it("new logger", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMSFX_CLI_NEW_UX: "true",
      });
      resetFxCore();
      getFxCore();
    });
    it("old logger", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMSFX_CLI_NEW_UX: "false",
      });
      resetFxCore();
      getFxCore();
    });
  });
  describe("printError", async () => {
    it("happy path user error", async () => {
      sandbox.stub(logger, "info").resolves();
      sandbox.stub(logger, "debug").resolves();
      const stub = sandbox.stub(logger, "outputError").returns();
      engine.printError(new MissingEnvironmentVariablesError("test", "test"));
      assert.isTrue(stub.called);
    });
    it("happy path system error", async () => {
      sandbox.stub(logger, "logLevel").value(LogLevel.Debug);
      const stub = sandbox.stub(logger, "debug").resolves();
      sandbox.stub(logger, "outputError").returns();
      const error = new SystemError({ issueLink: "http://aka.ms/teamsfx-cli-help" });
      engine.printError(error);
      assert.isTrue(stub.called);
    });
    it("happy path inner error", async () => {
      sandbox.stub(logger, "logLevel").value(LogLevel.Debug);
      const stub = sandbox.stub(logger, "debug").resolves();
      sandbox.stub(logger, "outputError").returns();
      const error = new SystemError({ issueLink: "http://aka.ms/teamsfx-cli-help" });
      const innerError = new Error("test");
      error.innerError = innerError;
      error.message = "";
      error.stack = undefined;
      engine.printError(error);
      innerError.stack = undefined;
      engine.printError(error);
      assert.isTrue(stub.called);
    });
    it("canceled", async () => {
      const stub = sandbox.stub(logger, "info").resolves();
      engine.printError(new UserCancelError("test"));
      assert.isTrue(stub.called);
    });
  });
});
