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
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import sinon from "sinon";
import {
  getAllResourcePluginMap,
  getAllResourcePlugins,
  ResourcePlugins,
} from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";

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
});
