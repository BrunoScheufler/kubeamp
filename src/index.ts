#!/usr/bin/env node

import execa from 'execa';
import Config from 'configstore';
import chalk from 'chalk';
import {
  HOME,
  handleSetup,
  getProcessArgs,
  getRawProcessArgs,
  getCtlProcessEnv
} from './util';

// tslint:disable-next-line
const { name: packageName } = require('../package.json');

(async () => {
  const { _ } = getProcessArgs();

  if (!HOME) {
    console.log(
      chalk.redBright(`Please add $HOME to your environment variables.`)
    );
    process.exit(1);
    return;
  }

  const config = new Config(packageName, {
    configs: [],
    ctlCommand: 'kubectl'
  });

  if (_[0] && _[0] === 'setup') {
    await handleSetup(config);
    return;
  }

  const { ctlCommand } = config.all;
  const proc = execa(ctlCommand, [...getRawProcessArgs()], {
    shell: true,
    env: getCtlProcessEnv(config)
  });

  proc.stderr.pipe(process.stderr);
  proc.stdout.pipe(process.stdout);
})();
