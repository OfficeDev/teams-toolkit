// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { expect } from "chai";
import { it } from "@microsoft/extra-shot-mocha";
import { execAsync, getTestFolder, getSubscriptionId } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";

describe("account command", function () {
  let stdlog: { stdout: string; stderr: string };
  const subscription = getSubscriptionId();
  const testFolder = getTestFolder();

  it(`account show `, { testPlanCaseId: 15232246 }, async function () {
    stdlog = await execAsync(`teamsfx account show`, {
      env: process.env,
      timeout: 0,
    });

    expect(stdlog.stdout).include("Account is: undefined");
    expect(stdlog.stderr).to.be.empty;
  });

  it(`account set`, { testPlanCaseId: 15232256 }, async function () {
    await CliHelper.setSubscription(subscription, testFolder);

    stdlog = await execAsync(`teamsfx account show`, {
      env: process.env,
      timeout: 0,
    });

    expect(stdlog.stdout).include("Account is:");
    expect(stdlog.stderr).to.be.empty;
  });

  it(`account logout`, { testPlanCaseId: 15232255 }, async function () {
    stdlog = await execAsync(`teamsfx account logout azure`, {
      env: process.env,
      timeout: 0,
    });

    expect(stdlog.stdout).include("Successfully signed out of Azure.");
    expect(stdlog.stderr).to.be.empty;
  });
});
