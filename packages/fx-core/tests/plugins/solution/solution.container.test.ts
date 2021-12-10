// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import { Inputs, Platform, AzureSolutionSettings } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import sinon from "sinon";
import {
  getAllResourcePluginMap,
  getAllResourcePlugins,
  ResourcePlugins,
  getActivatedResourcePlugins,
} from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import {
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  FrontendHostTypeQuestion,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { Container } from "typedi";

describe("Resource plugin container", () => {
  beforeEach(() => {});

  afterEach(async () => {});

  it("getAllResourcePlugins", async () => {
    const plugins = getAllResourcePlugins();
    const num = Object.keys(ResourcePlugins).length;
    assert.isTrue(plugins.length === num);
    const map = getAllResourcePluginMap();
    assert.isTrue(map.size === num);
  });

  it("getActivatedResourcePlugins", async () => {
    const solutionSettings: AzureSolutionSettings = {
      hostType: HostTypeOptionAzure.id,
      capabilities: [TabOptionItem.id],
      azureResources: [AzureResourceSQL.id],
      activeResourcePlugins: [],
      name: "fx-solution-azure",
      version: "",
    };
    const plugins = getActivatedResourcePlugins(solutionSettings);
    const names = plugins.map((p) => p.name);
    assert.isTrue(names.includes(Container.get<Plugin>(ResourcePlugins.FrontendPlugin).name));
    assert.isTrue(names.includes(Container.get<Plugin>(ResourcePlugins.SqlPlugin).name));
  });

  it("solution FrontendHostTypeQuestion", async () => {
    let inputs: Inputs = {
      platform: Platform.VSCode,
      [AzureSolutionQuestionNames.Capabilities]: [BotOptionItem.id],
    };
    if (FrontendHostTypeQuestion.dynamicOptions) {
      let options = FrontendHostTypeQuestion.dynamicOptions(inputs);
      assert.deepEqual(options, [HostTypeOptionAzure]);

      inputs = {
        platform: Platform.VSCode,
        [AzureSolutionQuestionNames.Capabilities]: [TabOptionItem.id],
      };
      options = FrontendHostTypeQuestion.dynamicOptions(inputs);
      assert.deepEqual(options, [HostTypeOptionAzure, HostTypeOptionSPFx]);
    }
  });
});
