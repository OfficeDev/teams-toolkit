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
  OptionItem,
} from "@microsoft/teamsfx-api";

import { FxCore } from "@microsoft/teamsfx-core";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import GraphTokenProvider from "./commonlib/graphLogin";
import SharepointTokenProvider from "./commonlib/sharepointLogin";
import CLILogProvider from "./commonlib/log";
import CLIUIInstance from "./userInteraction";
import { flattenNodes, getSingleOptionString, toYargsOptions } from "./utils";
import { Options } from "yargs";
import {
  CollaboratorEmailNode,
  EnvNodeNoCreate,
  RootFolderNode,
  sqlPasswordConfirmQuestionName,
} from "./constants";
import { NoInitializedHelpGenerator } from "./error";

export class HelpParamGenerator {
  private core: FxCore;
  private questionsMap: Map<string, QTreeNode> = new Map<string, QTreeNode>();
  private initialized = false;

  private static showEnvStage: string[] = [
    Stage.build,
    Stage.publish,
    Stage.provision,
    Stage.deploy,
    Stage.grantPermission,
    Stage.checkPermission,
    "validate",
    "update",
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
        graphTokenProvider: GraphTokenProvider,
        appStudioToken: AppStudioTokenProvider,
        sharepointTokenProvider: SharepointTokenProvider,
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

  private async getQuestionsForUserTask(stage: string, systemInput: Inputs, core: FxCore) {
    const func = {
      namespace: "fx-solution-azure",
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

  public getQuestionRootNodeForHelp(stage: string): QTreeNode | undefined {
    if (this.questionsMap.has(stage)) {
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
    const userTasks = ["addCapability", "addResource"];
    for (const userTask of userTasks) {
      const result = await this.getQuestionsForUserTask(userTask, systemInput, this.core);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    this.initialized = true;
    return ok(true);
  }

  public getYargsParamForHelp(stage: string): { [_: string]: Options } {
    if (!this.initialized) {
      throw NoInitializedHelpGenerator();
    }
    let resourceName: string | undefined;
    let capabilityId: string | undefined;
    if (stage.startsWith("addResource")) {
      resourceName = stage.split("-")[1];
      stage = "addResource";
    } else if (stage.startsWith("addCapability")) {
      capabilityId = stage.split("-")[1];
      stage = "addCapability";
    }
    const root = this.getQuestionRootNodeForHelp(stage);
    let nodes: QTreeNode[] = [];
    if (root && !root.children) root.children = [];
    if (resourceName && root?.children) {
      const rootCopy: QTreeNode = JSON.parse(JSON.stringify(root));
      // Do CLI map for resource add
      const mustHaveNodes = rootCopy.children!.filter(
        (node) => (node.condition as any).minItems === 1
      );
      const resourcesNodes = rootCopy.children!.filter(
        (node) =>
          (node.condition as any).contains === resourceName ||
          (node.condition as any).containsAny?.includes(resourceName)
      );
      (rootCopy.data as any).default = [resourceName];
      (rootCopy.data as any).hide = true;
      rootCopy.children = undefined;
      nodes = [rootCopy].concat(mustHaveNodes);
      if (resourcesNodes) {
        resourcesNodes.forEach((node) => (nodes = nodes.concat(flattenNodes(node))));
      }
    } else if (capabilityId && root?.children) {
      const rootCopy: QTreeNode = JSON.parse(JSON.stringify(root));
      // Do CLI map for capability add
      const capabilityNodes = rootCopy.children!.filter((node) =>
        ((node.condition as any).containsAny as string[]).includes(capabilityId as string)
      )[0];
      const items = (rootCopy.data as MultiSelectQuestion).staticOptions as OptionItem[];
      const index = items.findIndex(
        (item) => item.id === capabilityId || item.cliName === capabilityId
      );
      if (index > -1) {
        (rootCopy.data as any).default = [items[index].cliName || items[index].id];
      }
      (rootCopy.data as any).hide = true;
      rootCopy.children = undefined;
      nodes = [rootCopy].concat(capabilityNodes ? flattenNodes(capabilityNodes) : []);
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
