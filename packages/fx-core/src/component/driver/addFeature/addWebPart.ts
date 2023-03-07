// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Result,
  FxError,
  ok,
  err,
  ManifestUtil,
  Platform,
  IStaticTab,
  v3,
  Inputs,
  Stage,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";
import { getAbsolutePath, wrapRun } from "../../utils/common";
import { AddWebPartArgs } from "./interface/AddWebPartArgs";
import { Utils } from "../../resource/spfx/utils/utils";
import { camelCase } from "lodash";
import path from "path";
import { getTemplatesFolder } from "../../../folder";
import { YoChecker } from "../../resource/spfx/depsChecker/yoChecker";
import { GeneratorChecker } from "../../resource/spfx/depsChecker/generatorChecker";
import { isGeneratorCheckerEnabled, isYoCheckerEnabled } from "../../../common/tools";
import { DependencyInstallError } from "../../resource/spfx/error";
import { cpUtils } from "../../../common/deps-checker";
import { DefaultManifestProvider } from "../../resource/appManifest/manifestProvider";
import * as fs from "fs-extra";
import * as util from "util";
import { ManifestTemplate } from "../../resource/spfx/utils/constants";
import { SPFxGenerator } from "../../generator/spfxGenerator";
import { createContextV3 } from "../../utils";
import { SPFXQuestionNames } from "../../resource/spfx/utils/questions";
import { NoConfigurationError } from "../../resource/spfx/error";

const actionName = "spfx/add";

@Service(actionName)
export class AddWebPartDriver implements StepDriver {
  description = getLocalizedString("driver.spfx.add.description");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: AddWebPartArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    return wrapRun(() => this.add(args, wrapContext));
  }

  public async execute(args: AddWebPartArgs, context: DriverContext): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.run(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  public async add(args: AddWebPartArgs, context: WrapDriverContext): Promise<Map<string, string>> {
    const webpartName = args.webpartName;
    const spfxFolder = args.spfxFolder;
    const manifestPath = args.manifestPath;
    const localManifestPath = args.localManifestPath;

    const yorcPath = path.join(context.projectPath, "src", ".yo-rc.json");
    if (!(await fs.pathExists(yorcPath))) {
      throw NoConfigurationError();
    }

    const inputs: Inputs = { platform: context.platform, stage: Stage.addWebpart };
    inputs[SPFXQuestionNames.webpart_name] = webpartName;
    const yeomanRes = await SPFxGenerator.doYeomanScaffold(
      createContextV3(),
      inputs,
      context.projectPath
    );
    if (yeomanRes.isErr()) throw yeomanRes.error;

    return new Map();
  }
}
