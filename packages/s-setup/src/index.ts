import { lodash as _, Logger, getInputs, getCredentials } from '@serverless-cd/core';
import { spawnSync } from 'child_process';
import setup, { IProps, ICredentials } from './setup';

async function getCredential(inputs: any, context: any): Promise<ICredentials> {
  const credentials = {
    accountId: _.get(context, 'inputs.sts.accountId') || _.get(context, 'inputs.uid'),
    accessKeyId: _.get(context, 'inputs.sts.accessKeyId'),
    accessKeySecret: _.get(context, 'inputs.sts.accessKeySecret'),
    securityToken: _.get(context, 'inputs.sts.securityToken'),
  };
  if (credentials.accountId && credentials.accessKeyId && credentials.accessKeySecret) {
    return credentials;
  }

  return await getCredentials(inputs, context) as ICredentials;
}

const getCoreInputs = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger): Promise<IProps> => {
  logger.debug(`context: ${JSON.stringify(context)}`);
  logger.debug(`inputs: ${JSON.stringify(inputs)}`);
  const newInputs = getInputs(inputs, context) as Record<string, any>;
  logger.debug(`newInputs: ${JSON.stringify(newInputs)}`);
  const credentials = await getCredential(newInputs, context) as ICredentials;
  
  return {
    alias: _.get(inputs, 'alias', 'default'),
    credentials
  };
}

export const run = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/s-setup run');
  const props = await getCoreInputs(inputs, context, logger);
  const cwd = _.get(context, 'cwd', '');
  const lsRes = spawnSync(`ls -al ${cwd}`, { shell: true, encoding: 'utf8' });
  logger.debug(`ls -al ${cwd} res: ${lsRes.stdout}`);
  await setup(props, logger);
  logger.info('Run @serverless-cd/s-setup end');
};

export default setup;
