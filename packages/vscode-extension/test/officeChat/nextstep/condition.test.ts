import * as chai from "chai";
import { WholeStatus } from "../../../src/chat/commands/nextstep/types";
import { canOfficeAddInPreviewInLocalEnv } from "../../../src/officeChat/commands/nextStep/condition";
import * as condition from "../../../src/officeChat/commands/nextStep/condition";

describe("office steps: canOfficeAddInPreviewInLocalEnv", () => {
  it('should return true when launchJSONContent includes "desktop (edge legacy)" or "desktop (edge chromium)"', () => {
    const result = canOfficeAddInPreviewInLocalEnv({
      projectOpened: {
        launchJSONContent: "desktop (edge legacy)",
      },
    } as WholeStatus);
    chai.assert.isTrue(result);
  });

  it('should return false when launchJSONContent does not include "desktop (edge legacy)" or "desktop (edge chromium)"', () => {
    const result = canOfficeAddInPreviewInLocalEnv({
      projectOpened: {
        launchJSONContent: "",
      },
    } as WholeStatus);
    chai.assert.isFalse(result);
  });

  it("should return false when projectOpened or launchJSONContent is not defined", () => {
    const result = canOfficeAddInPreviewInLocalEnv({} as WholeStatus);
    chai.assert.isFalse(result);
  });
});

describe("office steps: isDependenciesInstalled", () => {
  it("isDependenciesInstalled", () => {
    chai.assert.isTrue(
      condition.isDependenciesInstalled({
        projectOpened: {
          nodeModulesExist: true,
        },
        machineStatus: {},
      } as WholeStatus)
    );

    chai.assert.isFalse(
      condition.isDependenciesInstalled({
        projectOpened: {
          nodeModulesExist: false,
        },
        machineStatus: {},
      } as WholeStatus)
    );

    chai.assert.isFalse(condition.isDependenciesInstalled({} as WholeStatus));
  });
});
