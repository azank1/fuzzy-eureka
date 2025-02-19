// scripts/interact.js
import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  // Retrieve accounts (first is validator, second is node)
  const [validator, node] = await ethers.getSigners();
  console.log("Validator Address:", validator.address);
  console.log("Node Address:", node.address);

  // Replace with your deployed contract address (from deploy.js)
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // update as necessary
  const PoL = await ethers.getContractFactory("ProofOfLearning");
  const pol = await PoL.attach(contractAddress);

  console.log("PoL Contract attached at:", pol.target);

  // Check and fund the reward pool if needed
  let rewardPool = await ethers.provider.getBalance(pol.target);
  console.log("Current Contract Reward Pool:", ethers.formatEther(rewardPool), "ETH");

  if (rewardPool < ethers.parseEther("1")) {  // Ensure at least 1 ETH is in the pool
    console.log("Funding contract with 10 ETH...");
    const tx = await validator.sendTransaction({
      to: pol.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    console.log("Contract funded successfully.");
  }

  // Node submits a checkpoint
  console.log("Node submitting a checkpoint...");
  const checkpointHash = ethers.keccak256(ethers.toUtf8Bytes("Example Checkpoint Data"));
  const checkpointTx = await pol.connect(node).submitCheckpoint(checkpointHash, 75);
  await checkpointTx.wait();
  console.log("Checkpoint submitted.");

  // Fetch the latest checkpoint ID
  console.log("Fetching latest checkpoint ID...");
  const latestCheckpointId = await pol.latestCheckpointId();
  console.log("Latest Checkpoint ID:", latestCheckpointId.toString());

  // Validator approves the checkpoint
  console.log("Validator approving the checkpoint...");
  const approveTx = await pol.connect(validator).approveCheckpoint(latestCheckpointId, true);
  await approveTx.wait();
  console.log("Checkpoint approved.");

  // Node claims the reward
  console.log("Node claiming reward...");
  try {
    const claimTx = await pol.connect(node).claimReward(latestCheckpointId);
    await claimTx.wait();
    console.log("Reward claimed successfully.");
  } catch (error) {
    console.error("❌ Error claiming reward:", error);
  }

  // Verify final balances
  const nodeBalance = await pol.balances(node.address);
  console.log("Node Balance:", ethers.formatEther(nodeBalance), "ETH");

  rewardPool = await ethers.provider.getBalance(pol.target);
  console.log("Updated Contract Reward Pool:", ethers.formatEther(rewardPool), "ETH");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
