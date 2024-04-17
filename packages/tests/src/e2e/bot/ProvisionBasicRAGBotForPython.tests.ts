// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

class AiBotTestCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    const AZURE_OPENAI_ENDPOINT = "AZURE_OPENAI_ENDPOINT=https://test.com";
    const SECRET_AZURE_OPENAI_API_KEY = "SECRET_AZURE_OPENAI_API_KEY=fake";
    const AZURE_OPENAI_MODEL_DEPLOYMENT_NAME =
      "AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=fake";
    const KEY =
      SECRET_AZURE_OPENAI_API_KEY +
      "\n" +
      AZURE_OPENAI_ENDPOINT +
      "\n" +
      AZURE_OPENAI_MODEL_DEPLOYMENT_NAME;
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev.user file`);
  }
}

const myRecord: Record<string, string> = {};
myRecord["custom-copilot-rag"] = "custom-copilot-rag-customize";
new AiBotTestCase(
  Capability.RAG,
  27178092,
  "frankqian@microsoft.com",
  ["bot"],
  ProgrammingLanguage.PY,
  {},
  myRecord
).test();
