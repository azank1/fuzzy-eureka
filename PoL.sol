// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProofOfLearning {
    struct Checkpoint {
        address submitter;
        bytes32 checkpointHash;
        uint256 accuracy;
        bool isApproved;
        bool isRewarded;
    }

    uint256 public latestCheckpointId;
    mapping(uint256 => Checkpoint) public checkpoints;
    mapping(address => uint256) public balances;

    address public validator;
    uint256 public rewardPool;

    event CheckpointSubmitted(uint256 indexed checkpointId, address indexed submitter, bytes32 checkpointHash, uint256 accuracy);
    event CheckpointApproved(uint256 indexed checkpointId, address indexed validator, bool approved);
    event RewardClaimed(uint256 indexed checkpointId, address indexed submitter, uint256 amount);

    constructor(address _validator, uint256 _initialRewardPool) {
        validator = _validator;
        rewardPool = _initialRewardPool;
    }

    function submitCheckpoint(bytes32 _checkpointHash, uint256 _accuracy) external returns (uint256) {
        latestCheckpointId++;
        checkpoints[latestCheckpointId] = Checkpoint({
            submitter: msg.sender,
            checkpointHash: _checkpointHash,
            accuracy: _accuracy,
            isApproved: false,
            isRewarded: false
        });

        emit CheckpointSubmitted(latestCheckpointId, msg.sender, _checkpointHash, _accuracy);
        return latestCheckpointId;
    }

    function approveCheckpoint(uint256 _checkpointId, bool _approve) external {
        require(msg.sender == validator, "Not authorized");
        Checkpoint storage cp = checkpoints[_checkpointId];
        require(!cp.isApproved, "Already processed");
        cp.isApproved = _approve;

        emit CheckpointApproved(_checkpointId, msg.sender, _approve);
    }

    function claimReward(uint256 _checkpointId) external {
        Checkpoint storage cp = checkpoints[_checkpointId];
        require(cp.isApproved, "Not approved");
        require(cp.submitter == msg.sender, "Not submitter");
        require(!cp.isRewarded, "Rewarded");
        
        uint256 rewardAmount = cp.accuracy * 1e16;
        require(rewardPool >= rewardAmount, "Insufficient pool");
        
        cp.isRewarded = true;
        rewardPool -= rewardAmount;
        balances[msg.sender] += rewardAmount;

        emit RewardClaimed(_checkpointId, msg.sender, rewardAmount);
    }
}
