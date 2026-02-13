import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('AGNTToken', function () {
  async function deployTokenFixture() {
    const [owner, minter, user1, user2] = await ethers.getSigners();

    const AGNTToken = await ethers.getContractFactory('AGNTToken');
    const token = await AGNTToken.deploy(owner.address);

    return { token, owner, minter, user1, user2 };
  }

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal('Agent Hub Token');
      expect(await token.symbol()).to.equal('AGNT');
    });

    it('Should mint initial supply to owner', async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const initialSupply = ethers.parseEther('400000000'); // 400M
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it('Should set max supply correctly', async function () {
      const { token } = await loadFixture(deployTokenFixture);
      const maxSupply = ethers.parseEther('1000000000'); // 1B
      expect(await token.MAX_SUPPLY()).to.equal(maxSupply);
    });

    it('Should set owner correctly', async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint', async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther('1000');
      
      await token.connect(owner).mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it('Should allow authorized minter to mint', async function () {
      const { token, owner, minter, user1 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther('1000');
      
      await token.connect(owner).addMinter(minter.address);
      await token.connect(minter).mint(user1.address, amount);
      
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it('Should reject minting by non-authorized address', async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther('1000');
      
      await expect(
        token.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWith('Not authorized to mint');
    });

    it('Should reject minting beyond max supply', async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      // Try to mint more than remaining supply (600M remaining)
      const amount = ethers.parseEther('700000000');
      
      await expect(
        token.connect(owner).mint(user1.address, amount)
      ).to.be.revertedWith('Exceeds max supply');
    });
  });

  describe('Minter Management', function () {
    it('Should add minter correctly', async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      
      expect(await token.minters(minter.address)).to.be.false;
      await token.connect(owner).addMinter(minter.address);
      expect(await token.minters(minter.address)).to.be.true;
    });

    it('Should remove minter correctly', async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).addMinter(minter.address);
      await token.connect(owner).removeMinter(minter.address);
      expect(await token.minters(minter.address)).to.be.false;
    });

    it('Should emit MinterAdded event', async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(owner).addMinter(minter.address))
        .to.emit(token, 'MinterAdded')
        .withArgs(minter.address);
    });

    it('Should emit MinterRemoved event', async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).addMinter(minter.address);
      await expect(token.connect(owner).removeMinter(minter.address))
        .to.emit(token, 'MinterRemoved')
        .withArgs(minter.address);
    });

    it('Should reject minter management by non-owner', async function () {
      const { token, user1, minter } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.connect(user1).addMinter(minter.address)
      ).to.be.reverted;
    });
  });

  describe('Burning', function () {
    it('Should allow users to burn their tokens', async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const burnAmount = ethers.parseEther('1000');
      const initialBalance = await token.balanceOf(owner.address);
      
      await token.connect(owner).burn(burnAmount);
      
      expect(await token.balanceOf(owner.address)).to.equal(
        initialBalance - burnAmount
      );
    });
  });

  describe('ERC20 Standard', function () {
    it('Should transfer tokens correctly', async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther('100');
      
      await token.connect(owner).transfer(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it('Should approve and transferFrom correctly', async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther('100');
      
      await token.connect(owner).approve(user1.address, amount);
      await token.connect(user1).transferFrom(owner.address, user2.address, amount);
      
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });
  });
});
