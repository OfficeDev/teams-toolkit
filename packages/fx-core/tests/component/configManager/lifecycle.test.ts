// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import { describe, it } from "mocha";
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
import { Platform, Result, FxError, ok, err } from "@microsoft/teamsfx-api";
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
    });
  });

  describe("when run with multiple drivers", () => {
    class DriverA implements StepDriver {
      async run(
        args: unknown,
        context: DriverContext
      ): Promise<Result<Map<string, string>, FxError>> {
        return ok(new Map([["OUTPUT_A", "VALUE_A"]]));
      }
    }

    class DriverB implements StepDriver {
      async run(
        args: unknown,
        context: DriverContext
      ): Promise<Result<Map<string, string>, FxError>> {
        return ok(new Map([["OUTPUT_B", "VALUE_B"]]));
      }
    }

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
          result.value.size === 2 &&
          result.value.get("OUTPUT_A") === "VALUE_A" &&
          result.value.get("OUTPUT_B") === "VALUE_B"
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
    });
  });
});
