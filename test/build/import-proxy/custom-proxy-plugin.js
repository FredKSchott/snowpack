module.exports = function () {
  return {
    proxy: ({fileExt, fileName, contents}) => {
      if (fileExt === '.svg') {
        return `
          export default "I am SVG: ${fileName}";
          export const contents = ${JSON.stringify(contents)};
        `;
      }
    },
  };
};
