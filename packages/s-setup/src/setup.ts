import { lodash as _, Logger } from '@serverless-cd/core';
import { spawnSync } from 'child_process';

export interface ICredentials {
  accountId: string;
  accessKeyId: string;
  accessKeySecret: string;
  securityToken?: string;
}

export interface IProps {
  alias: string;
  credentials: ICredentials;
}

/*
echo "Setup Serverless Devs ing..."
# 打开调试模式，将命令输出
set -x
ls -al

# aliyun cloud authentication infos.
access_key_id=${{ sts.accessKeyId || "dummy-ak" }}
access_key_secret=${{ sts.accessKeySecret || "dummy-sk" }}
security_token=${{ sts.securityToken || "dummy-token" }}
uid=${{ uid || "dummy-uid" }}
# account info alias
alias=my-account
s --version
if [[ $? -ne 0 ]]; then
  echo "Serverless Devs is not installed."
  exit 1
fi
s config add --AccessKeyID "${access_key_id}" --AccessKeySecret "${access_key_secret}" \
--AccountID "${uid}" --SecurityToken "${security_token}" --access "${alias}" -f
if [[ $? -ne 0 ]]; then
  echo "Failed to setup Serverless Devs."
  exit 1
fi
echo "Setup Serverless Devs success."
*/
export default function setup(props: IProps, logger: Logger) {
  const alias = _.get(props, 'alias', 'default');
  const credentials = _.get(props, 'credentials', {} as ICredentials);
  if (_.isEmpty(credentials)) {
    throw new Error('Failed to setup Serverless Devs');
  }
  const { status, stdout, stderr } = spawnSync('s --version', { shell: true, encoding: 'utf8' });
  logger.debug(`Run s --version status: ${status}`);
  logger.debug(`Run s --version stdout: ${stdout}`);
  if (stderr) {
    logger.error(`Run s --version stderr: ${stderr}`);
  }
  if (status !== 0) {
    throw new Error('Serverless Devs is not installed');
  }
  let runCommond = `s config add --AccessKeyID "${credentials.accessKeyId}" --AccessKeySecret "${credentials.accessKeySecret}"`;
  if (credentials.accountId) {
    runCommond = `${runCommond} --AccountID "${credentials.accountId}"`
  }
  if (credentials.securityToken) {
    runCommond = `${runCommond} --SecurityToken "${credentials.securityToken}"`
  }
  runCommond = `${runCommond} --access "${alias}" -f`
  const addRes = spawnSync(runCommond, { shell: true, encoding: 'utf8' })
  logger.debug(`Run s add stdout: ${addRes.stdout}`);
  if (addRes.stderr) {
    logger.error(`Run s --version stderr: ${addRes.stderr}`);
  }
}
