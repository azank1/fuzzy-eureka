import random
import hashlib
import json
from eth_utils import to_bytes, keccak

class ModelCheckpoint:
    def __init__(self):
        self.weights_before = [random.uniform(-1, 1) for _ in range(10)]
        self.weights_after = [w + random.uniform(-0.05, 0.05) for w in self.weights_before]
        self.accuracy_before = random.uniform(0.5, 0.8)
        self.accuracy_after = self.accuracy_before + random.uniform(0.01, 0.05)

    def generate_checkpoint_hash(self):
        """Creates a cryptographic hash and converts it to bytes32."""
        checkpoint_data = {
            "weights_after": self.weights_after,
            "accuracy_after": self.accuracy_after
        }
        checkpoint_json = json.dumps(checkpoint_data, sort_keys=True)
        # Generate a keccak256 hash 
        hash_bytes = keccak(text=checkpoint_json)  
        return hash_bytes.hex() # Convert to hex

    def generate_proof(self):
        """Simulate ZK Proof (Simplified: just returns a valid proof flag)."""
        proof_valid = self.accuracy_after > self.accuracy_before
        return {
            "proof_valid": proof_valid,
            "checkpoint_hash": self.generate_checkpoint_hash(),  
            "accuracy_before": self.accuracy_before,
            "accuracy_after": self.accuracy_after
        }

# Generate a fake checkpoint and proof
node_checkpoint = ModelCheckpoint()
zk_proof = node_checkpoint.generate_proof()

# Print checkpoint data
print("\n **Generated Checkpoint Data:**")
print(f"Accuracy Before Training: {zk_proof['accuracy_before']:.4f}")
print(f"Accuracy After Training:  {zk_proof['accuracy_after']:.4f}")
print(f"Checkpoint Hash (Hex):    0x{zk_proof['checkpoint_hash']}")  # Keccak256 (bytes32)
print(f"Proof Valid:              {zk_proof['proof_valid']}")
