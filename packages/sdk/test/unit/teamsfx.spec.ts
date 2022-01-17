// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import * as sinon from "sinon";
import { createTeamsFx } from "../../src/container/teamsfx";
import { Component, ComponentContainer } from "../../src/container/types";
import { LogLevel, Logger, InternalLogger } from "../../src/util/logger";

class TestComponent implements Component {
  public name = "test";
  public version = "0.1.0";
  public logger?: Logger;

  initialize(container: ComponentContainer, logger: Logger): void {
    console.log("initialize");
    console.log(logger);
    this.logger = logger;
  }

  public test(): void {
    console.log("testing");
    console.log(this.logger);
    this.logger?.info("test message");
  }
}

type TestComponentApi = {
  test(): void;
};

describe("TeamsFxContainer Tests", () => {
  beforeEach(() => {});

  afterEach(() => {});

  it("copy the functions in component", () => {
    const component = new TestComponent();
    const testStub = sinon.stub(TestComponent.prototype, "test");
    const teamsfx = createTeamsFx<TestComponentApi>([component]);

    teamsfx.test();

    assert.isTrue(testStub.called);
    testStub.restore();
  });

  it("updates log level in component logger", () => {
    const component = new TestComponent();
    const teamsfx = createTeamsFx<TestComponentApi>([component]);

    teamsfx.setLogLevel(LogLevel.Info);
    (teamsfx as unknown as ComponentContainer).resolve("test");

    assert.strictEqual((component.logger as InternalLogger).level, LogLevel.Info);
  });

  it("sets custom logger successfully", () => {
    const unusedStub: sinon.SinonStub<any[], void> = sinon.stub();
    const infoStub: sinon.SinonStub<any[], void> = sinon.stub();
    const logger: Logger = {
      error: unusedStub,
      warn: unusedStub,
      info: infoStub,
      verbose: unusedStub,
    } as Logger;

    const component = new TestComponent();
    const teamsfx = createTeamsFx<TestComponentApi>([component]);

    teamsfx.setLogLevel(LogLevel.Info);
    console.log("set logger");
    teamsfx.setLogger(logger);
    (teamsfx as unknown as ComponentContainer).resolve("test");
    teamsfx.test();

    assert.isTrue(infoStub.called);
  });
});
