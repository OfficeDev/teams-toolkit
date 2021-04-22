import configurableTabs from "../static/configurableTabs.json";
import staticTabs from "../static/staticTabs.json";
import Mustache from "mustache";
import { Constants, TabScope } from "../constants";
import { InvalidTabScopeError } from "./errors";

export interface ManifestVariables {
    baseUrl: string;
    personalTabName?: string;
}

export class TabScopeManifest {
    static readonly configurableTab = JSON.stringify(configurableTabs);
    static readonly staticTab = JSON.stringify(staticTabs);

    public static validateScopes(tabScopes?: string[]): string[] {
        if (!tabScopes) {
            throw new InvalidTabScopeError();
        }

        // tabScopes is valid as long as it contains an valid scope
        for (const [_key, validScope] of Object.entries(TabScope)) {
            if (tabScopes.includes(validScope)) {
                return tabScopes;
            }
        }

        throw new InvalidTabScopeError();
    }

    public static addNewToConfigurableTabs(originTabs: string[], variables: ManifestVariables, tabScopes: string[]): string[] {
        if (tabScopes.includes(TabScope.GroupTab)) {
            originTabs.push(Mustache.render(TabScopeManifest.configurableTab, variables));
        }
        return originTabs;
    }

    public static addNewToStaticTabs(originTabs: string[], variables: ManifestVariables, tabScopes: string[]): string[] {
        if (tabScopes.includes(TabScope.PersonalTab)) {
            originTabs.push(Mustache.render(TabScopeManifest.staticTab, variables));
        }
        return originTabs;
    }
}
