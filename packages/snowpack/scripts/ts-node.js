#!/usr/bin/env node

const path = require('path');
const tsNode = require('ts-node/dist/bin');

const curArgs = process.argv.slice(2);
const tsNodeArgs = curArgs.splice(0, curArgs.indexOf('--'));
const snowpackArgs = curArgs.splice(curArgs.indexOf('--') + 1);

const rootPath = path.resolve(__dirname, '../');
const tsConfigPath = path.resolve(rootPath, './tsconfig.ts-node.json');
const tsNodeBinPath = path.resolve(__dirname, './ts-node.bin.ts');

const args = tsNodeArgs.concat(['-P', tsConfigPath, '--dir', rootPath, tsNodeBinPath]).concat(snowpackArgs);

tsNode.main(args);
