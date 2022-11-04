// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import { describe, it } from "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import { Lifecycle } from "../../../src/component/configManager/lifecycle";
import Container from "typedi";
import { DriverDefinition } from "../../../src/component/configManager/interface";
import {
  MockedAzureAccountProvider,
  MockedLogProvider,
  MockedM365Provider,
  MockedTelemetryReporter,
  MockedUserInteraction,
} from "../../plugins/solution/util";
import { DriverContext } from "../../../src/component/driver/interface/commonArgs";
import { Platform, Result, FxError, ok, err, SystemError } from "@microsoft/teamsfx-api";
import { StepDriver } from "../../../src/component/driver/interface/stepDriver";

const mockedDriverContext: DriverContext = {
  m365TokenProvider: new MockedM365Provider(),
  azureAccountProvider: new MockedAzureAccountProvider(),
  ui: new MockedUserInteraction(),
  logProvider: new MockedLogProvider(),
  telemetryReporter: new MockedTelemetryReporter(),
  projectPath: "",
  platform: Platform.VSCode,
};

class DriverA implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map([["OUTPUT_A", "VALUE_A"]]));
  }
}

class DriverB implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map([["OUTPUT_B", "VALUE_B"]]));
  }
}

class DriverThatCapitalize implements StepDriver {
  async run(
    args: { INPUT_A: string },
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map([["OUTPUT", args.INPUT_A.toUpperCase()]]));
  }
}

class DriverThatLowercase implements StepDriver {
  async run(
    args: { INPUT_A: string },
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map([["OUTPUT_C", args.INPUT_A.toLowerCase()]]));
  }
}

class DriverThatHasNestedArgs implements StepDriver {
  async run(
    args: { key: [{ key1: string }] },
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map([["OUTPUT_D", args.key.map((e) => e.key1).join(",")]]));
  }
}

const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

class DriverThatUsesEnvField implements StepDriver {
  async run(
    args: { key: [{ key1: string }] },
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    if (process.env["ENV_VAR1"]) {
      return ok(new Map([["OUTPUT_E", process.env["ENV_VAR1"]]]));
    } else {
      return err(mockedError);
    }
  }
}

