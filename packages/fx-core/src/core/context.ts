import { Context,ResourceTemplates, SolutionContext, SolutionPlugin, TokenProvider, VariableDict} from "fx-api";


export interface CoreContext extends Context{

    globalSolutions: Map<string, SolutionPlugin>;

    solution?:SolutionPlugin;

    provisionTemplates?:ResourceTemplates;

    deployTemplates?: ResourceTemplates;

    variableDict?: VariableDict;

    tokenProvider: TokenProvider;

    solutionContext?: SolutionContext;
}