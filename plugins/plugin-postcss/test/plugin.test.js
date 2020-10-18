const fs = require('fs');
const path = require('path');
const plugin = require("../plugin.js");

const cssPath = path.resolve(__dirname, './stubs/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');
const configFilePath = path.resolve(__dirname, './stubs/postcss.config.js');

describe('@snowpack/plugin-postcss', () => {
    test('with no options', async () => {
        const pluginInstance = plugin({}, {});
        const transformCSSResults = await pluginInstance.transform({
            fileExt: path.extname(cssPath),
            contents: cssContent 
        });

        expect(transformCSSResults).toMatchSnapshot();
    });

    test('passing in a config file', async () => {
        const options = {
            config: path.resolve(configFilePath)
        }
        const pluginInstance = plugin({}, options)
        const transformCSSResults = await pluginInstance.transform({
            fileExt: path.extname(cssPath),
            contents: cssContent 
        });
        expect(transformCSSResults).toMatchSnapshot();
    });
});
