// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  Result,
  FxError,
  err,
  ok,
  Inputs,
  Tools,
  Stage,
  Platform,
  QTreeNode,
  Question,
  isAutoSkipSelect,
  SingleSelectQuestion,
  MultiSelectQuestion,
  StringValidation,
} from "@microsoft/teamsfx-api";
import { isCLIDotNetEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import { isM365AppEnabled } from "@microsoft/teamsfx-core/build/common/tools";
import AzureAccountManager from "./commonlib/azureLogin";
import M365TokenProvider from "./commonlib/m365Login";
import CLILogProvider from "./commonlib/log";
import CLIUIInstance from "./userInteraction";
import { flattenNodes, getSingleOptionString, toYargsOptions } from "./utils";
import { Options } from "yargs";
import {
  azureSolutionGroupNodeName,
  CollaboratorEmailNode,
  EnvNodeNoCreate,
  RootFolderNode,
  sqlPasswordConfirmQuestionName,
} from "./constants";
import { NoInitializedHelpGenerator } from "./error";
import { FxCore } from "@microsoft/teamsfx-core";
import { isV3Enabled } from "@microsoft/teamsfx-core";

export class HelpParamGenerator {
  private core: FxCore;
  private questionsMap: Map<string, QTreeNode> = new Map<string, QTreeNode>();
  private initialized = false;

  private static showEnvStage: string[] = [
    Stage.build,
    Stage.publish,
    Stage.provision,
    Stage.deploy,
    ...(isV3Enabled() ? [] : [Stage.grantPermission, Stage.checkPermission]),
    "validate",
    "update",
    "addCICDWorkflows",
    Stage.createEnv,
    "ResourceShowFunction",
    "ResourceShowSQL",
    "ResourceShowApim",
    "ResourceList",
  ];

  private static instance: HelpParamGenerator;

  private constructor() {
    const tools: Tools = {
      logProvider: CLILogProvider,
      tokenProvider: {
        azureAccountProvider: AzureAccountManager,
        m365TokenProvider: M365TokenProvider,
      },
      telemetryReporter: undefined,
      ui: CLIUIInstance,
    };
    this.core = new FxCore(tools);
  }

  public static getInstance(): HelpParamGenerator {
    if (!HelpParamGenerator.instance) {
      HelpParamGenerator.instance = new HelpParamGenerator();
    }
    return HelpParamGenerator.instance;
  }

  private getSystemInputs(projectPath?: string, platform?: Platform): Inputs {
    const systemInputs: Inputs = {
      platform: platform === undefined ? Platform.CLI_HELP : platform,
      projectPath: projectPath,
    };
    return systemInputs;
  }

  private setQuestionNodes(stage: string, questions: QTreeNode | undefined) {
    if (questions) {
      this.questionsMap.set(stage, questions);
    }
  }

  private getNamespaceFromStage(stage: string): string {
    let res = "";
    switch (stage) {
      case "addCICDWorkflows": {
        res = "fx-solution-azure/fx-resource-cicd";
        break;
      }
      case "connectExistingApi": {
        res = "fx-solution-azure/fx-resource-api-connector";
        break;
      }
      default: {
        res = "fx-solution-azure";
      }
    }
    return res;
  }

  private async getQuestionsForUserTask(stage: string, systemInput: Inputs, core: FxCore) {
    const func = {
      namespace: this.getNamespaceFromStage(stage),
      method: stage,
    };
    const result = await core.getQuestionsForUserTask(func, systemInput);
    if (result.isErr()) {
      return err(result.error);
    } else {
      this.setQuestionNodes(stage, result.value);
    }
    return ok(undefined);
  }

  public getQuestionRootNodeForHelp(stage: string, inputs?: Inputs): QTreeNode | undefined {
    if (this.questionsMap.has(stage)) {
      if (stage === Stage.create && inputs?.isM365) {
        return this.questionsMap.get(`${stage}-m365`);
      }
      return this.questionsMap.get(stage);
    }
    return undefined;
  }

  public async initializeQuestionsForHelp(): Promise<Result<boolean, FxError>> {
    if (this.initialized) {
      return ok(true);
    }
    const systemInput = this.getSystemInputs();
    for (const stage in Stage) {
      const result = await this.core.getQuestions(stage as Stage, systemInput);
      if (result.isErr()) {
        return err(result.error);
      } else {
        this.setQuestionNodes(stage, result.value);
      }
    }
    if (isM365AppEnabled()) {
      const result = await this.core.getQuestions(Stage.create, {
        ...systemInput,
        isM365: true,
      });
      if (result.isErr()) {
        return err(result.error);
      } else {
        this.setQuestionNodes(`${Stage.create}-m365`, result.value);
      }
    }
    const userTasks = ["addFeature", "addCICDWorkflows", "connectExistingApi"];
    for (const userTask of userTasks) {
      const result = await this.getQuestionsForUserTask(userTask, systemInput, this.core);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    this.initialized = true;
    return ok(true);
  }

  private splitFirst(s: string, sep: string): [string, string] {
    const [first, ...rest] = s.split(sep);
    return [first, rest.join(sep)];
  }

  public getYargsParamForHelp(stage: string, inputs?: Inputs): { [_: string]: Options } {
    if (!this.initialized) {
      throw NoInitializedHelpGenerator();
    }
    let resourceName: string | undefined;
    let authType: string | undefined;
    if (stage.startsWith("addFeature")) {
      resourceName = stage.split("-")[1];
      stage = "addFeature";
    } else if (stage.startsWith("connectExistingApi")) {
      authType = stage.split("-")[1];
      stage = "connectExistingApi";
    }
    const root = this.getQuestionRootNodeForHelp(stage, inputs);
    let nodes: QTreeNode[] = [];
    if (root && !root.children) root.children = [];
    if (resourceName && root?.children) {
      const rootCopy: QTreeNode = JSON.parse(JSON.stringify(root));
      const sqlOrApim = ["sql", "apim"].find((r) => r === resourceName);
      const resources = sqlOrApim ? ["function", resourceName] : [resourceName];
      // Do CLI map for resource add
      const mustHaveNodes = rootCopy.children!.filter(
        (node) => (node.condition as any).minItems === 1
      );
      const resourcesNodes = rootCopy.children!.filter(
        (node) =>
          resources.includes((node.condition as any).contains) ||
          (node.condition as any).containsAny?.includes(resourceName)
      );
      (rootCopy.data as any).default = [resourceName];
      (rootCopy.data as any).hide = true;
      rootCopy.children = undefined;
      nodes = [rootCopy].concat(mustHaveNodes);
      if (resourcesNodes) {
        resourcesNodes.forEach((node) => (nodes = nodes.concat(flattenNodes(node))));
      }
    } else if (authType && root?.children) {
      const rootCopy: QTreeNode = JSON.parse(JSON.stringify(root));
      const authNodes = rootCopy.children!.filter((node: any) => node.data.name === "auth-type")[0];
      const mustHaveNodes = rootCopy.children!.filter((node: any) => node.data.name != "auth-type");
      const authNode = authNodes.children!.filter((node: any) =>
        ((node.condition as any).equals as string).includes(authType as string)
      )[0];
      rootCopy.children = undefined;
      nodes = [rootCopy].concat(mustHaveNodes).concat(authNode ? flattenNodes(authNode) : []);
    } else if (root && stage === Stage.create) {
      const condition = "yes";
      root.children = root?.children?.filter((value) => {
        if (isCLIDotNetEnabled() || !value.condition) {
          return true;
        }
        return (value.condition as StringValidation).equals === condition;
      });
      nodes = flattenNodes(root);
    } else if (root) {
      nodes = flattenNodes(root);
    }

    // hide VS param for publish.
    if (stage === Stage.publish) {
      for (const node of nodes) {
        (node.data as any).hide = true;
      }
    }

    // Add folder node
    if (stage !== Stage.create) {
      nodes = nodes.concat([RootFolderNode]);
    } else {
      // Set default folder value for create stage
      for (const node of nodes) {
        if (node.data.name === "folder") {
          (node.data as any).default = "./";
        }
        if (node.data.name === "scratch" || node.data.name === "samples") {
          (node.data as any).hide = true;
        }
      }
    }

    // Add env node
    if (HelpParamGenerator.showEnvStage.indexOf(stage) >= 0) {
      nodes = nodes.concat([EnvNodeNoCreate]);
    }

    // hide sql-confirm-password in provision stage.
    if (stage === Stage.provision) {
      for (const node of nodes) {
        if (node.data.name === sqlPasswordConfirmQuestionName) {
          (node.data as any).hide = true;
        }
      }
    }

    // Add user email node for grant permission
    if (stage === Stage.grantPermission) {
      nodes = nodes.concat([CollaboratorEmailNode]);
    }

    if (stage === Stage.create) {
      for (const node of nodes) {
        // hide --azure-solution-group
        if (node.data.name === azureSolutionGroupNodeName) {
          (node.data as any).hide = true;
        }
      }
    }

    const nodesWithoutGroup = nodes.filter((node) => node.data.type !== "group");
    const params: { [_: string]: Options } = {};
    nodesWithoutGroup.forEach((node) => {
      const data = node.data as Question;
      if (isAutoSkipSelect(data) && data.type != "func") {
        // set the only option to default value so yargs will auto fill it.
        data.default = getSingleOptionString(data as SingleSelectQuestion | MultiSelectQuestion);
        (data as any).hide = true;
      }
      params[data.name] = toYargsOptions(data);
    });

    return params;
  }
}

export default HelpParamGenerator.getInstance();
