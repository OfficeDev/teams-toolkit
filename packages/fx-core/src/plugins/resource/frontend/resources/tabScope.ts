import configurableTabs from "../static/configurableTabs.json";
import staticTabs from "../static/staticTabs.json";
import Mustache from "mustache";
import { Constants, TabScope } from "../constants";
import { InvalidTabScopeError } from "./errors";

export interface ManifestVariables {
    baseUrl: string;
}

export class TabScopeManifest {
    static readonly configurableTab = JSON.stringify(configurableTabs);
    static readonly staticTab = JSON.stringify(staticTabs);

    public static validateScopes(tabScopes?: string[]): string[] {
        if (!tabScopes) {
            throw new InvalidTabScopeError();
        }

        if (!tabScopes.includes(TabScope.PersonalTab) && !tabScopes.includes(TabScope.GroupTab)) {
            throw new InvalidTabScopeError();
        }

        return tabScopes;
    }

    public static getConfigurableTab(variables: ManifestVariables, tabScopes: string[]): string {
        if (tabScopes.includes(TabScope.GroupTab)) {
            return Mustache.render(TabScopeManifest.configurableTab, variables);
        }
        return Constants.EmptyListString;
    }

    public static getStaticTab(variables: ManifestVariables, tabScopes: string[]): string {
        if (tabScopes.includes(TabScope.PersonalTab)) {
            return Mustache.render(TabScopeManifest.staticTab, variables);
        }
        return Constants.EmptyListString;
    }
}
