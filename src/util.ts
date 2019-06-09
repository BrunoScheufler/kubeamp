import inquirer from 'inquirer';
import path from 'path';
import chalk from 'chalk';
import { pathExists } from 'fs-extra';
import Config from 'configstore';
import execa = require('execa');
import minimist = require('minimist');

export const HOME = process.env.HOME!;

export const setupItems = [
  '✏️ Add config',
  '🔖 Set context',
  '🏷 Set namespace preference',
  '🔧 Manage configs',
  '⚙️ Set ctl command'
];

export function getConfigurations(config: Config) {
  const configs: string[] = config.get('configs');
  return configs.map((c: string) => path.resolve(c.replace('$HOME', HOME)));
}

export function getRawProcessArgs() {
  return process.argv.slice(2);
}

export function getProcessArgs() {
  return minimist(getRawProcessArgs());
}

export const baseConfig = getProcessArgs().kubeconfig || `${HOME}/.kube/config`;

export function getCtlProcessEnv(config: Config) {
  return {
    ...process.env,
    KUBECONFIG: [baseConfig, ...getConfigurations(config)].join(':')
  };
}

export async function handleSetup(config: Config) {
  const { mode } = await inquirer.prompt<{ mode: string }>([
    {
      type: 'list',
      name: 'mode',
      choices: setupItems,
      message: 'What do you want to do?'
    }
  ]);

  const modeIndex = setupItems.findIndex(i => i === mode);

  switch (modeIndex) {
    case 0:
      await addConfig(config);
      break;
    case 1:
      await setCurrentContext(config);
      break;
    case 2:
      await setNamespace(config);
      break;
    case 3:
      await manageConfigs(config);
      break;
    case 4:
      await setCtlCommand(config);
      break;
  }
}

export async function addConfig(config: Config) {
  console.log(
    chalk.gray(
      // tslint:disable-next-line
      `You can include $HOME to be replaced at run-time with the environment variable's value (usually your home directory).`
    )
  );
  const { filePath } = await inquirer.prompt<{ filePath: string }>([
    {
      type: 'input',
      name: 'filePath',
      message: 'Please specify the configuration file path'
    }
  ]);

  const configs: string[] = config.get('configs');
  if (configs.includes(filePath)) {
    console.log(chalk.redBright(`You've already added this config file!`));
    return;
  }

  const fileExists = await pathExists(
    path.resolve(filePath.replace('$HOME', HOME))
  );

  if (!fileExists || !config) {
    console.log(chalk.redBright(`The specified config file doesn't exist.`));
    return;
  }

  config.set('configs', [...configs, filePath]);

  console.log(chalk.greenBright('Added config file!'));
}

export async function manageConfigs(config: Config) {
  const configs: string[] = config.get('configs');

  if (configs.length < 1) {
    console.log(chalk.redBright('🤨 No configurations found.'));
    return;
  }

  const { configPath } = await inquirer.prompt<{ configPath: string }>([
    {
      type: 'list',
      choices: configs,
      name: 'configPath',
      message: 'Select a config to be removed'
    }
  ]);

  configs.splice(configs.indexOf(configPath), 1);
  console.log(chalk.greenBright('🤖 Removed configuration!'));

  config.set('configs', configs);
}

export async function getCurrentContext(config: Config) {
  const { stdout, failed } = await execa(
    config.get('ctlCommand'),
    ['config', 'current-context'],
    {
      shell: true,
      env: getCtlProcessEnv(config)
    }
  );

  if (failed) {
    return undefined;
  }

  return stdout;
}

export async function setCurrentContext(config: Config) {
  const currentContext = await getCurrentContext(config);
  const { contextName } = await inquirer.prompt<{ contextName: string }>([
    {
      type: 'input',
      name: 'contextName',
      message: 'Enter the context name',
      default: currentContext
    }
  ]);

  const proc = execa(
    config.get('ctlCommand'),
    ['config', 'use-context', contextName],
    {
      shell: true,
      env: getCtlProcessEnv(config)
    }
  );

  proc.stderr.pipe(process.stderr);
  proc.stdout.pipe(process.stdout);
}

export async function setCtlCommand(config: Config) {
  const { ctlCommand } = await inquirer.prompt<{ ctlCommand: string }>([
    {
      type: 'input',
      name: 'ctlCommand',
      message: 'Enter command to use (or default to kubectl with empty input)',
      default: config.get('ctlCommand')
    }
  ]);

  const command = ctlCommand.length > 0 ? ctlCommand : 'kubectl';
  config.set('ctlCommand', command);
  console.log(chalk.greenBright(`Now using '${command}' as ctl command!`));
}

export async function setNamespace(config: Config) {
  const { namespace } = await inquirer.prompt<{ namespace: string }>([
    {
      type: 'input',
      name: 'namespace',
      message: 'Update namespace preference'
    }
  ]);

  const ctx = await getCurrentContext(config);

  if (!ctx) {
    console.log(chalk.redBright('💥 Could not update namespace preference'));
    return;
  }

  const proc = await execa(
    config.get('ctlCommand'),
    ['config', 'set-context', ctx, '--namespace', namespace],
    {
      shell: true,
      env: getCtlProcessEnv(config)
    }
  );

  if (proc.failed) {
    console.log(chalk.redBright('💥 Could not update namespace preference'));
    return;
  }

  console.log(chalk.greenBright(`🎉 Now using namespace '${namespace}'`));
}
