# Sample Hardhat Project

PoL basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.


**Clone the repository:**

```shell
npm install
npm install --legacy-peer-deps
```
Configure Environment:

If you are using environment variables (e.g., for testnet deployment), create a .env file in the project root and add your configuration.

Compile the Contract
```shell
npx hardhat compile
```
outputs artifacts into the artifacts/ and cache/ directories

Deploy the Contract
To deploy the PoL contract on the Hardhat Network

```shell
npx hardhat run scripts/deploy.js --network localhost
```

Interact with Contract
```
npx hardhat run scripts/interact.js --network localhost
```
Check and fund the contract’s reward pool if needed.
Submit a checkpoint from a node.
Approve the checkpoint by a validator.
Claim the reward for the checkpoint.
Output relevant balances and statuses. 

Some dependencies (such as the ws package used by @ethersproject/providers) may show vulnerability warnings (e.g., DoS attacks on handling HTTP headers). You can address these by
``` shell
npm audit fix
```
Console:
```terminal
Validator Address: 0xAbC... (deployer address)
Node Address: 0xDeF... (node address)
PoL Contract attached at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Current Contract Reward Pool: 0.0 ETH
Funding contract with 10 ETH...
Contract funded successfully.
Node submitting a checkpoint...
Checkpoint submitted.
Fetching latest checkpoint ID...
Latest Checkpoint ID: 1
Validator approving the checkpoint...
Checkpoint approved.
Node claiming reward...
Reward claimed successfully.
Node Balance: 0.000075 ETH
Updated Contract Reward Pool: 9.999925 ETH

```

---

Feel free to adjust any section as needed for your specific project details or additional notes regarding your setup and any fixes applied for legacy issues.

