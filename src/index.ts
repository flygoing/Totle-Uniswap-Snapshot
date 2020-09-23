import Web3 from 'web3'
import * as yargs from 'yargs'
import UniTotleUserSnapshotBuilder from './UniUserSnapshotBuilder'
import * as CONFIG from '../config'

yargs
  .scriptName("uni-totle-user-snapshot")
  .usage('$0 <cmd> [args]')
  .command('snapshot [blockNumber]', 'Get history of Totle users where swaps were fully or partially settled through Uniswap', (yargs) => {
    yargs.positional('blockNumber', {
      type: 'string',
      default: '10771924',
      describe: 'block number to snapshot at'
    })
  }, async function (argv) {
    const totleUniUsers = await UniTotleUserSnapshotBuilder.getUniTotleUsers(new Web3(CONFIG.JSON_RPC_URL), argv.blockNumber)
    totleUniUsers.forEach((user)=>{
      console.log(user)
    })
  })
  .help()
  .argv
