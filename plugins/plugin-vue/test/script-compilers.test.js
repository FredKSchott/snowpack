const fs = require('fs');
const path = require('path');
const scriptCompilers = require('../src/script-compilers');

test('esbuildCompile ts', () => {
  const {esbuildCompile} = scriptCompilers;
  const codeContent = fs.readFileSync(path.resolve(__dirname, './stubs/TsContent.ts')).toString();
  const resultContent = esbuildCompile(codeContent, 'ts');
  expect(resultContent).toMatchSnapshot();
});

test('esbuildCompile tsx', () => {
  const {esbuildCompile} = scriptCompilers;
  const codeContent = fs.readFileSync(path.resolve(__dirname, './stubs/TsxContent.tsx')).toString();
  const resultContent = esbuildCompile(codeContent, 'tsx');
  expect(resultContent).toMatchSnapshot();
});

test('esbuildCompile jsx', () => {
  const {esbuildCompile} = scriptCompilers;
  const codeContent = fs.readFileSync(path.resolve(__dirname, './stubs/JsxContent.jsx')).toString();
  const resultContent = esbuildCompile(codeContent, 'jsx');
  expect(resultContent).toMatchSnapshot();
});
