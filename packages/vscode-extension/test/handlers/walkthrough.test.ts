import * as handlers from "../../src/handlers";
import * as environmentUtils from "../../src/utils/environmentUtils";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { createProjectFromWalkthroughHandler } from "../../src/handlers/walkthrough";

import * as sinon from "sinon";
import { expect } from "chai";
import { Inputs, ok } from "@microsoft/teamsfx-api";

describe("walkthrough", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("create proejct from walkthrough", async () => {
    const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    const inputs = {} as Inputs;
    const systemInputsStub = sandbox.stub(environmentUtils, "getSystemInputs").callsFake(() => {
      return inputs;
    });
    //const systemInputsStub = sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
    const runCommandStub = sandbox.stub(handlers, "runCommand").resolves(ok(null));

    await createProjectFromWalkthroughHandler([
      "walkthrough",
      { "project-type": "custom-copilot-type", capabilities: "cutsom-copilot-agent" },
    ]);

    sandbox.assert.calledOnce(sendTelemetryEventStub);
    sandbox.assert.calledOnce(systemInputsStub);
    sandbox.assert.calledOnce(runCommandStub);

    expect(Object.keys(inputs)).lengthOf(2);
  });
});
