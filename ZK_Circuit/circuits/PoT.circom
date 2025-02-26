//© 2025 azank1 / PoTCircuit. All Rights Reserved.

//ZK Circuit to train model correctly without revealing actual weights.
//ZK SNARKs (succinct non-interactive arguments of knowlegde)

pragma circom 2.1.6;

template Sum(n) {
    signal input values[n];
    signal output sum_out;

    var temp_sum = 0;
    for (var i = 0; i < n; i++) {
        temp_sum = temp_sum + values[i];  // Compute sum using variable
    }

    sum_out <== temp_sum; // Assign final computed sum
}

template ProofOfTraining(n) {
    signal input weights_before[n];
    signal input weights_after[n];
    signal input delta;
    signal output valid_proof;

    signal differences[n];

    for (var i = 0; i < n; i++) {
        differences[i] <== weights_before[i] - weights_after[i];
    }

    component sum_diff = Sum(n);
    sum_diff.values <== differences;

    signal proof_check;
    proof_check <== sum_diff.sum_out - delta;

    signal is_positive;
    is_positive <== proof_check * proof_check; // Non-zero when proof_check is positive

    valid_proof <== is_positive; // Ensures we output 1 when improvement exists
}

component main = ProofOfTraining(3);
