//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

enum DepositStatus {
    None,
    Pending,
    InProgress, //This is not used. It is here to have 1on1 mapping with statuses of deposits on the smartcontracts from Elrond
    Executed,
    Rejected
}

enum BatchStatus {
    None,
    Pending,
    Executed
}

struct Deposit {
    uint256 nonce;
    address tokenAddress;
    uint256 amount;
    address depositor;
    bytes recipient;
    DepositStatus status;
}

struct CrossTransferStatus {
    DepositStatus[] statuses;
    uint256 createdBlockNumber;
}

struct Batch {
    uint256 nonce;
    uint256 timestamp;
    uint256 lastUpdatedBlockNumber;
    Deposit[] deposits;
    BatchStatus status;
}

struct RefundItem {
    address tokenAddress;
    uint256 value;
    uint256 lastUpdatedBlockNumber;
}
