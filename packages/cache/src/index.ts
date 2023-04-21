import { lodash as _, Logger, getInputs, getStepContext } from '@serverless-cd/core';
import Joi from 'joi';
import Cache, { IProps } from './cache';

interface ISchemaError {
  error: Error;
};

const getCacheInputs = (inputs: Record<string, any>, context: Record<string, any>, logger: Logger): IProps | ISchemaError => {
  logger.debug(`context: ${JSON.stringify(context)}`);
  logger.debug(`inputs: ${JSON.stringify(inputs)}`);
  const newInputs = getInputs(inputs, context) as unknown;
  logger.debug(`newInputs: ${JSON.stringify(newInputs)}`);

  const Schema = Joi.object({
    key: Joi.string().required(),
    path: Joi.string().required(),
    region: Joi.string().required(),
    ossConfig: Joi.object({
      bucket: Joi.string().required(),
      internal: Joi.boolean(),
    }).required(),
    credentials: Joi.object({
      accessKeyID: Joi.string().required(),
      accessKeySecret: Joi.string().required(),
    }),
  });

  const { error } = Schema.validate(newInputs, { abortEarly: false, convert: false, allowUnknown: true });
  if (error) {
    logger.debug(`check input error: ${error}`);
    return { error };
  }

  return {
    cwd: _.get(context, 'cwd'),
    objectKey: _.get(newInputs, 'key', ''),
    region: _.get(newInputs, 'region', ''),
    cachePath: _.get(newInputs, 'path', ''),
    bucket: _.get(newInputs, 'ossConfig.bucket', ''),
    internal: _.get(newInputs, 'ossConfig.internal', false),
    credentials: {
      accessKeySecret: _.get(newInputs, 'credentials.accessKeySecret', ''),
      accessKeyID: _.get(newInputs, 'credentials.accessKeyID', ''),
    },
  };
}

export const run = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache run');
  const props = getCacheInputs(inputs, context, logger);
  if ((props as ISchemaError).error) {
    const error = _.get(props, 'error') as unknown as Error;
    logger.warn(`The entry information is wrong: ${error.message}`);
    return { 'cache-hit': false, error };
  }
  const cache = new Cache(props as IProps, logger);
  const res = await cache.run();
  logger.info('Run @serverless-cd/cache end');
  return res;
};

export const postRun = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache postRun');
  const props = getCacheInputs(inputs, context, logger);
  if ((props as ISchemaError).error) {
    const error = _.get(props, 'error') as unknown as Error;
    logger.warn(`The entry information is wrong: ${error.message}`);
    return;
  }

  const stepContext = getStepContext(context);
  const cacheHit = _.get(stepContext, 'run.outputs.cache-hit');
  const cacheError = _.get(stepContext, 'run.outputs.error');
  logger.debug(`Get run output cache hit: ${cacheHit}`);
  const cache = new Cache((props as IProps), logger);
  await cache.postRun(cacheHit, cacheError);
  logger.info('postRun @serverless-cd/cache end');
};

export default Cache;
