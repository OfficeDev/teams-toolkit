// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import { Browser } from "../../../../src/cmds/preview/constants";
import * as errors from "../../../../src/cmds/preview/errors";

describe("errors", () => {
  it("create errors", () => {
    let actualError = undefined;
    try {
      errors.WorkspaceNotSupported("test");
      errors.ExclusiveLocalRemoteOptions();
      errors.RequiredPathNotExists("test");
      errors.TaskFailed("test");
      errors.PreviewCommandFailed([]);
      errors.TeamsAppIdNotExists();
      errors.PortsAlreadyInUse([1]);
      errors.PreviewWithoutProvision();
      errors.MissingProgrammingLanguageSetting();
      errors.OpeningBrowserFailed(Browser.default);
      errors.NoUrlForSPFxRemotePreview();
      errors.InvalidSharePointSiteURL(new Error("test"));
      errors.DependencyCheckerFailed();
      errors.PrerequisitesValidationNodejsError("test", "test");
      errors.PrerequisitesValidationM365AccountError("test", "test");
      errors.NpmInstallFailed();
      errors.M365AccountInfoNotFound();
      errors.GetTeamsAppInstallationFailed(new Error("test"));
      errors.NotM365Project();
      errors.OnlyLaunchPageSupportedInOffice();
      errors.CannotDetectRunCommand();
    } catch (error) {
      actualError = error;
    }

    expect(actualError).to.be.undefined;
  });
});
