import * as sinon from "sinon";
import * as chai from "chai";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { checkCopilotCallback } from "../../src/handlers/checkCopilotCallback";
import { ok } from "@microsoft/teamsfx-api";

describe("checkCopilotCallback", () => {
  const sandbox = sinon.createSandbox();
  it("checkCopilotCallback()", async () => {
    sandbox.stub(localizeUtils, "localize").returns("");
    let showMessageCalledCount = 0;
    sandbox.stub(vsc_ui, "VS_CODE_UI").value({
      showMessage: async () => {
        showMessageCalledCount += 1;
        return Promise.resolve(ok("Enroll"));
      },
    });

    checkCopilotCallback();

    chai.expect(showMessageCalledCount).to.be.equal(1);
  });
});
