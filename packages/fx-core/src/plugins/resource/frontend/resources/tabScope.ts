import configurableTabs from "../static/configurableTabs.json";
import staticTabs from "../static/staticTabs.json";
import Mustache from "mustache";
import { TabScope } from "./questions";
import { Constants } from "../constants";

export interface ManifestVariables {
    baseUrl: string;
}

export class TabScopeManifest {
    static readonly configurableTab = JSON.stringify(configurableTabs);
    static readonly staticTab = JSON.stringify(staticTabs);

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
