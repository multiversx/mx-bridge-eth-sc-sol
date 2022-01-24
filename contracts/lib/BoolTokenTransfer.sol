// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library BoolTokenTransfer {
    function boolTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal returns (bool) {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );

        if (!success) {
            return false;
        }

        // This condition handles the case where some ERC20 contracts return nothing (either the transfer goes through, or they revert)
        if (returndata.length == 0) {
            return true;
        }

        return abi.decode(returndata, (bool));
    }
}
