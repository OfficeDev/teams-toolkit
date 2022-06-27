import { Inputs, Question } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import {
  NodeVersionNotSupportedError,
  NpmNotFoundError,
  NpmVersionNotSupportedError,
} from "../error";
import { Constants } from "./constants";
import { Utils } from "./utils";

export enum SPFXQuestionNames {
  framework_type = "spfx-framework-type",
  webpart_name = "spfx-webpart-name",
  webpart_desp = "spfx-webpart-desp",
  version_check = "spfx-version-check",
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
  default: "helloworld",
  validation: {
    pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
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
