// contracts/ProofOfLearning.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract ProofOfLearning {
    uint256 public latestCheckpointId;
    mapping(uint256 => Checkpoint) public checkpoints;
    mapping(address => uint256) public balances;

    struct Checkpoint {
        address submitter;
        bytes32 checkpointHash;
        uint256 someData;
        bool approved;
        bool rewardClaimed;
    }

    event CheckpointSubmitted(
        uint256 checkpointId,
        address indexed submitter,
        bytes32 checkpointHash,
        uint256 someData
    );
    event CheckpointApproved(uint256 checkpointId, bool approved);
    event RewardClaimed(uint256 checkpointId, address indexed submitter, uint256 reward);

    /// @notice Submits a new checkpoint.
    /// @param _checkpointHash The hash representing the checkpoint data.
    /// @param _someData Additional data (e.g., a score).
    /// @return The new checkpoint ID.
    function submitCheckpoint(bytes32 _checkpointHash, uint256 _someData) external returns (uint256) {
        latestCheckpointId++;
        checkpoints[latestCheckpointId] = Checkpoint({
            submitter: msg.sender,
            checkpointHash: _checkpointHash,
            someData: _someData,
            approved: false,
            rewardClaimed: false
        });
        emit CheckpointSubmitted(latestCheckpointId, msg.sender, _checkpointHash, _someData);
        return latestCheckpointId;
    }

    /// @notice Approves (or disapproves) a submitted checkpoint.
    /// @param _checkpointId The checkpoint identifier.
    /// @param _approved Whether the checkpoint is approved.
    function approveCheckpoint(uint256 _checkpointId, bool _approved) external {
        Checkpoint storage cp = checkpoints[_checkpointId];
        require(cp.submitter != address(0), "Checkpoint does not exist");
        cp.approved = _approved;
        emit CheckpointApproved(_checkpointId, _approved);
    }

    /// @notice Claims the reward for an approved checkpoint.
    /// @param _checkpointId The checkpoint identifier.
    function claimReward(uint256 _checkpointId) external {
        Checkpoint storage cp = checkpoints[_checkpointId];
        require(cp.submitter == msg.sender, "Not the submitter");
        require(cp.approved, "Checkpoint not approved");
        require(!cp.rewardClaimed, "Reward already claimed");

        uint256 reward = 1 ether; // Each approved checkpoint rewards 1 ETH.
        require(address(this).balance >= reward, "Not enough funds in the reward pool");

        cp.rewardClaimed = true;
        balances[msg.sender] += reward;
        payable(msg.sender).transfer(reward);
        emit RewardClaimed(_checkpointId, msg.sender, reward);
    }

    /// @notice Function to receive ETH.
    receive() external payable {}
}
