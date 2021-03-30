export declare enum Stage {
    create = "create",
    update = "update",
    debug = "debug",
    provision = "provision",
    deploy = "deploy",
    publish = "publish",
    userTask = "userTask"
}
export declare type PredefinedTask = Stage.create | Stage.update | Stage.debug | Stage.provision | Stage.deploy | Stage.publish;
export declare enum Platform {
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}
export declare const ConfName = "teamsfx";
//# sourceMappingURL=constants.d.ts.map