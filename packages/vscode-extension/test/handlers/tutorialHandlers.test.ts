import * as sinon from "sinon";
import * as chai from "chai";
import * as globalVariables from "../../src/globalVariables";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { OptionItem, ok } from "@microsoft/teamsfx-api";
import { TreatmentVariableValue } from "../../src/exp/treatmentVariables";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { selectTutorialsHandler } from "../../src/handlers/tutorialHandlers";

describe("tutorialHandlers", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("selectTutorialsHandler()", async () => {
    sandbox.stub(localizeUtils, "localize").returns("");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
    sandbox.stub(globalVariables, "isSPFxProject").value(false);
    let tutorialOptions: OptionItem[] = [];
    sandbox.stub(vsc_ui, "VS_CODE_UI").value({
      selectOption: (options: any) => {
        tutorialOptions = options.options;
        return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
      },
      openUrl: () => Promise.resolve(ok(true)),
    });

    const result = await selectTutorialsHandler();

    chai.assert.equal(tutorialOptions.length, 17);
    chai.assert.isTrue(result.isOk());
    chai.assert.equal(tutorialOptions[1].data, "https://aka.ms/teamsfx-notification-new");
  });

  it("selectTutorialsHandler() for SPFx projects - v3", async () => {
    sandbox.stub(localizeUtils, "localize").returns("");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
    sandbox.stub(globalVariables, "isSPFxProject").value(true);
    let tutorialOptions: OptionItem[] = [];
    sandbox.stub(vsc_ui, "VS_CODE_UI").value({
      selectOption: (options: any) => {
        tutorialOptions = options.options;
        return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
      },
      openUrl: () => Promise.resolve(ok(true)),
    });

    const result = await selectTutorialsHandler();

    chai.assert.equal(tutorialOptions.length, 1);
    chai.assert.isTrue(result.isOk());
    chai.assert.equal(tutorialOptions[0].data, "https://aka.ms/teamsfx-add-cicd-new");
  });
});
