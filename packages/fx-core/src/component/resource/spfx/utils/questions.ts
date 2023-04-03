import * as jsonschema from "jsonschema";
import fs from "fs-extra";
import * as path from "path";
import { Inputs, OptionItem, Question, Stage } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import {
  DevEnvironmentSetupError,
  NodeVersionNotSupportedError,
  NpmNotFoundError,
  NpmVersionNotSupportedError,
} from "../error";
import { Constants } from "./constants";
import { Utils } from "./utils";
import { PackageSelectOptionsHelper, SPFxVersionOptionIds } from "./question-helper";
import { isV3Enabled } from "../../../../common/tools";
import { SPFxQuestionNames } from "../../../constants";

export enum SPFXQuestionNames {
  framework_type = "spfx-framework-type",
  webpart_name = "spfx-webpart-name",
  webpart_desp = "spfx-webpart-desp",
  version_check = "spfx-version-check",
  load_package_version = "spfx-load-package-version",
  use_global_package_or_install_local = "spfx-install-latest-package",
}

export const frameworkQuestion: Question = {
  type: "singleSelect",
  name: SPFXQuestionNames.framework_type,
  title: getLocalizedString("plugins.spfx.questions.framework.title"),
  staticOptions: [
    { id: "react", label: "React" },
    { id: "minimal", label: "Minimal" },
    { id: "none", label: "None" },
  ],
  placeholder: "Select an option",
  default: "react",
};

export const webpartNameQuestion: Question = {
  type: "text",
  name: SPFXQuestionNames.webpart_name,
  title: "Web Part Name",
  default: Constants.DEFAULT_WEBPART_NAME,
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
      const schema = {
        pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
      };
      const validateRes = jsonschema.validate(input, schema);
      if (validateRes.errors && validateRes.errors.length > 0) {
        return getLocalizedString(
          "plugins.spfx.questions.webpartName.error.notMatch",
          input,
          schema.pattern
        );
      }

      if (
        previousInputs &&
        ((previousInputs.stage === Stage.addWebpart &&
          previousInputs[SPFxQuestionNames.SPFxFolder]) ||
          (previousInputs?.stage === Stage.addFeature && previousInputs?.projectPath))
      ) {
        const webpartFolder = isV3Enabled()
          ? path.join(previousInputs[SPFxQuestionNames.SPFxFolder], "src", "webparts", input)
          : path.join(previousInputs?.projectPath as any, "SPFx", "src", "webparts", input);
        if (await fs.pathExists(webpartFolder)) {
          return getLocalizedString(
            "plugins.spfx.questions.webpartName.error.duplicate",
            webpartFolder
          );
        }
      }
      return undefined;
    },
  },
};

export const webpartDescriptionQuestion: Question = {
  type: "text",
  name: SPFXQuestionNames.webpart_desp,
  title: "Web Part Description",
  default: "helloworld description",
  validation: {
    required: true,
  },
};

export const versionCheckQuestion: Question = {
  type: "func",
  name: SPFXQuestionNames.version_check,
  title: getLocalizedString("plugins.spfx.questions.versionCheck.title"),
  func: async (inputs: Inputs) => {
    const npmMajorVersion = await Utils.getNPMMajorVersion(undefined);
    if (npmMajorVersion === undefined) {
      throw NpmNotFoundError();
    }

    const isNpmVersionSupported = Constants.SUPPORTED_NPM_VERSION.includes(npmMajorVersion);
    if (!isNpmVersionSupported) {
      throw NpmVersionNotSupportedError(npmMajorVersion!);
    }

    const nodeMajorVersion = await Utils.getNodeVersion();
    const isNodeVersionSupported =
      nodeMajorVersion && Constants.SUPPORTED_NODE_VERSION.includes(nodeMajorVersion);
    if (!isNodeVersionSupported) {
      throw NodeVersionNotSupportedError(nodeMajorVersion ?? "");
    }
    return undefined;
  },
};

export const loadPackageVersions: Question = {
  type: "func",
  name: SPFXQuestionNames.load_package_version,
  title: getLocalizedString("plugins.spfx.questions.packageSelect.title"),
  func: async (inputs: Inputs) => {
    await PackageSelectOptionsHelper.loadOptions();
    return undefined;
  },
};

export const spfxPackageSelectQuestion: Question = {
  type: "singleSelect",
  name: SPFXQuestionNames.use_global_package_or_install_local,
  title: getLocalizedString("plugins.spfx.questions.packageSelect.title"),
  staticOptions: [],
  placeholder: getLocalizedString("plugins.spfx.questions.packageSelect.placeholder"),
  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
    return PackageSelectOptionsHelper.getOptions();
  },
  default: SPFxVersionOptionIds.installLocally,
  validation: {
    validFunc: async (input: string): Promise<string | undefined> => {
      if (input === SPFxVersionOptionIds.globalPackage) {
        const hasPackagesInstalled = PackageSelectOptionsHelper.checkGlobalPackages();
        if (!hasPackagesInstalled) {
          throw DevEnvironmentSetupError();
        }
      }

      return undefined;
    },
  },
};