describe("v3 lifecyle", () => {
  describe("when driver name not found", () => {
    const sandbox = sinon.createSandbox();
    before(() => {
      sandbox.stub(Container, "has").returns(false);
    });

    afterEach(() => {
      sandbox.restore();
    });
    it("should return error", async () => {
      const driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        name: "xxx",
        uses: "xxx",
        with: {},
      });

      const lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(result.isErr() && result.error.name === "DriverNotFoundError");

      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(
        execResult.isErr() &&
          execResult.error.kind === "Failure" &&
          execResult.error.error.name === "DriverNotFoundError"
      );
    });
  });

  describe("when run/execute with multiple drivers", () => {
    class DriverThatReturnsError implements StepDriver {
      async run(
        args: unknown,
        context: DriverContext
      ): Promise<Result<Map<string, string>, FxError>> {
        const fxError: FxError = {
          name: "fakeError",
          message: "fake message",
          source: "xxx",
          timestamp: new Date(),
        };
        return err(fxError);
      }
    }

    const sandbox = sinon.createSandbox();
    before(() => {
      sandbox
        .stub(Container, "has")
        .withArgs(sandbox.match("DriverA"))
        .returns(true)
        .withArgs(sandbox.match("DriverB"))
        .returns(true)
        .withArgs(sandbox.match("DriverThatReturnsError"))
        .returns(true);
      sandbox
        .stub(Container, "get")
        .withArgs(sandbox.match("DriverA"))
        .returns(new DriverA())
        .withArgs(sandbox.match("DriverB"))
        .returns(new DriverB())
        .withArgs(sandbox.match("DriverThatReturnsError"))
        .returns(new DriverThatReturnsError());
    });

    after(() => {
      sandbox.restore();
    });

    it("should return combined output", async () => {
      const driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        name: "xxx",
        uses: "DriverA",
        with: {},
      });
      driverDefs.push({
        name: "xxx",
        uses: "DriverB",
        with: {},
      });

      const lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 0 &&
          result.value.env.size === 2 &&
          result.value.env.get("OUTPUT_A") === "VALUE_A" &&
          result.value.env.get("OUTPUT_B") === "VALUE_B"
      );

      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(
        execResult.isOk() &&
          execResult.value.size === 2 &&
          execResult.value.get("OUTPUT_A") === "VALUE_A" &&
          execResult.value.get("OUTPUT_B") === "VALUE_B"
      );
    });

    it("should return error if one of the driver returns error", async () => {
      const driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        name: "xxx",
        uses: "DriverA",
        with: {},
      });
      driverDefs.push({
        name: "xxx",
        uses: "DriverB",
        with: {},
      });

      driverDefs.push({
        name: "xxx",
        uses: "DriverThatReturnsError",
        with: {},
      });

      const lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(result.isErr() && result.error.name === "fakeError");

      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(
        execResult.isErr() &&
          execResult.error.kind === "PartialSuccess" &&
          execResult.error.reason.kind === "DriverError" &&
          execResult.error.reason.failedDriver.uses === "DriverThatReturnsError" &&
          execResult.error.reason.error.name === "fakeError" &&
          execResult.error.env.size === 2 &&
          execResult.error.env.get("OUTPUT_A") === "VALUE_A" &&
          execResult.error.env.get("OUTPUT_B") === "VALUE_B"
      );
    });
  });

  describe("when run/execute with valid placeholders", async () => {
    const sandbox = sinon.createSandbox();
    let restoreFn: RestoreFn | undefined = undefined;

    before(() => {
      restoreFn = mockedEnv({
        SOME_ENV_VAR: "xxx",
      });
      sandbox.stub(Container, "has").withArgs(sandbox.match("DriverThatCapitalize")).returns(true);
      sandbox
        .stub(Container, "get")
        .withArgs(sandbox.match("DriverThatCapitalize"))
        .returns(new DriverThatCapitalize());
    });

    after(() => {
      if (restoreFn) {
        restoreFn();
      }
      sandbox.restore();
    });

    it("should replace all placeholders", async () => {
      let driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }}" },
      });

      let lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 0 &&
          result.value.env.get("OUTPUT") === "HELLO XXX"
      );

      assert((driverDefs[0].with as any).INPUT_A === "hello xxx");

      driverDefs = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }}" },
      });

      lifecycle = new Lifecycle("configureApp", driverDefs);
      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(execResult.isOk() && execResult.value.get("OUTPUT") === "HELLO XXX");

      assert((driverDefs[0].with as any).INPUT_A === "hello xxx");
    });
  });

  describe("when dealing with multiple valid placeholders", async () => {
    const sandbox = sinon.createSandbox();
    let restoreFn: RestoreFn | undefined = undefined;

    before(() => {
      restoreFn = mockedEnv({
        SOME_ENV_VAR: "xxx",
        OTHER_ENV_VAR: "yyy",
      });
      sandbox
        .stub(Container, "has")
        .withArgs(sandbox.match("DriverThatCapitalize"))
        .returns(true)
        .withArgs(sandbox.match("DriverThatLowercase"))
        .returns(true)
        .withArgs(sandbox.match("DriverThatHasNestedArgs"))
        .returns(true)
        .withArgs(sandbox.match("DriverThatUsesEnvField"))
        .returns(true);
      sandbox
        .stub(Container, "get")
        .withArgs(sandbox.match("DriverThatCapitalize"))
        .returns(new DriverThatCapitalize())
        .withArgs(sandbox.match("DriverThatLowercase"))
        .returns(new DriverThatLowercase())
        .withArgs(sandbox.match("DriverThatHasNestedArgs"))
        .returns(new DriverThatHasNestedArgs())
        .withArgs(sandbox.match("DriverThatUsesEnvField"))
        .returns(new DriverThatUsesEnvField());
    });

    after(() => {
      if (restoreFn) {
        restoreFn();
      }
      sandbox.restore();
    });

    it("should replace all placeholders for a single driver", async () => {
      let driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }} and ${{OTHER_ENV_VAR}}" },
      });

      let lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 0 &&
          result.value.env.get("OUTPUT") === "HELLO XXX AND YYY"
      );

      driverDefs = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }} and ${{OTHER_ENV_VAR}}" },
      });

      lifecycle = new Lifecycle("configureApp", driverDefs);
      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(execResult.isOk() && execResult.value.get("OUTPUT") === "HELLO XXX AND YYY");
    });

    it("should replace all placeholders for every driver", async () => {
      let driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }}" },
      });
      driverDefs.push({
        uses: "DriverThatLowercase",
        with: { INPUT_A: "Hello ${{OTHER_ENV_VAR}}" },
      });

      let lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 0 &&
          result.value.env.get("OUTPUT") === "HELLO XXX" &&
          result.value.env.get("OUTPUT_C") === "hello yyy"
      );

      driverDefs = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }}" },
      });
      driverDefs.push({
        uses: "DriverThatLowercase",
        with: { INPUT_A: "Hello ${{OTHER_ENV_VAR}}" },
      });

      lifecycle = new Lifecycle("configureApp", driverDefs);
      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(
        execResult.isOk() &&
          execResult.value.get("OUTPUT") === "HELLO XXX" &&
          execResult.value.get("OUTPUT_C") === "hello yyy"
      );
    });

    it("should replace all placeholders for every driver with nested args", async () => {
      let driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatHasNestedArgs",
        with: {
          key: [{ key1: "hello ${{ SOME_ENV_VAR }}" }, { key1: "hello ${{ OTHER_ENV_VAR }}" }],
        },
      });

      let lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 0 &&
          result.value.env.get("OUTPUT_D") === "hello xxx,hello yyy"
      );

      driverDefs = [];
      driverDefs.push({
        uses: "DriverThatHasNestedArgs",
        with: {
          key: [{ key1: "hello ${{ SOME_ENV_VAR }}" }, { key1: "hello ${{ OTHER_ENV_VAR }}" }],
        },
      });

      lifecycle = new Lifecycle("configureApp", driverDefs);
      const execResult = await lifecycle.execute(mockedDriverContext);
      assert(execResult.isOk() && execResult.value.get("OUTPUT_D") === "hello xxx,hello yyy");
    });

    describe("execute()", async () => {
      it("should resolve inter-driver dependency", async () => {
        const driverDefs: DriverDefinition[] = [];
        driverDefs.push({
          uses: "DriverThatCapitalize",
          with: { INPUT_A: "hello ${{ SOME_ENV_VAR }}" },
        });
        // OUTPUT is a placeholder for the output of the previous driver
        driverDefs.push({
          uses: "DriverThatLowercase",
          with: { INPUT_A: "Hello ${{OUTPUT}}" },
        });

        const lifecycle = new Lifecycle("configureApp", driverDefs);
        const result = await lifecycle.execute(mockedDriverContext);
        assert(
          result.isOk() &&
            result.value.get("OUTPUT") === "HELLO XXX" &&
            result.value.get("OUTPUT_C") === "hello hello xxx"
        );
      });

      it("should resolve placeholders in env field", async () => {
        const driverDefs: DriverDefinition[] = [];
        driverDefs.push({
          uses: "DriverThatUsesEnvField",
          with: {},
          env: {
            ENV_VAR1: "hello ${{ SOME_ENV_VAR }}",
          },
        });

        const lifecycle = new Lifecycle("configureApp", driverDefs);
        const result = await lifecycle.execute(mockedDriverContext);
        assert(result.isOk() && result.value.get("OUTPUT_E") === "hello xxx");
      });
    });
  });

  describe("when dealing with unresolved placeholders", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox
        .stub(Container, "has")
        .withArgs(sandbox.match("DriverThatCapitalize"))
        .returns(true)
        .withArgs(sandbox.match("DriverThatLowercase"))
        .returns(true);
      sandbox
        .stub(Container, "get")
        .withArgs(sandbox.match("DriverThatCapitalize"))
        .returns(new DriverThatCapitalize())
        .withArgs(sandbox.match("DriverThatLowercase"))
        .returns(new DriverThatLowercase());
    });

    after(() => {
      sandbox.restore();
    });

    it("should return unresolved placeholders", async () => {
      const driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: "hello ${{ SOME_ENV_VAR }} ${{AAA}} ${{BBB}}" },
      });
      driverDefs.push({
        uses: "DriverThatLowercase",
        with: { INPUT_A: "${{CCC}} Hello ${{OTHER_ENV_VAR}}" },
      });

      const lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 5 &&
          result.value.unresolvedPlaceHolders.some((x) => x === "SOME_ENV_VAR") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "AAA") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "BBB") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "CCC") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "OTHER_ENV_VAR") &&
          result.value.env.size === 0
      );

      const unresolved = lifecycle.resolvePlaceholders();
      assert(
        unresolved.length === 5 &&
          unresolved.some((x) => x === "SOME_ENV_VAR") &&
          unresolved.some((x) => x === "AAA") &&
          unresolved.some((x) => x === "BBB") &&
          unresolved.some((x) => x === "CCC") &&
          unresolved.some((x) => x === "OTHER_ENV_VAR")
      );

      const execResult = await lifecycle.execute(mockedDriverContext);
      // execute() will fail at first driver because of unresolved placeholders and stops
      assert(
        execResult.isErr() &&
          execResult.error.kind === "PartialSuccess" &&
          execResult.error.reason.kind === "UnresolvedPlaceholders" &&
          execResult.error.reason.unresolvedPlaceHolders.length === 3 &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "SOME_ENV_VAR") &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "AAA") &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "BBB") &&
          execResult.error.reason.failedDriver.uses === "DriverThatCapitalize"
      );
    });

    it("should return unresolved placeholders with nested argument", async () => {
      const driverDefs: DriverDefinition[] = [];
      driverDefs.push({
        uses: "DriverThatCapitalize",
        with: { INPUT_A: ["hello ${{ SOME_ENV_VAR }} ${{AAA}} ${{BBB}}"] },
      });
      driverDefs.push({
        uses: "DriverThatLowercase",
        with: { INPUT_A: { a: "${{CCC}} Hello ${{OTHER_ENV_VAR}}" } },
      });

      const lifecycle = new Lifecycle("configureApp", driverDefs);
      const result = await lifecycle.run(mockedDriverContext);
      assert(
        result.isOk() &&
          result.value.unresolvedPlaceHolders.length === 5 &&
          result.value.unresolvedPlaceHolders.some((x) => x === "SOME_ENV_VAR") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "AAA") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "BBB") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "CCC") &&
          result.value.unresolvedPlaceHolders.some((x) => x === "OTHER_ENV_VAR") &&
          result.value.env.size === 0
      );

      const unresolved = lifecycle.resolvePlaceholders();
      assert(
        unresolved.length === 5 &&
          unresolved.some((x) => x === "SOME_ENV_VAR") &&
          unresolved.some((x) => x === "AAA") &&
          unresolved.some((x) => x === "BBB") &&
          unresolved.some((x) => x === "CCC") &&
          unresolved.some((x) => x === "OTHER_ENV_VAR")
      );

      const execResult = await lifecycle.execute(mockedDriverContext);
      // execute() will fail at first driver because of unresolved placeholders and stops
      assert(
        execResult.isErr() &&
          execResult.error.kind === "PartialSuccess" &&
          execResult.error.reason.kind === "UnresolvedPlaceholders" &&
          execResult.error.reason.unresolvedPlaceHolders.length === 3 &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "SOME_ENV_VAR") &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "AAA") &&
          execResult.error.reason.unresolvedPlaceHolders.some((x) => x === "BBB") &&
          execResult.error.reason.failedDriver.uses === "DriverThatCapitalize"
      );
    });
  });
});
