// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Simple ERC20 token for testing purposes
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {}

    /**
     * @dev Mint tokens to an address (for testing)
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

