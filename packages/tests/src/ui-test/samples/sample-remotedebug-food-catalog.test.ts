// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import path from "path";
import os from "os";
import fs from "fs";
import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { Executor } from "../../utils/executor";
import { expect } from "chai";

class FoodCatalogTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    // create folder for the test "/env/.env.dev"
    await sampledebugContext.createEnvFolder(
      sampledebugContext.projectPath,
      "env"
    );
    // create .env file
    const filePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}.user`
    );
    // fake the connection string
    const envContent =
      "SECRET_TABLE_STORAGE_CONNECTION_STRING=crypto_57b97a613f16180d949c16d8236a0560344d73a10519351330803dcc383215ff40c0c9c301a14db335895a5b2380f4353acc787760fdd522fb6efcfa8e10a807c11f07d9eb52f31964cafaf1adef4c1e87dd63748d99670ddcfb26ac0a611e676b9834393888cdfeb6c0bf46ece3bd0ac231529715fe70405c5708b6637efecbf5856ad2e5256d9d95e8003734e4172a8b7f3041f80bbc723acd43d82311f11fdaab0b491cc77e15884f21f9c292562c8279634761d823b2d256a5f2d48ff76bfc18d3d2518dca6c17b8d777b6f1f47a28fca8248930ca387e17939bc899ee7eb7cfaee705bcf443302d72e88e197ba2cd3162182585e8753778f516175fccb3927d7938b22b51c1ca1bfc6d26286e8c56a075d369ec1ad1f2c3fd7b1f7e";
    fs.writeFileSync(filePath, envContent);
    console.log(fs.readFileSync(filePath, { encoding: "utf-8" }));
  }
}

new FoodCatalogTestCase(
  TemplateProject.FoodCatalog,
  27851823,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  {
    skipInit: true,
    repoPath: "./resource/samples",
    testRootFolder: path.resolve(os.homedir(), "resource"),
  }
).test();
