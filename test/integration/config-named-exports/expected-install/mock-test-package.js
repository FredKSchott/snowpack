var entrypoint = {
    export1: 'foo',
    export2: 'bar',
};
var entrypoint_1 = entrypoint.export1;
var entrypoint_2 = entrypoint.export2;

export { entrypoint_1 as export1, entrypoint_2 as export2 };
