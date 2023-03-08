export type TaskArgs = {
  price?: number;
};

export type DeployOptions = {
  gasPrice?: number;
};

export function getDeployOptions(taskArgs): DeployOptions {
  let deployOptions: DeployOptions = {};
  if (taskArgs.price) {
    deployOptions.gasPrice = taskArgs.price * 1000000000;
  }

  return deployOptions;
}
