import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { MockTools } from "../../core/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockDriver } from "./helper";
import sinon from "sinon";
import { TelemetryConstants } from "../../../src/component/constants";
import { TeamsFxTelemetryReporter } from "../../../src/component/utils/teamsFxTelemetryReporter";
import { performance } from "perf_hooks";

chai.use(chaiAsPromised);

describe("Action Middleware", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  setTools(tools);

  afterEach(() => {
    sandbox.restore();
  });

  it("addStartAndEndTelemetry send correct cost time", async () => {
    const perfStub = sandbox.stub(performance, "now");
    perfStub.onFirstCall().returns(0);
    perfStub.onSecondCall().returns(1000);
    sandbox.stub(TeamsFxTelemetryReporter.prototype, "sendStartEvent");
    const sendEndEventStub = sandbox.stub(TeamsFxTelemetryReporter.prototype, "sendEndEvent");
    sendEndEventStub.callsFake((config) => {
      chai.assert.equal(config.measurements?.[TelemetryConstants.properties.timeCost], 1000);
    });

    await new MockDriver().execute(undefined, { telemetryReporter: {} as any } as any);

    chai.assert.isTrue(sendEndEventStub.called);
  });
});
