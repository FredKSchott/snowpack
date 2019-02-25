// import chalk from 'chalk';

function getLineCol(node: any): string {
  const loc = node.loc.start;
  return `[${loc.line}:${loc.column}]`;
  // return chalk.dim(`[${loc.line}:${loc.column}]`);
}

export function validateDynamicImportArguments(path) {
  if (path.parent.arguments.length !== 1) {
    return new Set([
      `${getLineCol(path.node)} "\`import()\` only accepts 1 argument, but got ${path.parent.arguments.length}`,
    ]);
  }
  const [argNode] = path.parent.arguments;
  if (argNode.type !== 'StringLiteral') {
    return new Set([
      `${getLineCol(
        path.node,
      )} Pika expects strings as \`import()\` arguments. Treating this as an absolute file path.`,
    ]);
  }
  return new Set();
}
