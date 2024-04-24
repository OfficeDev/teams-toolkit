import * as chai from "chai";
import {
  canOfficeAddInPreviewInLocalEnv,
  isDependenciesInstalled,
} from "../../../../src/officeChat/commands/nextStep/condition";
import { OfficeWholeStatus } from "../../../../src/officeChat/commands/nextStep/types";

describe("office steps: canOfficeAddInPreviewInLocalEnv", () => {
  it('should return true when launchJSONContent includes "desktop (edge legacy)" or "desktop (edge chromium)"', () => {
    const result = canOfficeAddInPreviewInLocalEnv({
      projectOpened: {
        launchJSONContent: "desktop (edge legacy)",
      },
    } as OfficeWholeStatus);
    chai.assert.isTrue(result);
  });

  it('should return false when launchJSONContent does not include "desktop (edge legacy)" or "desktop (edge chromium)"', () => {
    const result = canOfficeAddInPreviewInLocalEnv({
      projectOpened: {
        launchJSONContent: "",
      },
    } as OfficeWholeStatus);
    chai.assert.isFalse(result);
  });

  it("should return false when projectOpened or launchJSONContent is not defined", () => {
    const result = canOfficeAddInPreviewInLocalEnv({} as OfficeWholeStatus);
    chai.assert.isFalse(result);
  });
});

describe("office steps: isDependenciesInstalled", () => {
  it("isDependenciesInstalled", () => {
    chai.assert.isTrue(
      isDependenciesInstalled({
        projectOpened: {
          nodeModulesExist: true,
        },
        machineStatus: {},
      } as OfficeWholeStatus)
    );

    chai.assert.isFalse(
      isDependenciesInstalled({
        projectOpened: {
          nodeModulesExist: false,
        },
        machineStatus: {},
      } as OfficeWholeStatus)
    );

    chai.assert.isFalse(isDependenciesInstalled({} as OfficeWholeStatus));
  });
});
