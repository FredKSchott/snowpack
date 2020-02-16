export interface Processed {
    code: string;
    map?: object | string;
    dependencies?: string[];
}
export interface PreprocessorGroup {
    markup?: (options: {
        content: string;
        filename: string;
    }) => Processed | Promise<Processed>;
    style?: Preprocessor;
    script?: Preprocessor;
}
export declare type Preprocessor = (options: {
    content: string;
    attributes: Record<string, string | boolean>;
    filename?: string;
}) => Processed | Promise<Processed>;
export default function preprocess(source: string, preprocessor: PreprocessorGroup | PreprocessorGroup[], options?: {
    filename?: string;
}): Promise<{
    code: string;
    dependencies: any[];
    toString(): string;
}>;
