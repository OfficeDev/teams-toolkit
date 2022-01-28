// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";

import { err, ok, returnUserError } from "@microsoft/teamsfx-api";

import { UserSettings } from "../../../../src/userSetttings";
import { getAutomaticNpmInstallSetting } from "../../../../src/cmds/preview/npmInstallHandler";
import { expect } from "../../utils";
import { cliSource } from "../../../../src/constants";

describe("getAutomaticNpmInstallSetting", () => {
  const automaticNpmInstallOption = "automatic-npm-install";

  afterEach(() => {
    sinon.restore();
  });

  it("on", () => {
    sinon.stub(UserSettings, "getConfigSync").returns(
      ok({
        [automaticNpmInstallOption]: "on",
      })
    );
    expect(getAutomaticNpmInstallSetting()).to.be.true;
  });

  it("off", () => {
    sinon.stub(UserSettings, "getConfigSync").returns(
      ok({
        [automaticNpmInstallOption]: "off",
      })
    );
    expect(getAutomaticNpmInstallSetting()).to.be.false;
  });

  it("others", () => {
    sinon.stub(UserSettings, "getConfigSync").returns(
      ok({
        [automaticNpmInstallOption]: "others",
      })
    );
    expect(getAutomaticNpmInstallSetting()).to.be.true;
  });

  it("none", () => {
    sinon.stub(UserSettings, "getConfigSync").returns(ok({}));
    expect(getAutomaticNpmInstallSetting()).to.be.false;
  });

  it("getConfigSync error", () => {
    const error = returnUserError(new Error("Test"), cliSource, "Test");
    sinon.stub(UserSettings, "getConfigSync").returns(err(error));
    expect(getAutomaticNpmInstallSetting()).to.be.false;
  });

  it("getConfigSync exception", () => {
    sinon.stub(UserSettings, "getConfigSync").throws("Test");
    expect(getAutomaticNpmInstallSetting()).to.be.false;
  });
});
