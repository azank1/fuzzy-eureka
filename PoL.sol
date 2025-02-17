// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

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

    address public validator;
    uint256 public rewardPool;
    mapping(address => uint256) public balances;

    event CheckpointSubmitted(
        uint256 indexed checkpointId,
        address indexed submitter,
        bytes32 checkpointHash,
        uint256 accuracy
    );

    event CheckpointApproved(
        uint256 indexed checkpointId,
        address indexed validator,
        bool approved
    );

    event RewardClaimed(
        uint256 indexed checkpointId,
        address indexed submitter,
        uint256 amount
    );

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
    require(!cp.isRewarded, "Already rewarded");

    uint256 rewardAmount = cp.accuracy * 1e16;  // Instead of a fixed amount
    require(rewardPool >= rewardAmount, "Insufficient pool");

    cp.isRewarded = true;
    rewardPool -= rewardAmount;
    balances[msg.sender] += rewardAmount;
}


    function withdrawBalance(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        // Transfer tokens logic here
    }

    function addToRewardPool(uint256 _amount) external {
        // Transfer tokens from caller to contract logic here
        rewardPool += _amount;
    }
}
