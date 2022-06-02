// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  Platform,
  AppPackageFolderName,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs, { PathLike } from "fs-extra";
import sinon from "sinon";
import {
  AzureSolutionQuestionNames,
  BotScenario,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../../../src/plugins/solution/fx-solution/question";
import {
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE,
  BOTS_TPL_FOR_MULTI_ENV,
  BOTS_TPL_FOR_NOTIFICATION,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV_M365,
  CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV,
  M365_SCHEMA,
  M365_MANIFEST_VERSION,
  MANIFEST_TEMPLATE,
  MANIFEST_TEMPLATE_CONSOLIDATE,
  STATIC_TABS_TPL_FOR_MULTI_ENV,
} from "../../../../../src/plugins/resource/appstudio/constants";
import { isVSProject, newEnvInfo } from "../../../../../src";
import * as commonTools from "../../../../../src/common/tools";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { getAzureProjectRoot } from "../helper";
import * as path from "path";
import { getManifestTemplatePath } from "../../../../../src/plugins/resource/appstudio/manifestTemplate";
import { createManifest } from "../../../../../src/plugins/resource/appstudio/plugin";
import { getProjectTemplatesFolderPath } from "../../../../../src/common/utils";

function getRemoteManifestPath(projectRoot: string): string {
  return `${projectRoot}/templates/${AppPackageFolderName}/${MANIFEST_TEMPLATE}`;
}

async function getManifestConsolidatePath(projectRoot: string): Promise<string> {
  return path.resolve(
    await getProjectTemplatesFolderPath(projectRoot),
    AppPackageFolderName,
    MANIFEST_TEMPLATE_CONSOLIDATE
  );
}

describe("Scaffold", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  const sandbox = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();

    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      cryptoProvider: new LocalCrypto(""),
    };

    sandbox.stub(fs, "writeFile").callsFake((file: number | PathLike, data: any) => {
      fileContent.set(path.resolve(file.toString()), data);
    });

    sandbox.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(path.resolve(file), JSON.stringify(obj));
    });
    // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
    sandbox.stub<any, any>(fs, "copy").callsFake((originPath: string, filePath: string) => {
      fileContent.set(path.resolve(filePath), JSON.stringify(filePath));
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should generate manifest for azure tab", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifestPath = await getManifestConsolidatePath(ctx.root);
    const manifestContent = fileContent.get(manifestPath);
    const manifest: TeamsAppManifest = JSON.parse(manifestContent);
    chai.expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL_FOR_MULTI_ENV);
    chai.expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV);
    chai
      .expect(manifest.bots, "Bots should be empty, because only tab is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only tab is chosen"
      )
      .to.deep.equal([]);

    // NOTE(aochengwang):
    // The `path.normalize` is a simple workaround.
    //
    // We need to normalize the file path when multi-env is turned on
    //  because the code in appstudio plugin will use `path.join` to generate these file path (only when multi-env is enabled)
    //  which implicitly calls `path.normalize`
    //  and it removes the leading "./" in "./tests/plugins/resource/appstudio/...",
    //  causing the test to fail.
    // However the test case should not fail because these paths are essentially the same.
    // A better approach to solve this issue is to write helper functions to:
    //   1. normalize all paths in `fileContent.set`
    //   2. normalize all paths before checking path existence in `fileContent`
    // Maybe we can refactor this later.
    const colorPngPath = path.join(
      await getProjectTemplatesFolderPath(ctx.root),
      AppPackageFolderName,
      "resources",
      "color.png"
    );
    const outlinePngPath = path.join(
      await getProjectTemplatesFolderPath(ctx.root),
      AppPackageFolderName,
      "resources",
      "outline.png"
    );
    chai.expect(fileContent.has(colorPngPath)).to.be.true;
    chai.expect(fileContent.has(outlinePngPath)).to.be.true;
  });

  it("should generate manifest for m365 launch page", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      isM365: true,
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai.expect(manifest.$schema).to.deep.equal(M365_SCHEMA);
    chai.expect(manifest.manifestVersion).to.deep.equal(M365_MANIFEST_VERSION);
    chai.expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL_FOR_MULTI_ENV);
    chai.expect(manifest.configurableTabs).to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be empty, because only tab is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only tab is chosen"
      )
      .to.deep.equal([]);

    // NOTE(aochengwang):
    // The `path.normalize` is a simple workaround.
    //
    // We need to normalize the file path when multi-env is turned on
    //  because the code in appstudio plugin will use `path.join` to generate these file path (only when multi-env is enabled)
    //  which implicitly calls `path.normalize`
    //  and it removes the leading "./" in "./tests/plugins/resource/appstudio/...",
    //  causing the test to fail.
    // However the test case should not fail because these paths are essentially the same.
    // A better approach to solve this issue is to write helper functions to:
    //   1. normalize all paths in `fileContent.set`
    //   2. normalize all paths before checking path existence in `fileContent`
    // Maybe we can refactor this later.
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for bot", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only bot is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
    chai.expect(manifest.bots).to.deep.equal(BOTS_TPL_FOR_MULTI_ENV);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["MessagingExtension"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because msgext bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai.expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for notification bot", async () => {
    sandbox.stub(process, "env").value({
      TEAMSFX_CONFIG_UNIFY: "true",
      BOT_NOTIFICATION_ENABLED: "true",
    });
    fileContent.clear();

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    if (ctx.answers) {
      ctx.answers[AzureSolutionQuestionNames.Scenarios] = [BotScenario.NotificationBot];
    }

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only bot is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be a notification bot, without commands")
      .to.deep.equal(BOTS_TPL_FOR_NOTIFICATION);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for command and response bot", async () => {
    sandbox.stub(process, "env").value({
      TEAMSFX_CONFIG_UNIFY: "true",
      BOT_NOTIFICATION_ENABLED: "true",
    });
    fileContent.clear();

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    if (ctx.answers) {
      ctx.answers[AzureSolutionQuestionNames.Scenarios] = [BotScenario.CommandAndResponseBot];
    }

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifestPath = await getManifestConsolidatePath(ctx.root);
    const manifest: TeamsAppManifest = JSON.parse(fileContent.get(manifestPath));
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only bot is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be empty, because only msgext is chosen")
      .to.deep.equal(BOTS_TPL_FOR_COMMAND_AND_RESPONSE);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for m365 messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      isM365: true,
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["MessagingExtension"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai.expect(manifest.$schema).to.deep.equal(M365_SCHEMA);
    chai.expect(manifest.manifestVersion).to.deep.equal(M365_MANIFEST_VERSION);
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because msgext bot is chosen"
      )
      .to.deep.equal([]);
    chai
      .expect(manifest.bots, "Bots should be empty, because only msgext is chosen")
      .to.deep.equal([]);
    chai
      .expect(manifest.composeExtensions)
      .to.deep.equal(COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV_M365);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("should generate manifest for tab, bot and messaging extension", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Bot", "Tab", "MessagingExtension"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(await getManifestConsolidatePath(ctx.root))
    );
    chai.expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL_FOR_MULTI_ENV);
    chai.expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV);
    chai.expect(manifest.bots).to.deep.equal(BOTS_TPL_FOR_MULTI_ENV);
    chai.expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("shouldn't generate manifest for SPFx project", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        activeResourcePlugins: ["fx-resource-spfx"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest = fileContent.get(await getManifestConsolidatePath(ctx.root));
    chai.expect(manifest).to.be.not.undefined;

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });

  it("shouldn't generate aad manifest when aad plugin is not activated", async () => {
    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        activeResourcePlugins: ["fx-resource-app-studio"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest = fileContent.get(await getManifestConsolidatePath(ctx.root));
    chai.expect(manifest).to.be.not.undefined;

    chai.expect(manifest.webApplicationInfo).to.be.undefined;
  });

  it("scaffold bot - consolidate", async () => {
    // consolidate one template
    sandbox.stub(commonTools, "isConfigUnifyEnabled").returns(true);

    fileContent.clear();
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };

    const result = await plugin.scaffold(ctx);
    chai.expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          MANIFEST_TEMPLATE_CONSOLIDATE
        )
      )
    );
    chai
      .expect(manifest.staticTabs, "staticTabs should be empty, because only bot is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.configurableTabs,
        "configurableTabs should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);
    chai.expect(manifest.bots).to.deep.equal(BOTS_TPL_FOR_MULTI_ENV);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only bot is chosen"
      )
      .to.deep.equal([]);

    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "color.png"
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.join(
          await getProjectTemplatesFolderPath(ctx.root),
          AppPackageFolderName,
          "resources",
          "outline.png"
        )
      )
    ).to.be.true;
  });
});
