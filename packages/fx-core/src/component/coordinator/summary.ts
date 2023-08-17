// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { combine, FxError, LogProvider, Result } from "@microsoft/teamsfx-api";
import { DriverDefinition, ExecutionResult, ILifecycle } from "../configManager/interface";
import { EOL } from "os";
import { SummaryConstant } from "../configManager/constant";
import _ from "lodash";
import { getLocalizedString } from "../../common/localizeUtils";

const indent = "  ";

function getActionName(driverDef: DriverDefinition): string {
  return driverDef.name ? `${driverDef.uses}(${driverDef.name})` : driverDef.uses;
}

function getDriverDescription(log: LogProvider, lifecycle: ILifecycle): Result<string[], FxError> {
  const n = lifecycle.driverDefs.length;
  return lifecycle.resolveDriverInstances(log).map((instances) => {
    return instances.map((instance, i) => {
      const actionName = getActionName(instance);
      const desc = instance.instance.description ? `: ${instance.instance.description}` : "";
      return `(${i + 1}/${n}) ${getLocalizedString(
        "core.summary.actionDescription",
        actionName,
        desc
      )}`;
    });
  });
}

function getLifecycleDescription(log: LogProvider, lifecycle: ILifecycle): Result<string, FxError> {
  const n = lifecycle.driverDefs.length;
  return getDriverDescription(log, lifecycle).map((descriptions) => {
    return getLocalizedString(
      "core.summary.lifecycleDescription",
      lifecycle.name,
      n,
      `${EOL}${descriptions.join(EOL)}`
    );
  });
}

type LifecycleState = {
  name: string;
  status: "succeeded" | "failed" | "notExecuted";
  actionStates: ActionState[];
};

function initLifecycleState(lifecycle: ILifecycle): LifecycleState {
  return {
    name: lifecycle.name,
    status: "notExecuted",
    actionStates: initActionStates(lifecycle),
  };
}

function updateLifecycleState(state: LifecycleState, execResult: ExecutionResult): void {
  if (execResult.result.isOk()) {
    state.status = "succeeded";
  } else {
    state.status = "failed";
  }

  updateActionStates(state.actionStates, execResult);
}

type ActionState = {
  name: string;
  status: "succeeded" | "failed" | "notExecuted";
  summaries: string[];
};

function initActionStates(lifecycle: ILifecycle): ActionState[] {
  return lifecycle.driverDefs.map((driverDef) => {
    return {
      name: getActionName(driverDef),
      status: "notExecuted",
      summaries: [],
    };
  });
}

function updateActionStates(actionStates: ActionState[], executionResult: ExecutionResult): void {
  const { result, summaries } = executionResult;
  if (result.isOk()) {
    actionStates.forEach((actionState, i) => {
      actionState.status = "succeeded";
      if (summaries[i]) {
        actionState.summaries = summaries[i];
      }
    });
  } else if (result.isErr()) {
    const e = result.error;
    if (e.kind === "Failure") {
      // just ignore Failure, because we can leave action states as "notExecuted"
    } else if (e.kind === "PartialSuccess") {
      const executedActionNum = summaries.length;
      actionStates.forEach((actionState, i) => {
        if (i < executedActionNum - 1) {
          actionState.status = "succeeded";
        } else if (i == executedActionNum - 1) {
          actionState.status = "failed";
        }

        if (summaries[i]) {
          actionState.summaries = summaries[i];
        }
      });
    }
  }
}

function stringifyLifecycleState(lifecycleState: LifecycleState): string[] {
  const result: string[] = [];

  if (lifecycleState.status === "notExecuted") {
    result.push(
      getLocalizedString(
        "core.summary.lifecycleNotExecuted",
        SummaryConstant.NotExecuted,
        lifecycleState.name
      )
    );
  } else if (lifecycleState.status === "succeeded") {
    result.push(
      getLocalizedString(
        "core.summary.lifecycleSucceeded",
        SummaryConstant.Succeeded,
        lifecycleState.name
      )
    );
  } else if (lifecycleState.status === "failed") {
    result.push(
      getLocalizedString(
        "core.summary.lifecycleFailed",
        SummaryConstant.Failed,
        lifecycleState.name
      )
    );
  }

  for (const actionState of lifecycleState.actionStates) {
    if (actionState.status === "notExecuted") {
      result.push(
        getLocalizedString(
          "core.summary.actionNotExecuted",
          `${indent}${SummaryConstant.NotExecuted} ${actionState.name}`
        )
      );
    } else if (actionState.status === "failed") {
      result.push(
        getLocalizedString(
          "core.summary.actionFailed",
          `${indent}${SummaryConstant.Failed} ${actionState.name}`
        )
      );
    } else if (actionState.status === "succeeded") {
      result.push(
        getLocalizedString(
          "core.summary.actionSucceeded",
          `${indent}${SummaryConstant.Succeeded} ${actionState.name}`
        )
      );
    }
    for (const summary of actionState.summaries) {
      if (actionState.status === "notExecuted") {
        result.push(`${indent}${indent}${SummaryConstant.NotExecuted} ${summary}`);
      } else {
        result.push(`${indent}${indent}${summary}`);
      }
    }
  }

  return result;
}

export class SummaryReporter {
  private lifecycles: ILifecycle[];
  lifecycleStates: LifecycleState[];
  private log: LogProvider;

  constructor(lifecycles: ILifecycle[], log: LogProvider) {
    this.lifecycles = lifecycles;
    this.lifecycleStates = lifecycles.map((lifecycle) => initLifecycleState(lifecycle));
    this.log = log;
  }

  // This method returns a Result, because it could fail due to driver resolution failure.
  getLifecycleDescriptions(): Result<string, FxError> {
    return combine(
      this.lifecycles.map((lifecycle) => getLifecycleDescription(this.log, lifecycle))
    ).map((descriptions) => descriptions.join(EOL));
  }

  updateLifecycleState(index: number, execResult: ExecutionResult): void {
    updateLifecycleState(this.lifecycleStates[index], execResult);
  }

  getLifecycleSummary(createdEnvFile = undefined): string {
    const summaries = this.lifecycleStates.map((lifecycleState) => {
      return stringifyLifecycleState(lifecycleState);
    });

    const flattened = _.flatten(summaries);
    return `Summary:${EOL}${
      createdEnvFile
        ? // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          `  ${getLocalizedString("core.summary.createdEnvFile")} ` + createdEnvFile + EOL + EOL
        : ""
    }${flattened.join(EOL)}`;
  }
}
