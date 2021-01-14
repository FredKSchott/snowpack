// copy esinstall types into ./types
// copy skypack types into ./types
// rewrite `from 'esinstall'` to `from '../types/esinstall';
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const mkdirp = require('mkdirp');
const rootDirectory = path.join(__dirname, '../..');

function updateTypeReferences(packageName) {
  const vendorTypesFolder = path.join(rootDirectory, 'snowpack/vendor/types');
  const files = glob.sync(path.join(rootDirectory, 'snowpack', '/lib/**/*.d.ts'), {
    nodir: true,
    absolute: true,
  });
  console.log(files);

  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    const matchOldImport = new RegExp(`from \'${packageName}\';`);
    const newImport = `from '${path.relative(path.dirname(f), path.join(vendorTypesFolder, packageName))}';`;
    fs.writeFileSync(f, body.replace(matchOldImport, newImport), 'utf8');
  }

}

function bundleTypes(packageName) {
  console.log(rootDirectory);
  const files = glob.sync(path.join(rootDirectory, packageName, '/lib/**/*.d.ts'), {
    nodir: true,
    absolute: true,
  });
  console.log(files);

  for (const f of files) {
    const newFileLoc = f.replace(
      `${rootDirectory}/${packageName}/lib`,
      `${rootDirectory}/snowpack/vendor/types/${packageName}`,
    );
    mkdirp.sync(path.dirname(newFileLoc));
    fs.copyFileSync(f, newFileLoc);
  }
  updateTypeReferences(packageName);
}

bundleTypes('esinstall');
bundleTypes('skypack');