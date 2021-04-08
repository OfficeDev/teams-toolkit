import axios from "axios";
import { err, FxError, ok, Result, SystemError } from "teamsfx-api";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AppStudioClient {
    const baseUrl = "https://dev.teams.microsoft.com";

    // TODO: Check if the app exists in Teams App Catalog, if so update the app, otherwise publish the app
    export async function publishTeamsApp(file: Buffer, appStudioToken: string): Promise<Result<string, FxError>> {
        axios.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
        const response = await axios.post(`${baseUrl}/api/publishing`, file);
        if (response && response.data) {
            return ok(response.data.id);
        } else {
            const error = new SystemError(response.statusText, response.statusText, "AppStudioPlugin");
            return err(error);
        }
    }
}