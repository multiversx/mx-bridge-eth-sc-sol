import { exec } from 'child_process';

const runHardhatTests = () => {
  exec('npx hardhat test', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
};

runHardhatTests();
