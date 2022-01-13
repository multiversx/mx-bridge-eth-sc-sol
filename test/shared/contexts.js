import { ethers, waffle } from "hardhat";

const { createFixtureLoader } = waffle;

export function baseContext(description, hooks) {
  describe(description, function () {
    before(async function () {
      this.contracts = {};
      this.mocks = {};
      this.signers = {};

      const signers = await ethers.getSigners();
      this.signers.admin = signers[0];
      this.signers.alice = signers[1];
      this.signers.bob = signers[2];
      this.signers.raider = signers[3];

      // Get rid of this when https://github.com/nomiclabs/hardhat/issues/849 gets fixed.
      this.loadFixture = createFixtureLoader(signers);
    });

    hooks();
  });
}
