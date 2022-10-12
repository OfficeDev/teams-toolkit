import * as jsonschema from "jsonschema";
import fs from "fs-extra";
import * as path from "path";
import { Inputs, Question, Stage } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import {
  NodeVersionNotSupportedError,
  NpmNotFoundError,
  NpmVersionNotSupportedError,
} from "../error";
import { Constants } from "./constants";
import { isOfficialSPFx, Utils } from "./utils";

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

      if (previousInputs?.stage === Stage.addFeature && previousInputs?.projectPath) {
        const webpartFolder = path.join(
          previousInputs?.projectPath,
          "SPFx",
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

export const versionCheckQuestion: Question = {
  type: "func",
  name: SPFXQuestionNames.version_check,
  title: getLocalizedString("plugins.spfx.questions.versionCheck.title"),
  func: async (inputs: Inputs) => {
    const npmMajorVersion = await Utils.getNPMMajorVersion(undefined);
    if (npmMajorVersion === undefined) {
      throw NpmNotFoundError();
    }

    const supportedNpmVersion = isOfficialSPFx()
      ? Constants.SUPPORTED_NPM_VERSION
      : Constants.SUPPORTED_NPM_VERSION_PRERELEASE;
    const isNpmVersionSupported = supportedNpmVersion.includes(npmMajorVersion);
    if (!isNpmVersionSupported) {
      throw NpmVersionNotSupportedError(npmMajorVersion!);
    }

    const supportedNodeVersion = isOfficialSPFx()
      ? Constants.SUPPORTED_NODE_VERSION
      : Constants.SUPPORTED_NODE_VERSION_PRERELEASE;
    const nodeMajorVersion = await Utils.getNodeVersion();
    const isNodeVersionSupported =
      nodeMajorVersion && supportedNodeVersion.includes(nodeMajorVersion);
    if (!isNodeVersionSupported) {
      throw NodeVersionNotSupportedError(nodeMajorVersion ?? "");
    }
    return undefined;
  },
};
