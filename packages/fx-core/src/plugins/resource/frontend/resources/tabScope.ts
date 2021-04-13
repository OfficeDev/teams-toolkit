import * as configurableTab from "../static/configurableTabs.json";
import * as staticTab from "../static/staticTabs.json";
import Mustache from "mustache";
import { TabScope } from "./questions";
import { Constants } from "../constants";
import { PluginContext } from "fx-api";

export interface ManifestVariables {
    baseUrl: string;
}

export class TabScopeManifest {
    static readonly configurableTab = JSON.stringify(configurableTab);
    static readonly staticTab = JSON.stringify(staticTab);

    public static getConfigurableTab(variables: ManifestVariables, tabScope?: string): string {
        if (tabScope === TabScope.GroupTab) {
            return Mustache.render(TabScopeManifest.configurableTab, variables);
        }
        return Constants.EmptyListString;
    }

    public static getStaticTab(variables: ManifestVariables, tabScope?: string): string {
        if (tabScope === TabScope.PersonalTab) {
            return Mustache.render(TabScopeManifest.staticTab, variables);
        }
        return Constants.EmptyListString;
    }
}
