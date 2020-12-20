export interface ESMRuntimeConfig {
    loadUrl: (url: string) => Promise<{
        contents: string;
    }>;
}
export interface ESMRuntime {
    importModule: (url: string) => Promise<any>;
    invalidateModule: (url: string) => void;
}
export declare function createRuntime({ loadUrl }: ESMRuntimeConfig): ESMRuntime;
