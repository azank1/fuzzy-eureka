// scripts/deploy.js
import { ethers } from "hardhat";

async function main() {
  const PoL = await ethers.getContractFactory("ProofOfLearning");
  const pol = await PoL.deploy();
  await pol.deployed();
  console.log("ProofOfLearning deployed to:", pol.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
