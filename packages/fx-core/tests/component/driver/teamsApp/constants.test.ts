// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import {
  getConfigurableTabsTplBasedOnVersion,
  CONFIGURABLE_TABS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V4,
  getBotsTplForCommandAndResponseBasedOnVersion,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V4,
  getBotsTplForNotificationBasedOnVersion,
  BOTS_TPL_FOR_NOTIFICATION_V3,
  BOTS_TPL_FOR_NOTIFICATION_V4,
  getBotsTplBasedOnVersion,
  BOTS_TPL_V3,
  BOTS_TPL_V4,
  getBotsTplExistingAppBasedOnVersion,
  BOTS_TPL_EXISTING_APP,
  BOTS_TPL_EXISTING_APP_V2,
  getConfigurableTabsTplExistingAppBasedOnVersion,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_EXISTING_APP_V2,
} from "../../../../src/component/driver/teamsApp/constants";

describe("constants", async () => {
  it("get configurable tabs tpl based on version", async () => {
    const resultV3 = getConfigurableTabsTplBasedOnVersion("1.16");
    expect(resultV3).to.equal(CONFIGURABLE_TABS_TPL_V3);

    const resultV4 = getConfigurableTabsTplBasedOnVersion("1.17");
    expect(resultV4).to.equal(CONFIGURABLE_TABS_TPL_V4);

    const resultPreview = getConfigurableTabsTplBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(CONFIGURABLE_TABS_TPL_V4);
  });
  it("get bots tpl for command and response", async () => {
    const resultV3 = getBotsTplForCommandAndResponseBasedOnVersion("1.16");
    expect(resultV3).to.equal(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);

    const resultV4 = getBotsTplForCommandAndResponseBasedOnVersion("1.17");
    expect(resultV4).to.equal(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V4);

    const resultPreview = getBotsTplForCommandAndResponseBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V4);
  });
  it("get bots tpl for notification", async () => {
    const resultV3 = getBotsTplForNotificationBasedOnVersion("1.16");
    expect(resultV3).to.equal(BOTS_TPL_FOR_NOTIFICATION_V3);

    const resultV4 = getBotsTplForNotificationBasedOnVersion("1.17");
    expect(resultV4).to.equal(BOTS_TPL_FOR_NOTIFICATION_V4);

    const resultPreview = getBotsTplForNotificationBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(BOTS_TPL_FOR_NOTIFICATION_V4);
  });
  it("get bots tpl", async () => {
    const resultV3 = getBotsTplBasedOnVersion("1.16");
    expect(resultV3).to.equal(BOTS_TPL_V3);

    const resultV4 = getBotsTplBasedOnVersion("1.17");
    expect(resultV4).to.equal(BOTS_TPL_V4);

    const resultPreview = getBotsTplBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(BOTS_TPL_V4);
  });
  it("get bots tpl existing app", async () => {
    const result = getBotsTplExistingAppBasedOnVersion("1.16");
    expect(result).to.equal(BOTS_TPL_EXISTING_APP);

    const resultV2 = getBotsTplExistingAppBasedOnVersion("1.17");
    expect(resultV2).to.equal(BOTS_TPL_EXISTING_APP_V2);

    const resultPreview = getBotsTplExistingAppBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(BOTS_TPL_EXISTING_APP_V2);
  });
  it("get configurable tabs tpl existing app", async () => {
    const result = getConfigurableTabsTplExistingAppBasedOnVersion("1.16");
    expect(result).to.equal(CONFIGURABLE_TABS_TPL_EXISTING_APP);

    const resultV2 = getConfigurableTabsTplExistingAppBasedOnVersion("1.17");
    expect(resultV2).to.equal(CONFIGURABLE_TABS_TPL_EXISTING_APP_V2);

    const resultPreview = getConfigurableTabsTplExistingAppBasedOnVersion("devPreview");
    expect(resultPreview).to.equal(CONFIGURABLE_TABS_TPL_EXISTING_APP_V2);
  });
});
