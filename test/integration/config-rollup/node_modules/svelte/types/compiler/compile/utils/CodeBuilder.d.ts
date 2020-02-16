interface Chunk {
    parent?: BlockChunk;
    type: 'root' | 'line' | 'condition';
    children?: Chunk[];
    line?: string;
    block?: boolean;
    condition?: string;
}
interface BlockChunk extends Chunk {
    type: 'root' | 'condition';
    children: Chunk[];
    parent: BlockChunk;
}
export default class CodeBuilder {
    root: BlockChunk;
    last: Chunk;
    current: BlockChunk;
    constructor(str?: string);
    add_conditional(condition: string, body: string): void;
    add_line(line: string): void;
    add_block(block: string): void;
    is_empty(): boolean;
    push_condition(condition: string): void;
    pop_condition(): void;
    toString(): string;
}
export {};
