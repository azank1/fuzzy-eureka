
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";  // Replace with your actual deployed contract address
const code = await ethers.provider.getCode(contractAddress);
console.log("Contract Code at Address:", code);
