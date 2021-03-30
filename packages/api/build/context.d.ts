import { ConfigMap, PluginConfig, ReadonlySolutionConfig, SolutionConfig } from './config';
import { Dialog } from './utils';
import { VsCode } from './vscode';
import { TeamsAppManifest } from './manifest';
import { GraphTokenProvider, LogProvider, TelemetryReporter, AzureAccountProvider, AppStudioTokenProvider } from './utils';
import { Platform } from './types';
import { TreeProvider } from './utils';
export interface Context {
    root: string;
    dialog?: Dialog;
    logProvider?: LogProvider;
    telemetryReporter?: TelemetryReporter;
    azureAccountProvider?: AzureAccountProvider;
    graphTokenProvider?: GraphTokenProvider;
    appStudioToken?: AppStudioTokenProvider;
    treeProvider?: TreeProvider;
    platform?: Platform;
    answers?: ConfigMap;
}
export interface SolutionContext extends Context {
    dotVsCode?: VsCode;
    app: TeamsAppManifest;
    config: SolutionConfig;
}
export interface PluginContext extends Context {
    configOfOtherPlugins: ReadonlySolutionConfig;
    config: PluginConfig;
    app: Readonly<TeamsAppManifest>;
}
//# sourceMappingURL=context.d.ts.map