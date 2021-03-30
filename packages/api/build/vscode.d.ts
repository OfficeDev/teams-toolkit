import { Result } from 'neverthrow';
import { FxError } from './error';
export interface VsCode {
    /**
     * configurations.json
     */
    addConfigurations: (configurations: any) => Promise<Result<null, FxError>>;
    /**
     * tasks.json
     */
    addTasks: (tasks: any) => Promise<Result<null, FxError>>;
    addInputs: (iputs: any) => Promise<Result<null, FxError>>;
    /**
     * settings.json
     */
    addSettings: (settings: any) => Promise<Result<null, FxError>>;
    /**
     * extensions.json
     */
    addRecommendations: (recommendations: any) => Promise<Result<null, FxError>>;
}
//# sourceMappingURL=vscode.d.ts.map