var entrypoint = {
    export1: 'foo',
    export2: 'bar',
};

var export1 = entrypoint.export1;
var export2 = entrypoint.export2;
export { export1, export2 };
