// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title Forwarder
 * @dev Trusted Forwarder for gasless transactions (meta-transactions)
 * 
 * Enables users to submit transactions without holding native gas tokens.
 * A relayer pays the gas and the user's signature proves authorization.
 * 
 * Flow:
 * 1. User signs a ForwardRequest off-chain
 * 2. Relayer submits the request on-chain, paying gas
 * 3. Target contract receives call with original user as _msgSender()
 * 
 * Compatible with ERC-2771 standard.
 */
contract Forwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("AgentHub Forwarder") {}
}
