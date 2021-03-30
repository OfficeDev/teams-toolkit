export declare enum PluginType {
    Frontend = "Frontend",
    Backend = "Backend",
    DataStorage = "DataStorage"
}
export interface Json {
    [k: string]: any;
}
export declare enum LifecycleStage {
    Init = 0,
    Scaffold = 1,
    Provision = 2,
    Build = 3,
    Test = 4,
    Run = 5,
    Debug = 6,
    Deploy = 7,
    Publish = 8
}
export declare enum Stage {
    create = "create",
    update = "update",
    debug = "debug",
    provision = "provision",
    deploy = "deploy"
}
export declare enum Platform {
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}
//# sourceMappingURL=types.d.ts.map