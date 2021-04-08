import { err, FxError, ok, Plugin, PluginContext, Result } from "teamsfx-api";
import { AppStudioPluginImpl } from "./plugin";

export class AppStudioPlugin implements Plugin {
    private appStudioPluginImpl = new AppStudioPluginImpl();
    
    /**
     * Validate manifest string against schema
     * @param {string} manifestString - the string of manifest.json file
     * @returns {string[]} an array of errors
     */
    public async validateManifest(manifestString: string): Promise<Result<string[], FxError>> {
        return await this.appStudioPluginImpl.validateManifest(manifestString);
    }

    /**
     * Publish the app to Teams App Catalog
     * @param {PluginContext} ctx
     * @returns {string[]} - Teams App ID in app catalog
     */
    public async publish(ctx: PluginContext): Promise<Result<string, FxError>> {
        return await this.appStudioPluginImpl.publish(ctx);
    }
}