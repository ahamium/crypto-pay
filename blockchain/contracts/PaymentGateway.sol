// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPaymentGateway} from "./IPaymentGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Minimal on-chain payment gateway (ETH + ERC20)
/// @notice MVP: emits events for off-chain reconciliation; funds are withdrawable by owner.
contract PaymentGateway is IPaymentGateway, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // avoid double-spend per order (optional)
    mapping(bytes32 => bool) public orderPaid;

    // address(0) == native
    mapping(address => bool) public allowedTokens;
    address public feeRecipient;

    /// extended event (오프체인 매칭 편의를 위해 invoiceIdHash 포함)
    event PaymentReceivedV2(
        address indexed payer,
        uint256 indexed orderId,
        address indexed token,
        uint256 amount,
        bytes32 invoiceIdHash,
        string  invoiceId
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        feeRecipient = address(this);
        allowedTokens[address(0)] = true;
    }

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
    }

    function setFeeRecipient(address to) external onlyOwner {
        feeRecipient = to;
    }

    // ✅ 외부 엔트리포인트 1: 통합 pay (public override, memory)
    function pay(
        address token,
        uint256 amount,
        uint256 orderId,
        string memory invoiceId
    )
        public
        payable
        override
        whenNotPaused
        nonReentrant
    {
        _payCore(token, amount, orderId, invoiceId);
    }

    // ✅ 외부 엔트리포인트 2: ETH
    function payETH(uint256 orderId)
        external
        payable
        override
        whenNotPaused
        nonReentrant
    {
        // 내부 직접호출 대신 코어 호출 (nonReentrant 중첩 피함)
        _payCore(address(0), msg.value, orderId, "");
    }

    // ✅ 외부 엔트리포인트 3: ERC20
    function payERC20(address token, uint256 amount, uint256 orderId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        require(token != address(0), "token=0");
        _payCore(token, amount, orderId, "");
    }

    // ✅ 내부 공통 로직: calldata 대신 memory
    function _payCore(
        address token,
        uint256 amount,
        uint256 orderId,
        string memory invoiceId
    ) internal {
        require(allowedTokens[token], "token not allowed");
        require(amount > 0, "amount=0");

        bytes32 k = keccak256(abi.encodePacked(orderId, token));
        require(!orderPaid[k], "already paid");
        orderPaid[k] = true;

        if (token == address(0)) {
            require(msg.value == amount, "bad value");
            // (bool ok, ) = feeRecipient.call{value: amount}("");
            // require(ok, "native transfer fail");
        } else {
            IERC20(token).safeTransferFrom(msg.sender, feeRecipient, amount);
        }

        emit PaymentReceived(msg.sender, orderId, token, amount);
        emit PaymentReceivedV2(
            msg.sender,
            orderId,
            token,
            amount,
            keccak256(bytes(invoiceId)),
            invoiceId
        );
    }

    function withdrawETH(address payable to, uint256 amount) external override onlyOwner nonReentrant {
        require(address(this).balance >= amount, "insufficient");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth transfer fail");
    }

    function withdrawERC20(address token, address to, uint256 amount) external override onlyOwner nonReentrant {
        IERC20(token).safeTransfer(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _checkAndMark(uint256 orderId, address token, address payer, uint256 amount) internal {
        // unique key per (orderId, token)
        bytes32 k = keccak256(abi.encodePacked(orderId, token));
        require(!orderPaid[k], "already paid");
        orderPaid[k] = true;

        // NOTE: for MVP we only emit events; real systems could store minimal receipt data too.
        // payer/amount are used by event, not persisted in storage here.
        (payer, amount); // hush solidity warnings (no-op)
    }

    receive() external payable { revert("use pay/payETH"); }
}
