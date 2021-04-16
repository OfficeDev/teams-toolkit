// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  MultiSelectQuestion,
  OptionItem,
  Stage
} from "fx-api";

import * as constants from "../constants";
import { Generator } from "./generator";

abstract class CapabilityAddGenerator extends Generator {
  abstract readonly capabilityName: string;

  public readonly doUserTask = true;
  public readonly func = {
    namespace: "fx-solution-azure",
    method: "addCapability"
  };

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value as QTreeNode[];

    // get capabilities node
    const capabilityParamName = "capabilities";
    const capabilityNode = allNodes.filter((node) => node.data.name === capabilityParamName)[0];
    if (!capabilityNode) {
      throw Error(`${capabilityParamName} is not found in the capability add's param list.`);
    }
    const option = (capabilityNode.data as MultiSelectQuestion).option as OptionItem[];
    const optionIds = option.map((op) => op.id);
    if (!optionIds.includes(this.capabilityName)) {
      throw Error(`${optionIds} do not include ${this.capabilityName}`);
    }
    (capabilityNode.data as any).default = [this.capabilityName];
    (capabilityNode.data as any).hide = true;

    return ok(allNodes);
  }
}

export class CapabilityAddTabGenerator extends CapabilityAddGenerator {
  public readonly commandName = "teamsfx capability add tab";
  public readonly capabilityName = "Tab";
  public readonly outputPath = constants.capabilityAddTabParamPath;
}

export class CapabilityAddBotGenerator extends CapabilityAddGenerator {
  public readonly commandName = "teamsfx capability add bot";
  public readonly capabilityName = "Bot";
  public readonly outputPath = constants.capabilityAddBotParamPath;
}
