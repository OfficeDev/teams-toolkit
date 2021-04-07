export * from "./solution";
import { ok, FxError, Result, Solution } from "fx-api";
import { TeamsAppSolution } from "./solution";

export async function Default(): Promise<Result<Solution, FxError>> {
    return ok(new TeamsAppSolution());
}
