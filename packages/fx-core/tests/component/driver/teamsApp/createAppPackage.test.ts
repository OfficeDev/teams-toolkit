// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { CreateAppPackageArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import { MockedM365Provider } from "../../../plugins/solution/util";
import { FileNotFoundError } from "../../../../src/error/common";
import { FeatureFlagName } from "../../../../src/common/constants";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { ok, TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";

describe("teamsApp/createAppPackage", async () => {
  const teamsAppDriver = new CreateAppPackageDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    projectPath: "./",
  };
  let mockedEnvRestore: RestoreFn;

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      [FeatureFlagName.CopilotPlugin]: "true",
      ["CONFIG_TEAMS_APP_NAME"]: "fakeName",
    });
  });

  afterEach(() => {
    sinon.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  it("should throw error if file not exists case 1", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 2", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 3", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    const manifest = new TeamsAppManifest();
    manifest.localizationInfo = {
      additionalLanguages: [{ file: "aaa", languageTag: "zh" }],
      defaultLanguageTag: "en",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon
      .stub(fs, "pathExists")
      .onFirstCall()
      .resolves(true)
      .onSecondCall()
      .resolves(true)
      .onThirdCall()
      .resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("should throw error if file not exists case 4", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        type: "apiBased",
        apiSpecFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplate: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      if (filePath.includes("openai.yml")) {
        return false;
      } else {
        return true;
      }
    });
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("should throw error if file not exists case 5", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };
    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      if (filePath.includes("repairs.json")) {
        return false;
      } else {
        return true;
      }
    });

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        type: "apiBased",
        apiSpecFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplate: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("invalid param error", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "",
      outputZipPath: "",
      outputJsonPath: "",
    };
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("happy path", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        type: "apiBased",
        apiSpecFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplate: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });

  it("happy path - relative path", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        type: "apiBased",
        apiSpecFile: "manifest.template.json",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplate: "manifest.template.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });

  it("happy path - no AC template", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        type: "apiBased",
        apiSpecFile: "manifest.template.json",
        commands: [
          {
            id: "GET /repairs",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });
});
