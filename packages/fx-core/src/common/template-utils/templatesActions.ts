import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { getTemplatesFolder } from "../../folder";
import { FeatureFlagName } from "../constants";
import { Component, sendTelemetryEvent, TelemetryEvent, TelemetryProperty } from "../telemetry";
import { fetchTemplateUrl, fetchZipFromUrl, renderTemplateContent, unzip } from "./templatesUtils";

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
  templatesFolderPath?: string;

  // To identify if fallback is triggered.
  fallback?: boolean;

  // Used by rendering template file.
  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => string | Buffer;

  // Used by process.
  onActionStart?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionEnd?: (action: ScaffoldAction, context: ScaffoldContext) => Promise<void>;
  onActionError?: (action: ScaffoldAction, context: ScaffoldContext, error: Error) => Promise<void>;
}

export interface ScaffoldAction {
  name: string;
  run: (context: ScaffoldContext) => Promise<void>;
}

const defaultTryLimits = 1;
const defaultTimeoutInMs = 30000;

const missKeyErrorInfo = (key: string) => `Missing ${key} in template action.`;

export enum ScaffoldActionName {
  FetchTemplateZipFromSourceCode = "FetchTemplateZipFromSourceCode",
  FetchTemplatesUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchTemplatesZipFromUrl = "FetchTemplatesZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

// * This action is only for debug purpose
export const fetchTemplateZipFromSourceCodeAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplateZipFromSourceCode,
  run: async (context: ScaffoldContext) => {
    const isDebugMode = () => {
      const DebugTemplateFlag = process.env[FeatureFlagName.DebugTemplate];
      return DebugTemplateFlag?.toLowerCase() === "true" && process.env.NODE_ENV === "development";
    };

    if (!isDebugMode()) {
      return;
    }

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

    //! This path only works in debug mode
    const templateSourceCodePath = path.resolve(
      __dirname,
      "../../../../../",
      "templates",
      context.group,
      context.lang,
      context.scenario
    );

    const zip = new AdmZip();
    zip.addLocalFolder(templateSourceCodePath);

    context.zip = zip;
  },
};

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

    context.fallback = true;

    if (!context.group) {
      throw new Error(missKeyErrorInfo("group"));
    }

    if (!context.lang) {
      throw new Error(missKeyErrorInfo("lang"));
    }

    if (!context.scenario) {
      throw new Error(missKeyErrorInfo("scenario"));
    }

    if (!context.templatesFolderPath) {
      context.templatesFolderPath = path.join(getTemplatesFolder(), "fallback");
    }

    const fileName: string = [context.group, context.lang, context.scenario, "zip"].join(".");
    const zipPath: string = path.join(context.templatesFolderPath, fileName);

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
  fetchTemplateZipFromSourceCodeAction,
  fetchTemplatesUrlWithTagAction,
  fetchTemplatesZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export function genTemplateRenderReplaceFn(variable: { [key: string]: string }) {
  return (name: string, data: Buffer) => renderTemplateContent(name, data, variable);
}

export function removeTemplateExtReplaceFn(name: string, data: Buffer): string {
  return name.replace(/\.tpl/, "");
}

export async function scaffoldFromTemplates(
  context: ScaffoldContext,
  actions: ScaffoldAction[] = defaultActionSeq
): Promise<void> {
  // To track code templates usage.
  sendTelemetryEvent(Component.core, TelemetryEvent.ScaffoldFromTemplatesStart, {
    [TelemetryProperty.TemplateGroup]: context.group ?? "",
    [TelemetryProperty.TemplateLanguage]: context.lang ?? "",
    [TelemetryProperty.TemplateScenario]: context.scenario ?? "",
  });

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

  sendTelemetryEvent(Component.core, TelemetryEvent.ScaffoldFromTemplates, {
    [TelemetryProperty.TemplateGroup]: context.group ?? "",
    [TelemetryProperty.TemplateLanguage]: context.lang ?? "",
    [TelemetryProperty.TemplateScenario]: context.scenario ?? "",
    [TelemetryProperty.TemplateFallback]: context.fallback ? "true" : "false", // Track fallback cases.
  });
}
