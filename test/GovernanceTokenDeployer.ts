import {config, ethers} from "hardhat";
import {expect} from "chai";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {formatEther, parseEther} from "ethers/lib/utils";
import {utils} from "ethers";

describe("GovernanceTokenDeployer", function () {

    async function testFixture() {
        // get an account
        const accounts = config.networks.hardhat.accounts
        const index = 0;
        //@ts-ignore
        let wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${index}`)
        console.log("wallet address: ", wallet.address)
        console.log("wallet public key: ", wallet.publicKey)
        wallet = wallet.connect(ethers.provider)

        // get the governance token factory
        const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
        // craft a transaction to deploy the governance token
        const unsignedTx = GovernanceTokenFactory.getDeployTransaction({gasPrice: 900000000, gasLimit: 1_000_000})
        const signedTx = await wallet.signTransaction(unsignedTx)

        // get a dedicated provider in order to use ethersjs v6 ?
        return {wallet, unsignedTx, signedTx, GovernanceTokenFactory}
    }

    function getRawTransaction(tx: any, sig : any = undefined) {
        function addKey(accum: any, key: any) {
            if (tx[key]) { accum[key] = tx[key]; }
            return accum;
        }

        // Extract the relevant parts of the transaction and signature
        const txFields = "accessList chainId data gasPrice gasLimit maxFeePerGas maxPriorityFeePerGas nonce to type value".split(" ");
        const sigFields = "v r s".split(" ");

        if (sig == undefined) sig = sigFields.reduce(addKey, { })

        // Serialize the signed transaction
        const raw = utils.serializeTransaction(txFields.reduce(addKey, { }), sig);

        // Double check things went well
        // if (utils.keccak256(raw) !== tx.hash) { throw new Error("serializing failed!"); }

        return raw;
    }


    it('should have enough funds', async function () {
        const {wallet} = await loadFixture(testFixture)
        const balance = await ethers.provider.getBalance(wallet.address)
        console.log('Balance:', formatEther(balance.toString()))
        expect(balance).to.be.gte(ethers.utils.parseUnits("1000000000000000000000000000", "wei"))
    })

    it('can deploy a governance token', async function () {
        const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
        const governanceTokenDeployer = await GovernanceTokenFactory.deploy({gasPrice: 900000000, gasLimit: 1_000_000});
        const txReceipt = await governanceTokenDeployer.deployTransaction.wait()
        console.log("txReceipt: ", txReceipt)
        // await governanceTokenDeployer.deployed();
        console.log("GovernanceToken address: ", governanceTokenDeployer.address);

    })

    it('can send signed transactions', async function () {
        const {signedTx} = await loadFixture(testFixture)
        const sentTx = await ethers.provider.sendTransaction(signedTx)
        // console.log("sentTx: ", sentTx)
        await ethers.provider.getTransactionReceipt(sentTx.hash).then((receipt) => {
            console.log("receipt: ", receipt)
        })
    })

    it('can deserialize a signed transaction, reserialize and send', async function () {
        const {wallet, unsignedTx, signedTx} = await loadFixture(testFixture)

        const initialBalance = await ethers.provider.getBalance(wallet.address)

        const deserializedTx = ethers.utils.parseTransaction(signedTx)
        expect(deserializedTx.from).to.equal(wallet.address)

        const rawTx = getRawTransaction(deserializedTx)

        const receipt = await ethers.provider.sendTransaction(rawTx)
        expect(receipt.from).equal(wallet.address)
        // console.log("receipt: ", receipt)

        const newBalance = await ethers.provider.getBalance(wallet.address)
        expect(newBalance).lt(initialBalance)
    })

    it('can change tx signature and send', async function () {
        const {wallet, unsignedTx, signedTx, GovernanceTokenFactory} = await loadFixture(testFixture)

        const initialBalance = await ethers.provider.getBalance(wallet.address)

        const deserializedTx = ethers.utils.parseTransaction(signedTx)
        expect(deserializedTx.from).to.equal(wallet.address)

        // arbitrary signature
        const newSig = {
            r: "0x1820182018201820182018201820182018201820182018201820182018201820",
            s: "0x1820182018201820182018201820182018201820182018201820182018201820",
            v: 28
        }

        const rawTx = getRawTransaction(deserializedTx, newSig)

        const parseTransaction = ethers.utils.parseTransaction(rawTx)

        // get anonymous address
        const anonymousAddress : string = parseTransaction.from!
        console.log("recoveredAddress: ", anonymousAddress) //recovered address is not idempotent ??

        expect(anonymousAddress).not.equal(wallet.address)

        expect(await ethers.provider.getBalance(anonymousAddress)).equal(parseEther("0"))

        // provide some ethers to anonymous address
        await wallet.sendTransaction({
            to: anonymousAddress,
            value: ethers.utils.parseEther("1.0"),
            gasPrice: 900000000,
            gasLimit: 1_000_000
        })

        const newBalance = await ethers.provider.getBalance(wallet.address)
        expect(newBalance).lt(initialBalance)
        // @ts-ignore
        expect(await ethers.provider.getBalance(anonymousAddress)).equal(parseEther("1.0"))

        const tx = await ethers.provider.sendTransaction(rawTx)
        const transactionReceipt = await tx.wait(1)
        console.log("receipt: ", transactionReceipt)

        expect(await ethers.provider.getBalance(anonymousAddress)).lt(parseEther("1.0"))

        const contractAddress = transactionReceipt.contractAddress
        const token = await ethers.getContractAt("GovernanceToken", contractAddress, wallet)
        const tokenName = await token.name()
        const deployer = await token.owner()

        expect(tokenName).equal("GovernanceToken")
        expect(deployer).equal(anonymousAddress) //here we ensure the contract owner is the anonymous address, thus confirming the trick is working

    })

})