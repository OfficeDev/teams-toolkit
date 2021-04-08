import { FxError, ok, PluginContext, Result } from "teamsfx-api";
import { AppStudioClient } from "./appStudio";
import Ajv from "ajv";

export class AppStudioPluginImpl {
    private manifestSchema = require("./../../resource/MicrosoftTeams.schema.json");
    private ajv = new Ajv();
    private validate = this.ajv.compile(this.manifestSchema);

    public async validateManifest(manifestString: string): Promise<Result<string[], FxError>> {
        const valid = this.validate(manifestString);
        if (!valid && this.validate.errors) {
            return ok(this.validate.errors.map(error => error.keyword + error.message));
        } else {
            return ok([]);
        }
    }

    public async publish(ctx: PluginContext): Promise<Result<string, FxError>> {
        // Validate manifest

        // Update App in App Studio

        // return await AppStudioClient.publishTeamsApp();
        return ok("undefined");
    }
}