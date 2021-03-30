import { OptionItem } from './question';
import { Json } from './types';
export declare type ConfigValue = string | string[] | number | number[] | boolean | boolean[] | OptionItem[] | OptionItem | undefined;
export declare type PluginIdentity = string;
export declare type PluginConfig = ConfigMap;
export declare type ReadonlyPluginConfig = ReadonlyMap<string, ConfigValue>;
export declare type SolutionConfig = Map<PluginIdentity, PluginConfig>;
export declare type ReadonlySolutionConfig = ReadonlyMap<PluginIdentity, ReadonlyPluginConfig>;
export declare class ConfigMap extends Map<string, ConfigValue> {
    getString(k: string, defaultValue?: string): string | undefined;
    getBoolean(k: string, defaultValue?: boolean): boolean | undefined;
    getNumber(k: string, defaultValue?: number): number | undefined;
    getStringArray(k: string, defaultValue?: string[]): string[] | undefined;
    getNumberArray(k: string, defaultValue?: number[]): number[] | undefined;
    getBooleanArray(k: string, defaultValue?: boolean[]): boolean[] | undefined;
    getOptionItem(k: string, defaultValue?: OptionItem): OptionItem | undefined;
    getOptionItemArray(k: string, defaultValue?: OptionItem[]): OptionItem[] | undefined;
    toJSON(): Json;
    static fromJSON(obj?: Json): ConfigMap | undefined;
}
//# sourceMappingURL=config.d.ts.map