import { Context, EnvMeta,ResourceTemplates, SolutionPlugin, TokenProvider, VariableDict} from "fx-api";


export interface CoreContext extends Context{

    solution?:SolutionPlugin;

    env?:EnvMeta;

    provisionTemplates?:ResourceTemplates;

    deployTemplates?: ResourceTemplates

    variableDict?: VariableDict;

    tokenProvider?: TokenProvider;
}