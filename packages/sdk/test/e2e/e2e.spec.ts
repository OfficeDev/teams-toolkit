// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import {
  createNewProject,
  deleteProject,
  deployTab,
  getLoginEnvironment,
  getTeamsTabRemoteUrl,
  E2E_TIMEOUT
} from "../helper";
import { TEST_USER_OBJECT_ID } from "./data";

chaiUse(chaiPromises);

describe("End to End Test in Teams", () => {
  it("Tab app with Graph API", async function() {
    const project = await createNewProject("sdkTabGraphE2E");
    await deployTab(project);

    const { browser, page } = await getLoginEnvironment();
    const selectors = {
      addButton: `ts-add-app-dialog-add-button`,
      grantButton: `button.ui-button`,
      accept: `input[type=submit]`,
      objectId: `div:below(b:text("UPN:"))`
    };

    const appUrl = getTeamsTabRemoteUrl(project);
    await page.goto(appUrl, { timeout: E2E_TIMEOUT });
    await page.waitForSelector(selectors.addButton, { timeout: E2E_TIMEOUT });
    await page.click(selectors.addButton);

    const frame = await (await page.waitForSelector(`iframe`)).contentFrame();

    // Check grant button and consent in popup window.
    // TODO: if it's reusable, move it to helper file.
    await frame.waitForSelector(selectors.grantButton);
    await frame.click(selectors.grantButton, { delay: 2000 });
    const consentPage = await page.waitForEvent("popup");
    await consentPage.waitForSelector(selectors.accept, { state: "visible" });
    await consentPage.focus(selectors.accept);
    await consentPage.click(selectors.accept, { delay: 2000 });

    // Check data from Graph API
    const upn = await frame.waitForSelector(selectors.objectId);
    assert.strictEqual(await upn.innerText(), `Object id: ${TEST_USER_OBJECT_ID}`);

    await browser.close();
    await deleteProject("sdkTabGraphE2E", project);
  });
});
