import { loginAction } from "./login";
import { ErrorWithCode } from "@microsoft/teamsfx";
import TeamsUserCredentialContextInstance from "./singletonContext";

export async function addNewPermissionScope(addscopes) {
    const credential = TeamsUserCredentialContextInstance.getCredential();
    try {
        await credential.getToken(addscopes);  
    } catch(e) {
        try {
            if (e instanceof ErrorWithCode) await loginAction(addscopes);
        } catch(e) {
            console.log(e);
            throw new Error( "Error: Add New Scope Failed.");
        }
    } 
}
