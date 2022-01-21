/**
 * Actually, you can just use `type xx = string` to create an alias for a type.
 * This kind of implement just makes the code more readable and easy to index.
 */
export type alias<T> = T;

export type PluginName = alias<string>;
export type PluginURI = alias<string>;
export type PluginVersion = alias<string>;
export type PluginPath = alias<string>;

export type Plugins = alias<Record<PluginName, PluginURI>>;
