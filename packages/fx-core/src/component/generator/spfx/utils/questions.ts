import * as jsonschema from "jsonschema";
import fs from "fs-extra";
import * as path from "path";
import { Inputs, OptionItem, Question, Stage } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { DevEnvironmentSetupError, PathAlreadyExistsError, RetrieveSPFxInfoError } from "../error";
import { Constants } from "./constants";
import { PackageSelectOptionsHelper, SPFxVersionOptionIds } from "./question-helper";
import { SPFxQuestionNames } from "../../../constants";
import { CoreQuestionNames } from "../../../../core/question";
import { SPFxGenerator } from "../spfxGenerator";

export enum SPFXQuestionNames {
  framework_type = "spfx-framework-type",
  webpart_name = "spfx-webpart-name",
  webpart_desp = "spfx-webpart-desp",
  version_check = "spfx-version-check",
  load_package_version = "spfx-load-package-version",
  use_global_package_or_install_local = "spfx-install-latest-package",
  spfx_solution = "spfx-solution",
  spfx_import_folder = "spfx-folder",
  skip_app_name = "skip-app-name",
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
        const webpartFolder = path.join(
          previousInputs[SPFxQuestionNames.SPFxFolder],
          "src",
          "webparts",
          input
        );
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

export const spfxPackageSelectQuestion: Question = {
  type: "singleSelect",
  name: SPFXQuestionNames.use_global_package_or_install_local,
  title: getLocalizedString("plugins.spfx.questions.packageSelect.title"),
  staticOptions: [],
  placeholder: getLocalizedString("plugins.spfx.questions.packageSelect.placeholder"),
  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
    await PackageSelectOptionsHelper.loadOptions();
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

export const spfxSolutionQuestion: Question = {
  type: "singleSelect",
  name: SPFXQuestionNames.spfx_solution,
  title: getLocalizedString("plugins.spfx.questions.spfxSolution.title"),
  staticOptions: [
    { id: "new", label: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew") },
    {
      id: "import",
      label: getLocalizedString("plugins.spfx.questions.spfxSolution.importExisting"),
    },
  ],
};

export function spfxImportFolderQuestion(): Question {
  return {
    type: "folder",
    name: SPFXQuestionNames.spfx_import_folder,
    title: getLocalizedString("core.spfxFolder.title"),
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
  };
}

export const skipAppName: Question = {
  type: "func",
  name: SPFXQuestionNames.skip_app_name,
  title: "Set app name to skip",
  func: async (inputs: Inputs) => {
    if (inputs[SPFXQuestionNames.spfx_solution] == "import") {
      const solutionName = await SPFxGenerator.getSolutionName(
        inputs[SPFXQuestionNames.spfx_import_folder]
      );
      if (solutionName) {
        inputs[CoreQuestionNames.AppName] = solutionName;
        if (await fs.pathExists(path.join(inputs.folder, solutionName)))
          throw PathAlreadyExistsError(path.join(inputs.folder, solutionName));
      } else {
        throw RetrieveSPFxInfoError();
      }
    }
  },
};
