import { artifacts, waffle } from "hardhat";

export async function deploySafe(deployer) {
  const safeArtifact = await artifacts.readArtifact("ERC20Safe");
  return await waffle.deployContract(deployer, safeArtifact);
}
