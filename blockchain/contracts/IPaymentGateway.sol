// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PaymentGateway interface (MVP)
interface IPaymentGateway {
    /// @notice Emitted when a payment is made (ETH or ERC20)
    /// @param payer    who paid
    /// @param orderId  off-chain order identifier
    /// @param token    address(0) for ETH, else ERC20 token address
    /// @param amount   amount paid (wei or token decimals)
    event PaymentReceived(address indexed payer, uint256 indexed orderId, address indexed token, uint256 amount);

    function payETH(uint256 orderId) external payable;

    /// @dev requires prior approval to this contract
    function payERC20(address token, uint256 amount, uint256 orderId) external;

    function withdrawETH(address payable to, uint256 amount) external;

    function withdrawERC20(address token, address to, uint256 amount) external;

    /// @notice unified entry point (ETH: token=0x0, msg.value=amount)
    function pay(address token, uint256 amount, uint256 orderId, string calldata invoiceId) external payable;

    /// @notice token allowlist
    function setAllowedToken(address token, bool allowed) external;
    function setFeeRecipient(address to) external;
    function allowedTokens(address token) external view returns (bool);
    function feeRecipient() external view returns (address);
}
