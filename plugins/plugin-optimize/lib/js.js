/**
 * Functions for dealing with parsing/transforming JS
 */
const fs = require('fs');
const path = require('path');
const {parse} = require('es-module-lexer');
const colors = require('kleur/colors');
const {log, projectURL, isRemoteModule} = require('../util');

/** Recursively scan JS for static imports */
function scanJS({file, rootDir, scannedFiles, importList}) {
  try {
    // 1. scan file for static imports
    scannedFiles.add(file); // keep track of scanned files so we never redo work
    importList.add(file); // make sure import is marked
    let code = fs.readFileSync(file, 'utf-8');
    const [imports] = parse(code);
    imports
      .filter(({d}) => d === -1) // this is where we discard dynamic imports (> -1) and import.meta (-2)
      .forEach(({s, e}) => {
        const specifier = code.substring(s, e);
        if (isRemoteModule(specifier)) {
          importList.add(specifier);
          scannedFiles.add(specifier); // don’t scan remote modules
        } else {
          importList.add(
            specifier.startsWith('/')
              ? path.join(rootDir, file)
              : path.resolve(path.dirname(file), specifier),
          );
        }
      });

    // 2. recursively scan imports not yet scanned
    [...importList]
      .filter((fileLoc) => !scannedFiles.has(fileLoc)) // prevent infinite loop
      .forEach((fileLoc) => {
        scanJS({file: fileLoc, rootDir, scannedFiles, importList}).forEach((newImport) => {
          importList.add(newImport);
        });
      });

    return importList;
  } catch (err) {
    log(colors.yellow(` could not locate "${projectURL(file, rootDir)}"`), 'warn');
    return importList;
  }
}
exports.scanJS = scanJS;
