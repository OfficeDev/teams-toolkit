// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import {
  FxError,
  ok,
  Platform,
  PluginContext,
  Result,
  SolutionConfig,
  SolutionContext,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import * as uuid from "uuid";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import { generateArmTemplate } from "../../../src/plugins/solution/fx-solution/arm";
import { it } from "mocha";
import path from "path";
import { ArmResourcePlugin } from "../../../src/common/armInterface";
import {
  mockedAadScaffoldArmResult,
  mockedFehostScaffoldArmResult,
  mockedSimpleAuthScaffoldArmResult,
} from "./util";

chai.use(chaiAsPromised);
const expect = chai.expect;

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin) as Plugin &
  ArmResourcePlugin;
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin) as Plugin &
  ArmResourcePlugin;
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin) as Plugin & ArmResourcePlugin;
const aadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin) as Plugin & ArmResourcePlugin;

function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: ".",
    config,
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
  };
}

describe("Generate ARM Template for project", () => {
  const mocker = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();

  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
  });

  afterEach(() => {
    mocker.restore();
  });

  it("should do nothing when no plugin implements required interface", async () => {
    fileContent.clear();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "spfx",
        version: "1.0",
        activeResourcePlugins: [spfxPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.size).equals(0);
  });

  it("should output templates when plugin implements required interface", async () => {
    fileContent.clear();
    const mockedCtx = mockSolutionContext();
    mockedCtx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [fehostPlugin.name, simpleAuthPlugin.name],
        capabilities: [TabOptionItem.id],
      },
    };

    // mock plugin behavior
    mocker.stub(fehostPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedFehostScaffoldArmResult);
    });

    mocker.stub(simpleAuthPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedSimpleAuthScaffoldArmResult);
    });

    mocker.stub(aadPlugin, "generateArmTemplates").callsFake(async (ctx: PluginContext) => {
      return ok(mockedAadScaffoldArmResult);
    });

    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.get(path.join("./infra/azure/templates", "main.bicep"))).equals(
      `param resourceBaseName string
Mocked frontend hosting parameter content
Mocked simple auth parameter content

Mocked frontend hosting variable content
Mocked simple auth variable content

Mocked frontend hosting module content. Module path: ./frontendHostingProvision.bicep. Variable: Mocked simple auth endpoint
Mocked simple auth module content. Module path: ./simpleAuthProvision.bicep. Variable: Mocked frontend hosting endpoint

Mocked frontend hosting output content
Mocked simple auth output content`
    );
    expect(
      fileContent.get(path.join("./infra/azure/templates", "frontendHostingProvision.bicep"))
    ).equals("Mocked frontend hosting provision module content");
    expect(
      fileContent.get(path.join("./infra/azure/templates", "simpleAuthProvision.bicep"))
    ).equals("Mocked simple auth provision module content");
    expect(
      fileContent.get(path.join("./infra/azure/parameters", "parameter.template.json"))
    ).equals(
      `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "{{SOLUTION_RESOURCE_BASE_NAME}}"
    },
    "FrontendParameter": "FrontendParameterValue",
    "SimpleAuthParameter": "SimpleAuthParameterValue"
  }
}`
    );
  });
});
