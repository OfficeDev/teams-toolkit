import { err, ok } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as status from "../../../../src/chat/commands/nextstep/status";
import * as helper from "../../../../src/chat/commands/nextstep/helper";
import { MachineStatus, WholeStatus } from "../../../../src/chat/commands/nextstep/types";
import { CommandKey } from "../../../../src/constants";
import * as projectStatusUtils from "../../../../src/utils/projectStatusUtils";
import * as handlers from "../../../../src/handlers";

chai.use(chaiPromised);

describe("chat nextstep status", () => {
  const sandbox = sinon.createSandbox();

  describe("func: getWholeStatus", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("folder === undefined", async () => {
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").callsFake(async (key: string, defaultValue?: any) => {
        if (key === "ms-teams-vscode-extension.welcomePage.shown") {
          return false;
        } else if (key === CommandKey.ValidateGetStartedPrerequisites) {
          return new Date(1711987200000).toString();
        }
        return undefined;
      });
      sandbox.stub(Date, "now").returns(1711987200000);
      await chai.expect(status.getWholeStatus()).to.eventually.deep.equal({
        machineStatus: {
          azureLoggedIn: true,
          firstInstalled: true,
          m365LoggedIn: true,
          resultOfPrerequistes: undefined,
        },
      } as WholeStatus);
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
      sandbox.stub(helper, "globalStateGet").callsFake(async (key: string, defaultValue?: any) => {
        if (key === "ms-teams-vscode-extension.welcomePage.shown") {
          return false;
        } else if (key === CommandKey.ValidateGetStartedPrerequisites) {
          return new Date(1711987200000).toString();
        }
        return undefined;
      });
      sandbox.stub(Date, "now").returns(1711987200000);
      await chai.expect(status.getWholeStatus("test-folder")).to.eventually.deep.equal({
        machineStatus: {
          azureLoggedIn: true,
          firstInstalled: true,
          m365LoggedIn: true,
          resultOfPrerequistes: undefined,
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
        },
      } as WholeStatus);
    });

    it("folder !== undefined (no project id)", async () => {
      sandbox.stub(helper, "getFixedCommonProjectSettings").returns(undefined);
      sandbox
        .stub(projectStatusUtils, "getProjectStatus")
        .resolves(projectStatusUtils.emptyProjectStatus());
      sandbox.stub(projectStatusUtils, "getFileModifiedTime").resolves(new Date(0));
      sandbox.stub(projectStatusUtils, "getREADME").resolves(undefined);
      sandbox.stub(projectStatusUtils, "getLaunchJSON").resolves(undefined);
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").callsFake(async (key: string, defaultValue?: any) => {
        if (key === "ms-teams-vscode-extension.welcomePage.shown") {
          return false;
        } else if (key === CommandKey.ValidateGetStartedPrerequisites) {
          return new Date(1711987200000).toString();
        }
        return undefined;
      });
      sandbox.stub(Date, "now").returns(1711987200000);
      await chai.expect(status.getWholeStatus("test-folder")).to.eventually.deep.equal({
        machineStatus: {
          azureLoggedIn: true,
          firstInstalled: true,
          m365LoggedIn: true,
          resultOfPrerequistes: undefined,
        },
        projectOpened: {
          path: "test-folder",
          projectId: undefined,
          codeModifiedTime: {
            source: new Date(0),
            infra: new Date(0),
          },
          actionStatus: projectStatusUtils.emptyProjectStatus(),
          readmeContent: undefined,
          launchJSONContent: undefined,
        },
      } as WholeStatus);
    });
  });

  describe("func: getMachineStatus", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("succeeds to run validateGetStartedPrerequisitesHandler", async () => {
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").callsFake(async (key: string, defaultValue?: any) => {
        if (key === "ms-teams-vscode-extension.welcomePage.shown") {
          return false;
        } else if (key === CommandKey.ValidateGetStartedPrerequisites) {
          return new Date(1711987200000).toString();
        }
        return undefined;
      });
      sandbox.stub(Date, "now").returns(1712073600000);
      sandbox.stub(handlers, "validateGetStartedPrerequisitesHandler").resolves(ok(undefined));
      const globalStateUpdateStub = sandbox.stub(helper, "globalStateUpdate").resolves(undefined);
      await chai.expect(status.getMachineStatus()).to.eventually.deep.equal({
        azureLoggedIn: true,
        firstInstalled: true,
        m365LoggedIn: true,
        resultOfPrerequistes: undefined,
      } as MachineStatus);
      chai.assert.isTrue(globalStateUpdateStub.calledOnce);
    });

    it("fails to run validateGetStartedPrerequisitesHandler", async () => {
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").callsFake(async (key: string, defaultValue?: any) => {
        if (key === "ms-teams-vscode-extension.welcomePage.shown") {
          return false;
        } else if (key === CommandKey.ValidateGetStartedPrerequisites) {
          return new Date(1711987200000).toString();
        }
        return undefined;
      });
      sandbox.stub(Date, "now").returns(1712073600000);
      sandbox
        .stub(handlers, "validateGetStartedPrerequisitesHandler")
        .resolves(err(new UserCancelError()));
      const globalStateUpdateStub = sandbox.stub(helper, "globalStateUpdate").resolves(undefined);
      await chai.expect(status.getMachineStatus()).to.eventually.deep.equal({
        azureLoggedIn: true,
        firstInstalled: true,
        m365LoggedIn: true,
        resultOfPrerequistes: "User canceled",
      } as MachineStatus);
      chai.assert.isFalse(globalStateUpdateStub.calledOnce);
    });
  });
});
