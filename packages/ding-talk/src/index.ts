import { Logger, getInputs } from '@serverless-cd/core';
import DingTalk, { IProps } from './ding-talk';

export const run = async (
  inputs: Record<string, any>,
  context: Record<string, any>,
  logger: Logger,
) => {
  logger.info('start ding-talk');
  logger.debug(`inputs: ${JSON.stringify(inputs)}`);
  logger.debug(`context: ${JSON.stringify(context)}`);
  const newInputs = getInputs(inputs, context) as unknown as IProps;
  logger.debug(`newInputs: ${JSON.stringify(newInputs)}`);
  const dingTalk = new DingTalk(newInputs, context, logger);
  await dingTalk.send();
  return { status: 'success' };
};

export default DingTalk;
