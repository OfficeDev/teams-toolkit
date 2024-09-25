import * as chai from "chai";
import chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as status from "../../../../src/chat/commands/nextstep/status";
import * as helper from "../../../../src/chat/commands/nextstep/helper";
import { MachineStatus, WholeStatus } from "../../../../src/chat/commands/nextstep/types";
import * as projectStatusUtils from "../../../../src/utils/projectStatusUtils";

chai.use(chaiPromised);

describe("chat nextstep status", () => {
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("func: getWholeStatus", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("folder === undefined", async () => {
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").resolves(true);
      sandbox.stub(helper, "globalStateUpdate");
      await chai.expect(status.getWholeStatus()).to.eventually.deep.equal({
        machineStatus: {
          azureLoggedIn: true,
          firstInstalled: true,
          m365LoggedIn: true,
        },
      } as WholeStatus);
    });

    it("folder !== undefined", async () => {
      sandbox.stub(helper, "getProjectMetadata").returns({ projectId: "test-id" });
      sandbox
        .stub(projectStatusUtils, "getProjectStatus")
        .resolves(projectStatusUtils.emptyProjectStatus());
      sandbox.stub(projectStatusUtils, "getFileModifiedTime").resolves(new Date(0));
      sandbox.stub(projectStatusUtils, "getREADME").resolves(undefined);
      sandbox.stub(projectStatusUtils, "getLaunchJSON").resolves(undefined);
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").resolves(true);
      sandbox.stub(helper, "globalStateUpdate");
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
        },
      } as WholeStatus);
    });

    it("folder !== undefined (no project id)", async () => {
      sandbox.stub(helper, "getProjectMetadata").returns(undefined);
      sandbox
        .stub(projectStatusUtils, "getProjectStatus")
        .resolves(projectStatusUtils.emptyProjectStatus());
      sandbox.stub(projectStatusUtils, "getFileModifiedTime").resolves(new Date(0));
      sandbox.stub(projectStatusUtils, "getREADME").resolves(undefined);
      sandbox.stub(projectStatusUtils, "getLaunchJSON").resolves(undefined);
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").resolves(true);
      sandbox.stub(helper, "globalStateUpdate");
      await chai.expect(status.getWholeStatus("test-folder")).to.eventually.deep.equal({
        machineStatus: {
          azureLoggedIn: true,
          firstInstalled: true,
          m365LoggedIn: true,
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
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("func: getMachineStatus", async () => {
      sandbox.stub(helper, "checkCredential").resolves({ m365LoggedIn: true, azureLoggedIn: true });
      sandbox.stub(helper, "globalStateGet").resolves(true);
      sandbox.stub(helper, "globalStateUpdate");
      await chai.expect(status.getMachineStatus()).to.eventually.deep.equal({
        azureLoggedIn: true,
        firstInstalled: true,
        m365LoggedIn: true,
      } as MachineStatus);
    });
  });
});
