import {promises as fs, existsSync} from 'fs';
import {bold, dim} from 'kleur/colors';
import path from 'path';
import {logger} from '../logger';
import {CommandOptions} from '../types';
import {INIT_TEMPLATE_FILE} from '../util';

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  logger.info(`Creating new project configuration file... ${dim('(snowpack.config.js)')}`);
  if (!existsSync(path.join(config.root, 'package.json'))) {
    logger.error(`Error: create a package.json file in your project root`)
    process.exit(1)
  }
  const destLoc = path.join(config.root, 'snowpack.config.js');
  if (existsSync(destLoc)) {
    logger.error(`Error: File already exists, cannot overwrite ${destLoc}`);
    process.exit(1);
  }
  await fs.writeFile(destLoc, INIT_TEMPLATE_FILE);
  logger.info(`File created! Open ${bold('snowpack.config.js')} to customize your project.`);
}
