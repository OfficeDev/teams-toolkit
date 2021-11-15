// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "../../../../../src/plugins/resource/appstudio";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  Platform,
  AppPackageFolderName,
  V1ManifestFileName,
  ArchiveFolderName,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs, { PathLike } from "fs-extra";
import sinon from "sinon";
import { HostTypeOptionAzure } from "../../../../../src/plugins/solution/fx-solution/question";
import {
  APP_PACKAGE_FOLDER_FOR_MULTI_ENV,
  COLOR_TEMPLATE,
  CONFIGURABLE_TABS_TPL,
  CONFIGURABLE_TABS_TPL_LOCAL_DEBUG,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  MANIFEST_LOCAL,
  MANIFEST_RESOURCES,
  OUTLINE_TEMPLATE,
  REMOTE_MANIFEST,
  STATIC_TABS_TPL,
  STATIC_TABS_TPL_LOCAL_DEBUG,
} from "../../../../../src/plugins/resource/appstudio/constants";
import path from "path";
import { newEnvInfo } from "../../../../../src/core/tools";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { getTemplatesFolder } from "../../../../../src/folder";
import { isMultiEnvEnabled } from "../../../../../src";

describe("Migrate", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  const sandbox = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();

  const manifestFile = path.resolve(
    __dirname,
    isMultiEnvEnabled()
      ? "../resources-multi-env/valid.manifest.json"
      : "../resources/valid.manifest.json"
  );
  const manifestStr = fs.readFileSync(manifestFile);

  const targetManifestFile = path.resolve(
    __dirname,
    isMultiEnvEnabled()
      ? "../resources-multi-env/migrate.manifest.json"
      : "../resources/migrate.manifest.json"
  );
  const targetManifest = fs.readJsonSync(targetManifestFile);

  beforeEach(async () => {
    plugin = new AppStudioPlugin();

    ctx = {
      root: "./tests/plugins/resource/appstudio/resources",
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
      cryptoProvider: new LocalCrypto(""),
    };

    sandbox.stub(fs, "writeFile").callsFake(async (filePath: number | PathLike, data: any) => {
      fileContent.set(path.normalize(filePath.toString()), data);
    });

    sandbox.stub(fs, "readFile").callsFake(async (filePath: number | PathLike) => {
      if (!fileContent.has(filePath.toString())) {
        throw new Error(`${filePath.toString()} is not found.`);
      }
      return fileContent.get(path.normalize(filePath.toString()));
    });

    sandbox.stub(fs, "writeJSON").callsFake(async (filePath: PathLike, obj: any) => {
      if (!fileContent.has(filePath.toString())) {
        throw new Error(`${filePath.toString()} is not found.`);
      }
      fileContent.set(path.normalize(filePath.toString()), JSON.stringify(obj));
    });
    // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
    sandbox
      .stub<any, any>(fs, "copy")
      .callsFake(async (originPath: PathLike, filePath: PathLike) => {
        if (!fileContent.has(path.normalize(originPath.toString()))) {
          throw new Error(`${originPath.toString()} is not found.`);
        }
        const content = fileContent.get(path.normalize(originPath.toString()));
        fileContent.set(path.normalize(filePath.toString()), content ?? filePath.toString());
      });

    sandbox
      .stub<any, any>(fs, "copyFile")
      .callsFake(async (originPath: PathLike, filePath: PathLike) => {
        if (!fileContent.has(path.normalize(originPath.toString()))) {
          throw new Error(`${originPath.toString()} is not found.`);
        }
        const content = fileContent.get(path.normalize(originPath.toString()));
        fileContent.set(path.normalize(filePath.toString()), content ?? filePath.toString());
      });

    sandbox
      .stub(fs, "move")
      .callsFake(async (originPath: PathLike, filePath: PathLike, options: fs.MoveOptions) => {
        if (!fileContent.has(originPath.toString())) {
          throw new Error(`${originPath.toString()} is not found.`);
        }
        const content = fileContent.get(path.normalize(originPath.toString()));
        fileContent.set(path.normalize(filePath.toString()), content);
        fileContent.delete(path.normalize(originPath.toString()));
      });

    sandbox.stub(fs, "readJson").callsFake(async (filePath: string) => {
      const content = fileContent.get(path.normalize(filePath));
      if (!content) {
        throw new Error(`File '${filePath}' is not found.`);
      }
      return JSON.parse(content);
    });

    sandbox.stub(fs, "ensureDir").callsFake(async (filePath: string) => {});

    sandbox.stub(fs, "stat").callsFake(async (filePath: PathLike) => {
      if (fileContent.has(path.normalize(filePath.toString()))) {
        return new fs.Stats();
      }
      throw new Error("Cannot find file");
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should generate manifest from an existing manifest.json file", async () => {
    fileContent.clear();
    sandbox.stub<any, any>(fs, "readdir").callsFake(async (filePath: fs.PathLike) => {
      return [V1ManifestFileName, DEFAULT_COLOR_PNG_FILENAME, DEFAULT_COLOR_PNG_FILENAME];
    });

    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${V1ManifestFileName}`
      ),
      manifestStr
    );
    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
      ),
      "color"
    );
    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${DEFAULT_OUTLINE_PNG_FILENAME}`
      ),
      "outline"
    );

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        migrateFromV1: true,
      },
    };

    const result = await plugin.migrateV1Project(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_LOCAL}`
            : `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`
        )
      )
    );
    chai.expect(manifest).to.deep.equal(targetManifest);

    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_COLOR_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
        )
      )
    ).to.be.true;

    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_OUTLINE_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_OUTLINE_PNG_FILENAME}`
        )
      )
    ).to.be.true;
  });

  it("should generate new manifest", async () => {
    fileContent.clear();
    sandbox.stub<any, any>(fs, "readdir").callsFake(async (filePath: fs.PathLike) => {
      return [];
    });

    fileContent.set(path.normalize(`${getTemplatesFolder()}/${COLOR_TEMPLATE}`), "color");
    fileContent.set(path.normalize(`${getTemplatesFolder()}/${OUTLINE_TEMPLATE}`), "outline");

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        migrateFromV1: true,
      },
    };

    const result = await plugin.migrateV1Project(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_LOCAL}`
            : `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`
        )
      )
    );
    chai
      .expect(manifest.staticTabs)
      .to.deep.equal(isMultiEnvEnabled() ? STATIC_TABS_TPL_LOCAL_DEBUG : STATIC_TABS_TPL);
    chai
      .expect(manifest.configurableTabs)
      .to.deep.equal(
        isMultiEnvEnabled() ? CONFIGURABLE_TABS_TPL_LOCAL_DEBUG : CONFIGURABLE_TABS_TPL
      );
    chai
      .expect(manifest.bots, "Bots should be empty, because only tab is chosen")
      .to.deep.equal([]);
    chai
      .expect(
        manifest.composeExtensions,
        "ComposeExtensions should be empty, because only tab is chosen"
      )
      .to.deep.equal([]);

    chai
      .expect(
        manifest.webApplicationInfo,
        "webApplicationInfo should be empty, because migrate from v1"
      )
      .to.deep.equal(undefined);

    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_COLOR_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_OUTLINE_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_OUTLINE_PNG_FILENAME}`
        )
      )
    ).to.be.true;
  });

  it("should generate new color.png and outline.png", async () => {
    fileContent.clear();
    sandbox.stub<any, any>(fs, "readdir").callsFake(async (filePath: fs.PathLike) => {
      return [V1ManifestFileName, "color.png"];
    });

    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${V1ManifestFileName}`
      ),
      manifestStr
    );
    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
      ),
      "color"
    );
    fileContent.set(path.normalize(`${getTemplatesFolder()}/${OUTLINE_TEMPLATE}`), "outline");

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        migrateFromV1: true,
      },
    };

    const result = await plugin.migrateV1Project(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_LOCAL}`
            : `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`
        )
      )
    );
    chai.expect(manifest).to.deep.equal(targetManifest);

    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_COLOR_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
        )
      )
    ).to.be.true;
    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_OUTLINE_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_OUTLINE_PNG_FILENAME}`
        )
      )
    ).to.be.true;
  });

  it("should use color and outline link", async () => {
    fileContent.clear();
    sandbox.stub<any, any>(fs, "readdir").callsFake(async (filePath: fs.PathLike) => {
      return [V1ManifestFileName];
    });

    const sourceManifest = JSON.parse(manifestStr.toString());
    sourceManifest.icons.color = "https://test.com/color.png";
    sourceManifest.icons.outline = "https://test.com/outline.png";

    fileContent.set(
      path.normalize(
        `${ctx.root}/${ArchiveFolderName}/${AppPackageFolderName}/${V1ManifestFileName}`
      ),
      JSON.stringify(sourceManifest)
    );

    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: ["Tab"],
        migrateFromV1: true,
      },
    };

    const result = await plugin.migrateV1Project(ctx);
    chai.expect(result.isOk()).equals(true);

    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_LOCAL}`
            : `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`
        )
      )
    );
    const testTargetManifest = Object.assign({}, targetManifest);
    testTargetManifest.icons.color = "https://test.com/color.png";
    testTargetManifest.icons.outline = "https://test.com/outline.png";
    chai.expect(manifest).to.deep.equal(testTargetManifest);

    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_COLOR_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_COLOR_PNG_FILENAME}`
        )
      )
    ).to.be.false;
    chai.expect(
      fileContent.has(
        path.normalize(
          isMultiEnvEnabled()
            ? `${ctx.root}/${APP_PACKAGE_FOLDER_FOR_MULTI_ENV}/${MANIFEST_RESOURCES}/${DEFAULT_OUTLINE_PNG_FILENAME}`
            : `${ctx.root}/${AppPackageFolderName}/${DEFAULT_OUTLINE_PNG_FILENAME}`
        )
      )
    ).to.be.false;
  });
});
