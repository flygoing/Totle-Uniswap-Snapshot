# Totle Uniswap User snapshot tool

Simple tool for generating a list of Totle users that swapped through Uniswap v1/v2 at least once. The list 

# Requirements
1. Node/npm
2. An Ethereum node that has historic events
3. valid-accounts.txt file in the root of this project. The script will do an inner join on the addresses in the file and the addresses generated from the on-chain queries.

# How to generate snapshot

  - Update the `JSON_RPC_URL` field in `config.js` to have an Ethereum node URL that satisfies the above requirements
  - Copy the valid-accounts.txt to the root of this project
  - `yarn` to install packages
  - `yarn build` to build this project
  - `yarn start snapshot blockNumber` to print out a snapshot. Replace `blockNumber` with the block you want to look upto. Leaving `blockNumber` blank will default it to # 10771924, the last block before Uniswap's snapshot deadline (2020-09-01 00:00:00+00 GMT)

# How does it work?

1. Fetch all LogSwapCollection events on relevant Totle Primaries
2. Turn these into tx receipts
3. Check if Uniswap v1 or v2 is used in the receipt
