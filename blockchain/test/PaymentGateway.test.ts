import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre as any

describe("PaymentGateway", () => {
  it("pays with ETH and emits event", async () => {
    const [owner, user] = await ethers.getSigners();

    const Gateway = await ethers.getContractFactory("PaymentGateway");
    const g = await Gateway.deploy(await owner.getAddress());
    await g.waitForDeployment();

    const orderId = 1;
    await expect(g.connect(user).payETH(orderId, { value: ethers.parseEther("0.1") }))
      .to.emit(g, "PaymentReceived")
      .withArgs(await user.getAddress(), orderId, ethers.ZeroAddress, ethers.parseEther("0.1"));

    const bal = await ethers.provider.getBalance(await g.getAddress());
    expect(bal).to.equal(ethers.parseEther("0.1"));
  });

  it("pays with ERC20 and withdraws by owner", async () => {
    const [owner, user, recipient] = await ethers.getSigners();

    const TT = await ethers.getContractFactory("TestToken");
    const token = await TT.deploy();
    await token.waitForDeployment();

    const Gateway = await ethers.getContractFactory("PaymentGateway");
    const g = await Gateway.deploy(await owner.getAddress());
    await g.waitForDeployment();

    // user approves and pays
    await token.transfer(await user.getAddress(), ethers.parseEther("100"));
    await token.connect(user).approve(await g.getAddress(), ethers.parseEther("5"));

    const orderId = 42;
    await expect(g.connect(user).payERC20(await token.getAddress(), ethers.parseEther("5"), orderId))
      .to.emit(g, "PaymentReceived");

    // owner withdraws ERC20
    await g.connect(owner).withdrawERC20(await token.getAddress(), await recipient.getAddress(), ethers.parseEther("3"));
    expect(await token.balanceOf(await recipient.getAddress())).to.equal(ethers.parseEther("3"));
  });

  it("reverts on double pay for same (orderId, token)", async () => {
    const [owner, user] = await ethers.getSigners();
    const Gateway = await ethers.getContractFactory("PaymentGateway");
    const g = await Gateway.deploy(await owner.getAddress());
    await g.waitForDeployment();

    await g.connect(user).payETH(7, { value: 1n });
    await expect(g.connect(user).payETH(7, { value: 1n })).to.be.revertedWith("already paid");
  });
});
