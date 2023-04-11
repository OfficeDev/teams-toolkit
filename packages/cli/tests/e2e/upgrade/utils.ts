// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xzf0587 <zhaofengxu@microsoft.com>
 */
import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as path from "path";

const ymlHeader =
  "# yaml-language-server: $schema=https://developer.microsoft.com/json-schemas/teams-toolkit/teamsapp-yaml/1.0.0/yaml.schema.json";

export async function checkYmlHeader(ymlPath: string) {
  assert.isTrue(await fs.pathExists(ymlPath));
  const content = (await fs.readFile(ymlPath)).toString();
  assert.isTrue(content.includes(ymlHeader));
}
