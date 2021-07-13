// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import {
  err,
  FxError,
  Result,
  ok,
  Inputs,
  Platform,
  Stage,
  SolutionContext,
  QTreeNode,
  Func,
  InputTextConfig,
  InputTextResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  OptionItem,
  traverse,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
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
  HostTypeOptionAzure,
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
});
