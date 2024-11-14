export type TaskArgs = {
  price?: number;
  limit?: number;
};

export type DeployOptions = {
  gasPrice?: number;
  gasLimit?: number;
};

export function getDeployOptions(taskArgs: any): DeployOptions {
  let deployOptions: DeployOptions = {};
  if (taskArgs.price) {
    deployOptions.gasPrice = taskArgs.price * 1000000000;
  }
  if (taskArgs.limit) {
    deployOptions.gasLimit = taskArgs.limit;
  }

  return deployOptions;
}
