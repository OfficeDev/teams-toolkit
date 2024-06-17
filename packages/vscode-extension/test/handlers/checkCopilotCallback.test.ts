import * as sinon from "sinon";
import * as chai from "chai";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { checkCopilotCallback } from "../../src/handlers/checkCopilotCallback";
import { ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { ExtensionContext } from "vscode";

describe("checkCopilotCallback", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<ExtensionContext>{}));
  });

  it("checkCopilotCallback() and open url", async () => {
    sandbox.stub(localizeUtils, "localize").returns("Enroll");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const showMessageStub = sandbox.stub(vsc_ui.VS_CODE_UI, "showMessage").resolves(ok("Enroll"));
    const openUrlStub = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl");

    await checkCopilotCallback();

    chai.expect(showMessageStub.callCount).to.be.equal(1);
    chai.expect(openUrlStub.callCount).to.be.equal(1);
  });

  it("checkCopilotCallback() and fail to open url", async () => {
    sandbox.stub(localizeUtils, "localize").returns("");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const showMessageStub = sandbox.stub(vsc_ui.VS_CODE_UI, "showMessage").resolves(ok("Enroll"));
    const openUrlStub = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl");

    await checkCopilotCallback();

    chai.expect(showMessageStub.callCount).to.be.equal(1);
    chai.expect(openUrlStub.callCount).to.be.equal(0);
  });
});
