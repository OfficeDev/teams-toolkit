import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { getTemplatesFolder } from "..";
import {
  fetchTemplateUrl,
  fetchZipFromUrl,
  renderTemplateContent,
  unzip,
} from "./templatesUtils";

// The entire progress has following actions:
// 1. get zip url. (to fill ScaffoldContext.zipUrl).
// 2. get template zip. (to fill ScaffoldContext.zip).
// 3. get template unzip.
//
// If any of the target field are filled, the action will be skipped.
export interface ScaffoldContext {
  // Used to indicate template target.
  group?: string;
  lang?: string;
  scenario?: string;

  // Used to create local folders.
  dst?: string;
  zip?: AdmZip;

  // Used by network fetching.
  zipUrl?: string;
  tryLimits?: number;
  timeoutInMs?: number;

  // Used by fallback zip.
  templatesFolderName?: string;

  // Used by rendering template file.
  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => string;

  // Used by process.
  onActionStart?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionEnd?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionError?: (action: ScaffoldAction, context: ScaffoldContext, error: Error) => Promise<void>;
}

export interface ScaffoldAction {
  name: string;
  run: (context: ScaffoldContext) => Promise<void>;
}

const defaultTryLimits = 3;
const defaultTimeoutInMs = 10000;

const missKeyErrorInfo = (key: string) => `Missing ${key} in template action.`;

export enum ScaffoldActionName {
  FetchTemplatesUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchTemplatesZipFromUrl = "FetchTemplatesZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

export const fetchTemplatesUrlWithTagAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplatesUrlWithTag,
  run: async (context: ScaffoldContext) => {
    if (context.zipUrl || context.zip) {
      return;
    }

    if (!context.group) {
      throw new Error(missKeyErrorInfo("group"));
    }

    if (!context.lang) {
      throw new Error(missKeyErrorInfo("lang"));
    }

    if (!context.scenario) {
      throw new Error(missKeyErrorInfo("scenario"));
    }

    const tryLimits = context.tryLimits ?? defaultTryLimits;
    const timeoutInMs = context.timeoutInMs ?? defaultTimeoutInMs;

    context.zipUrl = await fetchTemplateUrl(
      context.group,
      context.lang,
      context.scenario,
      tryLimits,
      timeoutInMs
    );
  },
};

export const fetchTemplatesZipFromUrlAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplatesZipFromUrl,
  run: async (context: ScaffoldContext) => {
    if (context.zip || !context.zipUrl) {
      return;
    }

    const tryLimits = context.tryLimits ?? defaultTryLimits;
    const timeoutInMs = context.timeoutInMs ?? defaultTimeoutInMs;

    context.zip = await fetchZipFromUrl(context.zipUrl, tryLimits, timeoutInMs);
  },
};

export const fetchTemplateZipFromLocalAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplateZipFromLocal,
  run: async (context: ScaffoldContext) => {
    if (context.zip) {
      return;
    }

    if (!context.group) {
      throw new Error(missKeyErrorInfo("group"));
    }

    if (!context.lang) {
      throw new Error(missKeyErrorInfo("lang"));
    }

    if (!context.scenario) {
      throw new Error(missKeyErrorInfo("scenario"));
    }

    if (!context.templatesFolderName) {
      throw new Error(missKeyErrorInfo("templatesFolderName"));
    }

    const fileName: string = [context.group, context.lang, context.scenario, "zip"].join(".");

    const zipPath: string = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      context.templatesFolderName,
      fileName
    );

    const data: Buffer = await fs.readFile(zipPath);
    context.zip = new AdmZip(data);
  },
};

export const unzipAction: ScaffoldAction = {
  name: ScaffoldActionName.Unzip,
  run: async (context: ScaffoldContext) => {
    if (!context.dst) {
      throw new Error(missKeyErrorInfo("dst"));
    }

    if (!context.zip) {
      throw new Error(missKeyErrorInfo("zip"));
    }

    await unzip(context.zip, context.dst, context.fileNameReplaceFn, context.fileDataReplaceFn);
  },
};

export const defaultActionSeq: ScaffoldAction[] = [
  fetchTemplatesUrlWithTagAction,
  fetchTemplatesZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export function genTemplateRenderReplaceFn(variable: { [key: string]: string }) {
  return (name: string, data: Buffer) => renderTemplateContent(name, data, variable);
}

export function removeTemplateExtReplaceFn(name: string, data: Buffer) {
  return name.replace(/\.tpl/, "");
}

export async function scaffoldFromTemplates(
  context: ScaffoldContext,
  actions: ScaffoldAction[] = defaultActionSeq
) {
  for (const action of actions) {
    try {
      await context.onActionStart?.(action, context);
      await action.run(context);
      await context.onActionEnd?.(action, context);
    } catch (e) {
      if (!context.onActionError) {
        throw e;
      }
      await context.onActionError(action, context, e);
    }
  }
}
