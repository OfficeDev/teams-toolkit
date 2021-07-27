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

chai.use(chaiAsPromised);
const expect = chai.expect;

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
const simpleAuthPlugin = Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin);
const spfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);

const scaffoldArmTemplateInterfaceName: string = "scaffoldArmTemplate"; // Temporary solution before adding it to teamsfx-api

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
    //@ts-ignore temporary solution before adding related interface to teamsfx-api
    fehostPlugin[scaffoldArmTemplateInterfaceName] = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok({
        Modules: {
          frontendHostingProvision: {
            Content: "Mocked frontend hosting provision module content",
          },
        },
        Orchestration: {
          ParameterTemplate: {
            Content: "Mocked frontend hosting parameter content",
            ParameterJson: { FrontendParameter: "FrontendParameterValue" },
          },
          VariableTemplate: {
            Content: "Mocked frontend hosting variable content",
          },
          ModuleTemplate: {
            Content:
              "Mocked frontend hosting module content. Module path: {{PluginOutput.fx-resource-frontend-hosting.Modules.frontendHostingProvision.Path}}. Variable: {{PluginOutput.fx-resource-simple-auth.Outputs.endpoint}}",
            Outputs: {
              endpoint: "Mocked frontend hosting endpoint",
            },
          },
          OutputTemplate: {
            Content: "Mocked frontend hosting output content",
          },
        },
      });
    };
    //@ts-ignore temporary solution before adding related interface to teamsfx-api
    simpleAuthPlugin[scaffoldArmTemplateInterfaceName] = async function (
      _ctx: PluginContext
    ): Promise<Result<any, FxError>> {
      return ok({
        Modules: {
          simpleAuthProvision: {
            Content: "Mocked simple auth provision module content",
          },
        },
        Orchestration: {
          ParameterTemplate: {
            Content: "Mocked simple auth parameter content",
            ParameterJson: { SimpleAuthParameter: "SimpleAuthParameterValue" },
          },
          VariableTemplate: {
            Content: "Mocked simple auth variable content",
          },
          ModuleTemplate: {
            Content:
              "Mocked simple auth module content. Module path: {{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthProvision.Path}}. Variable: {{PluginOutput.fx-resource-frontend-hosting.Outputs.endpoint}}",
            Outputs: {
              endpoint: "Mocked simple auth endpoint",
            },
          },
          OutputTemplate: {
            Content: "Mocked simple auth output content",
          },
        },
      });
    };

    const result = await generateArmTemplate(mockedCtx);
    expect(result.isOk()).to.be.true;
    expect(fileContent.get("infra\\azure\\templates\\main.bicep")).equals(
      `param resourceBaseName string
Mocked frontend hosting parameter content
Mocked simple auth parameter content

Mocked frontend hosting variable content
Mocked simple auth variable content

Mocked frontend hosting module content. Module path: ./frontendHostingProvision.bicep. Variable: Mocked simple auth endpoint
Mocked simple auth module content. Module path: ./simpleAuthProvision.bicep. Variable: Mocked frontend hosting endpoint

Mocked frontend hosting output content
Mocked simple auth output content

`
    );
    expect(fileContent.get("infra\\azure\\templates\\frontendHostingProvision.bicep")).equals(
      "Mocked frontend hosting provision module content"
    );
    expect(fileContent.get("infra\\azure\\templates\\simpleAuthProvision.bicep")).equals(
      "Mocked simple auth provision module content"
    );
    expect(fileContent.get("infra\\azure\\parameters\\parameter.template.json")).equals(
      '{"$schema":"https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#","contentVersion":"1.0.0.0","parameters":{"FrontendParameter":"FrontendParameterValue","SimpleAuthParameter":"SimpleAuthParameterValue"}}'
    );
  });
});
