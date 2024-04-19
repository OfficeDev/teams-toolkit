import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { createContextV3 } from "../../../src/component/utils";
import path from "path";
import { createSandbox } from "sinon";
import { Generators } from "../../../src/component/generator/generatorProvider";
import {
  CapabilityOptions,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  NotificationTriggerOptions,
  ProgrammingLanguage,
} from "../../../src/question/create";
import { ApiMessageExtensionAuthOptions, QuestionNames } from "../../../src/question";
import { MockTools, randomAppName } from "../../core/utils";
import { Generator } from "../../../src/component/generator/generator";
import { TemplateNames } from "../../../src/component/generator/templates/templateNames";
import { setTools } from "../../../src/core/globalVars";
import { DefaultTemplateGenerator } from "../../../src/component/generator/templates/templateGenerator";
import { TemplateInfo } from "../../../src/component/generator/templates/templateInfo";

describe("TemplateGenerator", () => {
  const inputs2TemplateName = [
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id },
      name: TemplateNames.Tab,
    },
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.tab().id },
      name: TemplateNames.SsoTab,
    },
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.m365SsoLaunchPage().id },
      name: TemplateNames.SsoTabObo,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
        targetFramework: "net8.0",
      },
      name: TemplateNames.TabSSR,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
        targetFramework: "net8.0",
      },
      name: TemplateNames.SsoTabSSR,
    },
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.dashboardTab().id },
      name: TemplateNames.DashboardTab,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.appService().id,
      },
      name: TemplateNames.NotificationRestify,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.appServiceForVS().id,
      },
      name: TemplateNames.NotificationWebApi,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpTrigger().id,
      },
      name: TemplateNames.NotificationHttpTrigger,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpTriggerIsolated().id,
      },
      name: TemplateNames.NotificationHttpTriggerIsolated,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsTimerTrigger().id,
      },
      name: TemplateNames.NotificationTimerTrigger,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsTimerTriggerIsolated().id,
      },
      name: TemplateNames.NotificationTimerTriggerIsolated,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpAndTimerTrigger().id,
      },
      name: TemplateNames.NotificationHttpTimerTrigger,
    },
    {
      inputs: {
        platform: Platform.VS,
        [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]:
          NotificationTriggerOptions.functionsHttpAndTimerTriggerIsolated().id,
      },
      name: TemplateNames.NotificationHttpTimerTriggerIsolated,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.commandBot().id,
      },
      name: TemplateNames.CommandAndResponse,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.workflowBot().id,
      },
      name: TemplateNames.Workflow,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
      },
      name: TemplateNames.DefaultBot,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.me().id,
      },
      name: TemplateNames.MessageExtension,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.collectFormMe().id,
      },
      name: TemplateNames.MessageExtensionAction,
    },
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.SearchMe().id },
      name: TemplateNames.MessageExtensionSearch,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.botPlugin().id,
      },
      name: TemplateNames.MessageExtensionCopilot,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.botMe().id,
      },
      name: TemplateNames.M365MessageExtension,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTabAndBot().id,
      },
      name: TemplateNames.TabAndDefaultBot,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.botAndMe().id,
      },
      name: TemplateNames.BotAndMessageExtension,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.linkUnfurling().id,
      },
      name: TemplateNames.LinkUnfurling,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.aiBot().id,
      },
      name: TemplateNames.AIBot,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.aiAssistantBot().id,
      },
      name: TemplateNames.AIAssistantBot,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginNewApi().id,
      },
      name: TemplateNames.ApiPluginFromScratch,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
        [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.none().id,
      },
      name: TemplateNames.CopilotPluginFromScratch,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
        [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.apiKey().id,
      },
      name: TemplateNames.CopilotPluginFromScratchApiKey,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
        [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.microsoftEntra().id,
      },
      name: TemplateNames.ApiMessageExtensionSso,
    },
    {
      inputs: { [QuestionNames.Capabilities]: CapabilityOptions.customCopilotBasic().id },
      name: TemplateNames.CustomCopilotBasic,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customize().id,
      },
      name: TemplateNames.CustomCopilotRagCustomize,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.azureAISearch().id,
      },
      name: TemplateNames.CustomCopilotRagAzureAISearch,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customApi().id,
      },
      name: TemplateNames.CustomCopilotRagCustomApi,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.microsoft365().id,
      },
      name: TemplateNames.CustomCopilotRagMicrosoft365,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotAssistant().id,
        [QuestionNames.CustomCopilotAssistant]: CustomCopilotAssistantOptions.new().id,
      },
      name: TemplateNames.CustomCopilotAssistantNew,
    },
    {
      inputs: {
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotAssistant().id,
        [QuestionNames.CustomCopilotAssistant]: CustomCopilotAssistantOptions.assistantsApi().id,
      },
      name: TemplateNames.CustomCopilotAssistantAssistantsApi,
    },
  ];

  setTools(new MockTools());
  const ctx = createContextV3();
  const destinationPath = path.join(__dirname, "tmp");
  const sandbox = createSandbox();
  let scaffoldingSpy: sinon.SinonSpy;
  let inputs: Inputs;

  beforeEach(() => {
    scaffoldingSpy = sandbox.spy(DefaultTemplateGenerator.prototype, <any>"scaffolding");
    sandbox.stub(Generator, "generate").resolves();
    inputs = {
      platform: Platform.VSCode,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.JS,
    } as Inputs;
  });

  afterEach(() => {
    sandbox.restore();
  });

  inputs2TemplateName.forEach(async (pair) => {
    it(`scaffolding ${pair.name}`, async () => {
      inputs = { ...inputs, ...pair.inputs };
      const res = await Generators.find((g) => g.activate(ctx, inputs))?.run(
        ctx,
        inputs,
        destinationPath
      );

      assert.isTrue(res?.isOk());
      assert.isTrue(scaffoldingSpy.calledOnce);
      assert.equal((scaffoldingSpy.args[0][1] as TemplateInfo).templateName, pair.name);
      assert.equal(
        (scaffoldingSpy.args[0][1] as TemplateInfo).language,
        pair.inputs?.[QuestionNames.ProgrammingLanguage] || ProgrammingLanguage.JS
      );
    });
  });
});
