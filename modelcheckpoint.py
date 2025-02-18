import hashlib
import numpy as np

def generate_fake_model():
    """Generate a fake AI model checkpoint with random weights."""
    return np.random.rand(100)

def hash_model(weights):
    """Generate a cryptographic hash of the model state."""
    model_string = ",".join(map(str, weights))  # weights to a string
    return hashlib.sha256(model_string.encode()).hexdigest()

# Simulating training
model_before = generate_fake_model()
hash_before = hash_model(model_before)

# Fake "training" - improving weights
model_after = model_before * 0.99  
hash_after = hash_model(model_after)

print(f"Checkpoint Before Training: {hash_before}")
print(f"Checkpoint After Training: {hash_after}")
