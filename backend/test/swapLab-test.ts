import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { hexlify } from "ethers/lib/utils";
import { ethers } from "hardhat";
import Web3 from "web3";

const DEPOSIT = Web3.utils.toHex("3000000000000000000000");
const SWAPFEE = Web3.utils.toHex("100000000000000000");
const RATE = Web3.utils.toHex("100000000000000000");
const AMOUNT_TO_SWAP = Web3.utils.toHex("3000000000000000000000");

describe("SwapLab Test", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractsFixture() {
   
    const [owner, acc1, acc2] = await ethers.getSigners();
    const SwapLab = await ethers.getContractFactory("SwapLab");
    const TestToken = await ethers.getContractFactory("TestToken");
    const TestToken2 = await ethers.getContractFactory("TestToken2");
    const Membership = await ethers.getContractFactory("Membership");
    
    const testToken = await TestToken.deploy();
    await testToken.deployed();

    const testToken2 = await TestToken2.deploy();
    await testToken2.deployed();

    const membership = await Membership.deploy();
    await membership.deployed();

    const swapLab = await SwapLab.deploy(testToken.address, testToken2.address);
    await swapLab.deployed();

    const mintMembershipNFT = async(who:SignerWithAddress) => {
      return await membership.connect(who).mint({value: SWAPFEE});
    }
    
    const claimDrop = async() => {
      await testToken.connect(acc1).selfClaimDrop();
      await testToken.connect(acc2).selfClaimDrop();
      await testToken2.connect(acc1).selfClaimDrop();
      await testToken2.connect(acc2).selfClaimDrop();
    }

    const addLiquidityAndTest = async(from:SignerWithAddress, value: BigNumberish) => {
      expect(await isMember(from.address)).to.be.equal(true);
      await swapLab.connect(from).addLiquidity({value: value});
      const balAfterAddLiquidity = await getBalance(swapLab.address);
      const data = await getdata(from);
      expect(balAfterAddLiquidity).to.equal(value.toString());
      expect(data._provider.amount._hex).to.equal(value.toString());
      expect(data._totalLiquidity._hex).to.equal(value.toString());
      expect(data._totalProvider._hex).to.equal(hexlify(1));
    }

    const removeLiquidityAndTest = async(from:SignerWithAddress, value: BigNumberish) => {
      expect(await isMember(from.address)).to.be.equal(true);
      await addLiquidityAndTest(from, value);
      const balContractAfterAddLiquidity = await getBalance(swapLab.address);
      const balFromAfterAddLiquidity = await getBalance(from.address);
      await swapLab.connect(from).removeLiquidity();

      const balContractAfterRemoveLiquidity = await getBalance(swapLab.address);
      const balFromAfterRemoveLiquidity = await getBalance(from.address);
      const data = await getdata(from);
      expect(balContractAfterRemoveLiquidity).to.be.lessThan(balContractAfterAddLiquidity);
      expect(balFromAfterRemoveLiquidity).to.be.greaterThan(balFromAfterAddLiquidity);
      expect(data._provider.amount._hex).to.equal(hexlify(0));
      expect(data._totalLiquidity._hex).to.equal(hexlify(0));
      expect(data._totalProvider._hex).to.equal(hexlify(0));
    }

    const splitFee = async(from:SignerWithAddress) => {
      return await swapLab.connect(from).splitFee();
    }

    const getdata = async(from: SignerWithAddress) => {
      return await swapLab.connect(from).getData();
    }

    const getBalance = async(who:string) => {
      return await (await ethers.getSigner(who)).getBalance()
    }

    const swapAndTest = async(from: SignerWithAddress, provider: SignerWithAddress) => {
      await balanceOf(from.address).then(async(intiBal) => {
        await addLiquidityAndTest(provider, DEPOSIT);

        await claimDrop().then(async() => {
          await balanceOf(from.address).then(async(retVal) => {
            expect(retVal).to.be.gt(intiBal);
            await testToken.connect(acc1).approve(swapLab.address, AMOUNT_TO_SWAP).then(async(x: any) => {
              if(x) {
                await swapLab.connect(acc1).swapERC20ForCelo(testToken.address, {value: SWAPFEE});
                const newBal = await balanceOf(acc1.address);
                const newContractBal = await (await ethers.getSigner(swapLab.address)).getBalance();
                expect(newBal.toString()).to.be.equal('2000000000000000000000'); 
              }
            })
          })
        })
      })
    }

    const swapERC20AndTest = async(tokenOwner: SignerWithAddress, swapper: SignerWithAddress) => {
      const AMOUNT_TO_SWAP_IN_TOKEN = Web3.utils.toHex("1000000000000000000000");
      
      await balanceOf(tokenOwner.address).then(async(intiBal) => {
        await swapLab.connect(owner).setPair([testToken2.address, testToken.address], [RATE, RATE], tokenOwner.address);
        await claimDrop().then(async() => {
          await balanceOf(tokenOwner.address).then(async(retVal) => {
            expect(retVal).to.be.gt(intiBal);
            const AMOUNT = AMOUNT_TO_SWAP;
            const bal_swapper_b4 = await balanceOf(swapper.address);
            const init_testBal_tokenOwner = await balanceOf(tokenOwner.address);
            const test2bal_tokenOwner_b4 = await testToken2.balanceOf(tokenOwner.address);
            const test2bal_swapper_b4 = await testToken2.balanceOf(swapper.address);
            await testToken2.connect(tokenOwner).approve(swapLab.address, AMOUNT).then(async() => {
              await testToken.connect(swapper).approve(swapLab.address, AMOUNT_TO_SWAP_IN_TOKEN).then(async() => {
                await swapLab.connect(swapper).swapERC20ToERC20(testToken.address, {value: SWAPFEE});
                const newBal_swapper = await balanceOf(swapper.address);
                const test2Bal_tokenOwner_after = await testToken2.balanceOf(tokenOwner.address);
                const testBal_tokenOwner_after = await balanceOf(tokenOwner.address);
                const test2bal_swapper_after = await testToken2.balanceOf(swapper.address);

                // console.log(`
                //   Test1 init bal swapper b4: ${bal_swapper_b4.toString()}\n
                //   Test1 bal swapper after: ${newBal_swapper.toString()}\n
                //   Test1 init bal tokenOwner b4: ${init_testBal_tokenOwner.toString()}\n
                //   Test1 bal tokenOwner after: ${testBal_tokenOwner_after.toString()}\n
                //   Test2 init bal swapper b4: ${test2bal_swapper_b4.toString()}\n
                //   Test2 bal swapper after: ${test2bal_swapper_after.toString()}\n
                //   Test2 init bal tokenOwner b4: ${test2bal_tokenOwner_b4.toString()}\n
                //   Test2 bal tokenOwner after: ${test2Bal_tokenOwner_after.toString()}\n
                // `)
                expect(bal_swapper_b4.gt(newBal_swapper)).to.be.true; 
                expect(test2bal_tokenOwner_b4.gt(test2Bal_tokenOwner_after)).to.be.true; 
                expect(testBal_tokenOwner_after.gt(init_testBal_tokenOwner)).to.be.true; 
                expect(test2bal_swapper_after.gt(test2bal_swapper_b4)).to.be.true; 
              })
            })
          })
        })
      })
    }

    const isMember = async(who: string) => { 
      const bal = await membership.balanceOf(who);
      return bal.toString() === '1'
    }
    const balanceOf = async(who: string) => { return await testToken.balanceOf(who); }

    return { 
      acc1, 
      acc2,
      owner,
      getdata,
      swapLab, 
      splitFee,
      claimDrop, 
      balanceOf, 
      testToken,
      testToken2,
      getBalance,
      swapAndTest,
      swapERC20AndTest,
      mintMembershipNFT,
      addLiquidityAndTest,
      removeLiquidityAndTest,
    };
  }

  describe("Deployment", function () {
    it("Should set Metadata correctly", async function () {
      const { testToken } = await loadFixture(deployContractsFixture);
      const totalSupply = Web3.utils.toHex("5000000000000000000000");
      expect((await testToken.name())).to.equal("CELOG Token");
      expect((await testToken.symbol())).to.equal("CELOG");
      expect((await testToken.decimals())).to.equal(18);
      expect(Web3.utils.toHex((await testToken.totalSupply()).toString())).eq(Web3.utils.toHex(totalSupply));
    });

    it("Should set Metadata for token2 correctly", async function () {
      const { testToken2 } = await loadFixture(deployContractsFixture);
      const totalSupply = Web3.utils.toHex("5000000000000000000000");
      expect((await testToken2.name())).to.equal("CELOT Token");
      expect((await testToken2.symbol())).to.equal("CELT");
      expect((await testToken2.decimals())).to.equal(18);
      expect(Web3.utils.toHex((await testToken2.totalSupply()).toString())).eq(Web3.utils.toHex(totalSupply));
    });

    it("Should add liquidity successFully", async function () {
      const { acc1, addLiquidityAndTest, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);  
      await addLiquidityAndTest(acc1, DEPOSIT);
    });

    it("Should remove liquidity successFully", async function () {
      const { acc1, removeLiquidityAndTest, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);
      await removeLiquidityAndTest(acc1, DEPOSIT);
    });

    it("Should swapToken for Celo successFully", async function () {
      const { acc1, swapAndTest, acc2, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);
      await mintMembershipNFT(acc2);
      await swapAndTest(acc1, acc2);
    });

    it("Should swapToken for Token successFully", async function () {
      const { acc1, swapERC20AndTest, acc2, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);
      await mintMembershipNFT(acc2);
      await swapERC20AndTest(acc1, acc2);
    });

    it("Should split successFully", async function () {
      const { acc1, acc2, swapAndTest, swapLab, getBalance, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);
      await mintMembershipNFT(acc2);
      const intiBalAcc2B4Split = await getBalance(acc2.address);
      const intiBalContractB4Split = await getBalance(swapLab.address);
      await swapAndTest(acc1, acc2);
      await swapLab.connect(acc2).splitFee();
      const balAcc2AfterSplit = await getBalance(acc2.address);
      const balContractAfterSplit = await getBalance(swapLab.address);
      // console.log(`
      // balAcc2AfterSplit: ${balAcc2AfterSplit.toString()}\n
      // intiBalAcc2B4Split: ${intiBalAcc2B4Split.toString()}\n
      // `)
      expect(balContractAfterSplit.gt(intiBalContractB4Split)).to.be.true;
      expect(balAcc2AfterSplit.lt(intiBalAcc2B4Split)).to.be.true;
    });

    it("Should revert if not provider trying to split", async function () {
      const { acc1, acc2, owner, swapAndTest, mintMembershipNFT, swapLab } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc1);
      await mintMembershipNFT(acc2);
      await mintMembershipNFT(owner);
      await swapAndTest(acc1, owner);
      expect(swapLab.connect(acc2).splitFee()).to.revertedWith("Not a provider");
    });

    it("Should revert if no fee is generated", async function () {
      const { acc2, addLiquidityAndTest, swapLab, mintMembershipNFT } = await loadFixture(deployContractsFixture);
      await mintMembershipNFT(acc2);
      await addLiquidityAndTest(acc2, DEPOSIT);
      expect(swapLab.connect(acc2).splitFee()).to.revertedWith("Fee cannot be split at this time");
    });

  });
});
