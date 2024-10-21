declare namespace microsoftTeams {
  interface Context {
    app?: {
      host?: {
        name?: string;
      };
    };
  }

  namespace app {
    function initialize(): Promise<void>;
    function getContext(): Promise<Context>;
  }
}
