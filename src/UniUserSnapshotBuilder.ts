import Web3 from 'web3'
import CONSTANTS from './Constants'
import { ChainId, Token, TokenAmount, Pair } from '@uniswap/sdk'

import Bluebird from 'bluebird'
import fs from 'fs'

export default class UniUserSnapshotBuilder {
  private readonly blockHeight: string
  private readonly totleContracts
  private readonly web3: Web3
  private readonly uniswapV1FactoryContract
  private constructor(blockHeight: string, totleContracts, web3: Web3) {
    this.blockHeight = blockHeight
    this.totleContracts = totleContracts
    this.web3 = web3
    this.uniswapV1FactoryContract = new web3.eth.Contract(CONSTANTS.UNISWAP_V1_FACTORY_ABI, CONSTANTS.UNISWAP_V1_FACTORY_ADDRESS)
  }

  private async getTotleUniswapUsers(): Promise<Array<string>> {
    // Get all swap collection events
    const swapCollectionEvents = [].concat(...await Promise.all(this.totleContracts.map(async contract => {
      return await contract.getPastEvents('LogSwapCollection', {
        fromBlock: CONSTANTS.CONTRACT_CREATED_BLOCK,
        toBlock: this.blockHeight
      })
    })) as any)
    // Get transaction events from swap collection events
    const swapTransactionHashes: Array<string> = swapCollectionEvents.map(swapEvent => swapEvent.transactionHash)
    // Get transaction receipts from swap transactions
    const transactionReceipts = await Bluebird.map(swapTransactionHashes, async (hash) => {
      let receipt
      try {
        receipt = await this.web3.eth.getTransactionReceipt(hash)
      } catch (e) {
        console.log(`Failure getting receipt for transaction ${hash}`)
        throw e
      }
      return receipt
    }, {
      concurrency: 50
    })
    let userAddresses = []
    // Promise map over transaction receipts with max concurrency of 100
    await Bluebird.map(transactionReceipts, async (receipt) => {

      // Iterate over logs in the receipt
      for (let index = 0; index < receipt.logs.length; index++) {
        let log = receipt.logs[index]
        // Check if 1st topic is equal to UniswapV2's Swap event topic
        if (log.topics[0] === '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822') {
          // Get the contract object for the address that emitted this event
          let pairContract = new this.web3.eth.Contract(CONSTANTS.UNISWAP_V2_PAIR_ABI, log.address)
          // Get the token addresses
          let token0 = await pairContract.methods.token0().call()
          let token1 = await pairContract.methods.token1().call()
          token0 = new Token(ChainId.MAINNET, await pairContract.methods.token0().call(), 18, 'UNDEFINED', 'UNDEFINED')
          token1 = new Token(ChainId.MAINNET, await pairContract.methods.token1().call(), 18, 'UNDEFINED', 'UNDEFINED')
          // Calc exchange address
          let pairAddress = Pair.getAddress(token0, token1)
          // If exchange address matches emitting address, this swap touched Uniswap v2
          if (pairAddress.toLowerCase() === log.address.toLowerCase()) {
            userAddresses.push(receipt.from)
            return
          }

        }
        // Check if 1st topic is equal to UniswapV1's Swap event topic
        if (log.topics[0] === '0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f') {
          // Get the token for this exchange
          let token = await this.uniswapV1FactoryContract.methods.getToken(log.address).call()
          // If token is non-zero, this exchange is real and the swap touched Uniswap v1
          if (token != '0x0000000000000000000000000000000000000000') {
            userAddresses.push(receipt.from)
            return
          }
        }

      }
    }, {
      concurrency: 50
    })
    const candidateAccounts = new Set(fs.readFileSync('./valid-accounts.txt', "utf8").split('\n'));
    // Filter out duplicate user addresses
    userAddresses = userAddresses.filter((value, index, self) => { return self.indexOf(value) === index && candidateAccounts.has(value); })

    return userAddresses
  }


  public static async getUniTotleUsers(web3: Web3, blockHeight: string): Promise<Array<string>> {
    const totleContracts = CONSTANTS.TOTLE_ADDRESSES.map((address) => new web3.eth.Contract(CONSTANTS.TOTLE_ABI, address))
    return new UniUserSnapshotBuilder(blockHeight, totleContracts, web3).getTotleUniswapUsers()
  }
}

