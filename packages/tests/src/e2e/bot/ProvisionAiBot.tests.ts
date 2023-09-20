// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

class AiBotTestCase extends CaseFactory {
    public override async onAfterCreate(projectPath: string): Promise<void> {
        expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
        const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
        const SECRET_OPENAI_API_KEY = "SECRET_OPENAI_API_KEY=MY_OPENAI_API_KEY";
        const SECRET_AZURE_OPENAI_API_KEY = "SECRET_AZURE_OPENAI_API_KEY=MY_SECRET_AZURE_OPENAI_API_KEY";
        const SECRET_AZURE_OPENAI_ENDPOINT = "SECRET_AZURE_OPENAI_ENDPOINT=MY_SECRET_AZURE_OPENAI_ENDPOINT";
        const KEY = SECRET_AZURE_OPENAI_API_KEY + "\n" + SECRET_AZURE_OPENAI_ENDPOINT + "\n" + SECRET_OPENAI_API_KEY;
        fs.writeFileSync(userFile, KEY);
        console.log(`add key ${KEY} to .env.dev.user file`);
      }
}

new AiBotTestCase(
    Capability.AiBot,
    24808531,
    "v-ivanchen@microsoft.com",
    ["bot"],
    {}
).test();
