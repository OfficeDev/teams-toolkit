import * as sinon from "sinon";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { ok } from "@microsoft/teamsfx-api";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import { PanelType } from "../../src/controls/PanelType";
import { checkSideloadingCallback } from "../../src/handlers/checkSideloading";

describe("CheckSideloading", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("checkSideloadingCallback()", async () => {
    sandbox.stub(localizeUtils, "localize").returns("");
    let showMessageCalledCount = 0;
    sandbox.stub(vsc_ui, "VS_CODE_UI").value({
      showMessage: async () => {
        showMessageCalledCount += 1;
        return Promise.resolve(ok("Get More Info"));
      },
    });
    const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");

    checkSideloadingCallback();

    chai.expect(showMessageCalledCount).to.be.equal(1);
    sinon.assert.calledOnceWithExactly(createOrShow, PanelType.AccountHelp);
  });
});
