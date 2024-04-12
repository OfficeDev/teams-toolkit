import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as helper from "../../../src/chat/commands/nextstep/helper";
import { WholeStatus } from "../../../src/chat/commands/nextstep/types";
import * as projectStatusUtils from "../../../src/utils/projectStatusUtils";
import * as status from "../../../src/officeChat/commands/nextStep/status";
import * as fx from "fs-extra";

chai.use(chaiPromised);

describe("office steps: getWholeStatus", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("folder !== undefined", async () => {
    sandbox.stub(helper, "getFixedCommonProjectSettings").returns({ projectId: "test-id" });
    sandbox
      .stub(projectStatusUtils, "getProjectStatus")
      .resolves(projectStatusUtils.emptyProjectStatus());
    sandbox.stub(projectStatusUtils, "getFileModifiedTime").resolves(new Date(0));
    sandbox.stub(projectStatusUtils, "getREADME").resolves(undefined);
    sandbox.stub(projectStatusUtils, "getLaunchJSON").resolves(undefined);
    sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
    sandbox.stub(helper, "globalStateGet").resolves(true);
    sandbox.stub(helper, "globalStateUpdate");
    sandbox.stub(fx, "pathExists").resolves(true);
    await chai.expect(status.getWholeStatus("test-folder")).to.eventually.deep.equal({
      machineStatus: {
        azureLoggedIn: true,
        firstInstalled: true,
        m365LoggedIn: true,
      },
      projectOpened: {
        path: "test-folder",
        projectId: "test-id",
        codeModifiedTime: {
          source: new Date(0),
          infra: new Date(0),
        },
        actionStatus: projectStatusUtils.emptyProjectStatus(),
        readmeContent: undefined,
        launchJSONContent: undefined,
        nodeModulesExist: true,
      },
    } as WholeStatus);
  });
});
