[![Build Status](https://travis-ci.org/ARISENIO/arisenjs.svg?branch=master)](https://travis-ci.org/ARISENIO/arisenjs)
[![NPM](https://img.shields.io/npm/v/arisenjs.svg)](https://www.npmjs.org/package/arisenjs)

# ArisenJSV1

General purpose library for Arisen blockchains.

### Versions

| [ARISENIO/arisenjs](/ARISENIO/arisenjs) | [Npm](https://www.npmjs.com/package/arisenjs) | [ARISENIO/rsn](https://github.com/ARISENIO/rsn) | [Docker Hub](https://hub.docker.com/r/arisen/rsn/) |
| --- | --- | --- | --- |
| tag: 15.0.2 | `npm install arisenjs` (version 15) | tag: v1.0.6 | arisen/rsn:v1.0.6 |

Upgrade notes:
* Converted some types in **format** module from unsigned to signed: UDecimalPad -> DecimalPad for example (15.0.1)
* All `asset` and `extended_asset` amounts require exact decimal places (Change `1 RIX` to `1.0000 RIX`) (15.0.0)
* Use `config.verbose` instead of `config.debug` (14.1.0)

Prior [version](./docs/prior_versions.md) matrix.

### Usage

Ways to instantiate arisenjs.

```js
Rsn = require('arisenjs')

// Bank Account's Private Key or keys (array) provided statically or by way of a function.
// For multiple keys, the get_required_keys API is used (more on that below).
keyProvider: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

// Localhost Testnet (run ./docker/up.sh)
rsn = Rsn({keyProvider})

// Connect to a testnet or mainnet
rsn = Rsn({httpEndpoint, chainId, keyProvider})

// Cold-storage
rsn = Rsn({httpEndpoint: null, chainId, keyProvider})

// Read-only instance when 'arisenjs' is already a dependency
rsn = Rsn.modules.api({/*config*/})

// Read-only instance when an application never needs to write (smaller library)
RsnApi = require('arisenjs-api')
rsn = RsnApi({/*config*/})
```

No-arguments prints usage.

```js
rsn.getBlock()
```
```json
USAGE
getBlock - Fetch a block from the decentralized banking network.

PARAMETERS
{
  "block_num_or_id": "string"
}
```

Start a nodrsnd process.  The docker in this repository provides a setup
the supports the examples in this README.

```bash
cd ./docker && ./up.sh
```

All functions read only or transactional follow this pattern for parameters.

```js
// If the last argument is a function it is treated as a callback
rsn.getBlock(1, (error, result) => {})

// If a callback is not provided, a Promise is returned
rsn.getBlock(1) // @returns {Promise}

// Parameters can be positional or an object
rsn.getBlock({block_num_or_id: 1})

// An API with no parameters is invoked with an empty object or callback (avoids logging usage)
rsn.getInfo({}) // @returns {Promise}
rsn.getInfo((error, result) => { console.log(error, result) })
```

Chain and history API functions are available after creating the `rsn` object.
API methods and documentation are generated from the chain and history json files.

* [chain.json](https://github.com/ARISENIO/arisenjs-api/blob/master/src/api/v1/chain.json)
* [history.json](https://github.com/ARISENIO/arisenjs-api/blob/master/src/api/v1/history.json)

Until we generate a markdown for these, please convert the names in these
json to camel case functions.

* `"get_info": ..` is `rsn.getInfo(..)`

### Configuration

```js
Rsn = require('arisenjs')

// Default configuration (additional options below)
config = {
  chainId: null, // 32 byte (64 char) hex string
  keyProvider: ['PrivateKeys...'], // WIF string or array of keys..
  httpEndpoint: 'http://127.0.0.1:8888',
  expireInSeconds: 60,
  broadcast: true,
  verbose: false, // API activity
  sign: true
}

rsn = Rsn(config)
```

* **chainId** `hex` - Unique ID for the decentralized banking network you're connecting too.  This
  is required for valid transaction signing.  The chainId is provided via the
  [get_info](http://ayeaye.cypherglass.com:8888/v1/chain/get_info) API call.

  Identifies a chain by its initial genesis block.  All transactions signed will
  only be valid the decentralized banking network with this chainId.  Verify the chainId for
  security reasons.

* **keyProvider** `[array<string>|string|function]` - Provides Bank Account's Private Keys
  used to sign transaction.  If multiple Bank Account's Private Keys are found, the API
  `get_required_keys` is called to discover which signing keys to use.  If a
  function is provided, this function is called for Each bank transaction.

* **httpEndpoint** `string` - http or https location of a nodrsnd server
  providing a chain API.  When using arisenjs from a browser remember to configure
  the same origin policy in nodrsnd or proxy server.  For testing, nodrsnd
  configuration `access-control-allow-origin = *` could be used.

  Set this value to **null** for a cold-storage (no network) configuration.

* **expireInSeconds** `number` - number of seconds before the bank transaction
  will expire.  The time is based on the nodrsnd's clock.  An unexpired
  transaction that may have had an error is a liability until the expiration
  is reached, this time should be brief.

* **broadcast** `[boolean=true]` - post the bank transaction to
  the decentralized banking network.  Use false to obtain a fully Signed Bank Transaction.

* **verbose** `[boolean=false]` - verbose logging such as API activity.

* **debug** `[boolean=false]` - low level debug logging (serialization).

* **sign** `[boolean=true]` - sign the bank transaction with a Bank Account's Private Key.  Leaving
  a transaction unsigned avoids the need to provide a Bank Account's Private Key.

* **mockTransactions** (advanced)
  * `mockTransactions: () => null // 'pass',  or 'fail'`
  * `pass` - do not broadcast, always pretend that the bank transaction worked
  * `fail` - do not broadcast, pretend the bank transaction failed
  * `null|undefined` - broadcast as usual

* **transactionHeaders** (advanced) - manually calculate transaction header.  This
  may be provided so arisenjs does not need to make header related API calls to
  nodrsn.  Used in environments like cold-storage.  This callback is called for
  every transaction. Headers are documented here [arisenjs-api#headers](https://github.com/ARISENIO/arisenjs-api/blob/HEAD/docs/index.md#headers--object).
  * `transactionHeaders: (expireInSeconds, callback) => {callback(null/*error*/, headers)}`

* **logger** - default logging configuration.
  ```js
  logger: {
    log: config.verbose ? console.log : null,
    error: console.error // null to disable
  }
  ```

  Turn off all error logging: `config.logger = {error: null}`

### Options

Options may be provided after parameters.

```js
options = {
  authorization: 'alice@active',
  broadcast: true,
  sign: true
}
```

```js
rsn.transfer('alice', 'bob', '1.0000 RIX', '', options)
```

* **authorization** `[array<auth>|auth]` - identifies the
  signing account and permission typically in a multisig
  configuration.  Authorization may be a string formatted as
  `account@permission` or an `object<{actor: account, permission}>`.
  * If missing default authorizations will be calculated.
  * If provided additional authorizations will not be added.
  * Performs deterministic sorting by account name

  If a default authorization is calculated the action's 1st field must be
  an account_name.  The account_name in the 1st field gets added as the
  active key authorization for the action.

* **broadcast** `[boolean=true]` - post the bank transaction to
  the decentralized banking network.  Use false to obtain a fully Signed Bank Transaction.

* **sign** `[boolean=true]` - sign the bank transaction with a Bank Account's Private Key.  Leaving
  a transaction unsigned avoids the need to provide a Bank Account's Private Key.

### Transaction

the bank transaction function accepts the standard blockchain transaction.

Required transaction header fields will be added unless your signing without a
network connection (httpEndpoint == null). In that case provide you own headers:

```js
// only needed in cold-storage or for offline transactions
const headers = {
  expiration: '2018-06-14T18:16:10'
  ref_block_num: 1,
  ref_block_prefix: 452435776
}
```

Create and send (broadcast) a transaction:

```javascript
/** @return {Promise} */
rsn.transaction(
  {
    // ...headers,
    actions: [
      {
        account: 'arisen.token',
        name: 'transfer',
        authorization: [{
          actor: 'inita',
          permission: 'active'
        }],
        data: {
          from: 'inita',
          to: 'initb',
          quantity: '7.0000 RIX',
          memo: ''
        }
      }
    ]
  }
  // options -- example: {broadcast: false}
)
```

### Named action functions

More concise functions are provided for applications that may use actions
more frequently.  This avoids having lots of JSON in the code.

```javascript
// Run with no arguments to print usage.
rsn.transfer()

// Callback is last, when omitted a promise is returned
rsn.transfer('inita', 'initb', '1.0000 RIX', '', (error, result) => {})
rsn.transfer('inita', 'initb', '1.1000 RIX', '') // @returns {Promise}

// positional parameters
rsn.transfer('inita', 'initb', '1.2000 RIX', '')

// named parameters
rsn.transfer({from: 'inita', to: 'initb', quantity: '1.3000 RIX', memo: ''})

// options appear after parameters
options = {broadcast: true, sign: true}

// `false` is a shortcut for {broadcast: false}
rsn.transfer('inita', 'initb', '1.4000 RIX', '', false)
```

Read-write API methods and documentation are generated from the arisen
[token](https://github.com/ARISENIO/arisenjs/blob/master/src/schema/arisen_token.json) and
[system](https://github.com/ARISENIO/arisenjs/blob/master/src/schema/arisen_system.json).

Assets amounts require zero padding.  For a better user-experience, if you know
the correct precision you may use DecimalPad to add the padding.

```js
DecimalPad = Rsn.modules.format.DecimalPad
userInput = '10.2'
precision = 4
assert.equal('10.2000', DecimalPad(userInput, precision))
```

For more advanced signing, see `keyProvider` and `signProvider` in
[index.test.js](https://github.com/ARISENIO/arisenjs/blob/master/src/index.test.js).

### Shorthand

Shorthand is available for some types such as Asset and Authority.  This syntax
is only for concise functions and does not work when providing entire transaction
objects to `rsn.transaction`..

For example:
* permission `inita` defaults `inita@active`
* authority `'RSN6MRy..'` expands `{threshold: 1, keys: [key: 'RSN6MRy..', weight: 1]}`
* authority `inita` expands `{{threshold: 1, accounts: [..actor: 'inita', permission: 'active', weight: 1]}}`

### New Account

New accounts will likely require some staked tokens for RAM and bandwidth.

```javascript
wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
pubkey = 'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'

rsn.transaction(tr => {
  tr.newaccount({
    creator: 'arisen',
    name: 'myaccount',
    owner: pubkey,
    active: pubkey
  })

  tr.buyrambytes({
    payer: 'arisen',
    receiver: 'myaccount',
    bytes: 8192
  })

  tr.delegatebw({
    from: 'arisen',
    receiver: 'myaccount',
    stake_net_quantity: '10.0000 RIX',
    stake_cpu_quantity: '10.0000 RIX',
    transfer: 0
  })
})
```

### Contract

Deploy and call smart contracts.

#### Compile

If you're loading a **wasm** file, you do not need binaryen. If you're loading
a **wast** file you can include and configure the binaryen compiler, this is
used to compile to **wasm** automatically when calling **setcode**.

Versions of binaryen may be [problematic](https://github.com/ARISENIO/arisen/issues/2187).

```bash
$ npm install binaryen@37.0.0
```

```js
binaryen = require('binaryen')
rsn = Rsn({keyProvider, binaryen})
```

#### Deploy

```javascript
wasm = fs.readFileSync(`docker/contracts/arisen.token/arisen.token.wasm`)
abi = fs.readFileSync(`docker/contracts/arisen.token/arisen.token.abi`)

// Publish contract to the decentralized banking network
rsn.setcode('myaccount', 0, 0, wasm) // @returns {Promise}
rsn.setabi('myaccount', JSON.parse(abi)) // @returns {Promise}
```

#### Fetch a smart contract

```js
// @returns {Promise}
rsn.contract('myaccount', [options], [callback])

// Run immediately, `myaction` returns a Promise
rsn.contract('myaccount').then(myaccount => myaccount.myaction(..))

// Group actions. `transaction` returns a Promise but `myaction` does not
rsn.transaction('myaccount', myaccount => { myaccount.myaction(..) })

// Transaction with multiple contracts
rsn.transaction(['myaccount', 'myaccount2'], ({myaccount, myaccount2}) => {
   myaccount.myaction(..)
   myaccount2.myaction(..)
})
```

#### Offline or cold-storage contract

```js
rsn = Rsn({httpEndpoint: null})

abi = fs.readFileSync(`docker/contracts/arisen.token/arisen.token.abi`)
rsn.fc.abiCache.abi('myaccount', JSON.parse(abi))

// Check that the ABI is available (print usage)
rsn.contract('myaccount').then(myaccount => myaccount.create())
```
#### Offline or cold-storage transaction

```js
// ONLINE

// Prepare headers
expireInSeconds = 60 * 60 // 1 hour

rsn = Rsn(/* {httpEndpoint: 'https://..'} */)

info = await rsn.getInfo({})
chainDate = new Date(info.head_block_time + 'Z')
expiration = new Date(chainDate.getTime() + expireInSeconds * 1000)
expiration = expiration.toISOString().split('.')[0]

block = await rsn.getBlock(info.last_irreversible_block_num)

transactionHeaders = {
  expiration,
  ref_block_num: info.last_irreversible_block_num & 0xFFFF,
  ref_block_prefix: block.ref_block_prefix
}

// OFFLINE (bring `transactionHeaders`)

// All keys in keyProvider will sign.
rsn = Rsn({httpEndpoint: null, chainId, keyProvider, transactionHeaders})

transfer = await rsn.transfer('inita', 'initb', '1.0000 RIX', '')
transferTransaction = transfer.transaction

// ONLINE (bring `transferTransaction`)

rsn = Rsn(/* {httpEndpoint: 'https://..'} */)

processedTransaction = await rsn.pushTransaction(transferTransaction)
```

#### Custom Private Currency

```js
// more on the contract / transaction syntax

await rsn.transaction('myaccount', myaccount => {

  // Create the initial token with its max supply
  // const options = {authorization: 'myaccount'} // default
  myaccount.create('myaccount', '10000000.000 TOK')//, options)

  // Issue some of the max supply for circulation into an arbitrary account
  myaccount.issue('myaccount', '10000.000 TOK', 'issue')
})

const balance = await rsn.getCurrencyBalance('myaccount', 'myaccount', 'TOK')
console.log('Currency Balance', balance)
```

### Calling Actions

Other ways to use contracts and transactions.

```javascript
// if either transfer fails, both will fail (1 transaction, 2 messages)
await rsn.transaction(rsn =>
  {
    rsn.transfer('inita', 'initb', '1.0000 RIX', ''/*memo*/)
    rsn.transfer('inita', 'initc', '1.0000 RIX', ''/*memo*/)
    // Returning a promise is optional (but handled as expected)
  }
  // [options],
  // [callback]
)

// transaction on a single contract
await rsn.transaction('myaccount', myaccount => {
  myaccount.transfer('myaccount', 'inita', '10.000 TOK@myaccount', '')
})

// mix contracts in the same transaction
await rsn.transaction(['myaccount', 'arisen.token'], ({myaccount, arisen_token}) => {
  myaccount.transfer('inita', 'initb', '1.000 TOK@myaccount', '')
  arisen_token.transfer('inita', 'initb', '1.0000 RIX', '')
})

// The contract method does not take an array so must be called once for
// each contract that is needed.
const myaccount = await rsn.contract('myaccount')
await myaccount.transfer('myaccount', 'inita', '1.000 TOK', '')

// a transaction to a contract instance can specify multiple actions
await myaccount.transaction(myaccountTr => {
  myaccountTr.transfer('inita', 'initb', '1.000 TOK', '')
  myaccountTr.transfer('initb', 'inita', '1.000 TOK', '')
})
```

# Development

From time-to-time the arisenjs and nodrsn binary format will change between releases
so you may need to start `nodrsn` with the `--skip-transaction-signatures` parameter
to get your transactions to pass.

Note, `package.json` has a "main" pointing to `./lib`.  The `./lib` folder is for
es2015 code built in a separate step. If you're changing and testing code,
import from `./src` instead.

```javascript
Rsn = require('./src')

// forceActionDataHex = false helps transaction readability but may trigger back-end bugs
config = {verbose: true, debug: false, broadcast: true, forceActionDataHex: true, keyProvider}

rsn = Rsn(config)
```

#### Fcbuffer

The `rsn` instance can provide serialization:

```javascript
// 'asset' is a type but could be any struct or type like: transaction or uint8
type = {type: 1, data: '00ff'}
buffer = rsn.fc.toBuffer('extensions_type', type)
assert.deepEqual(type, rsn.fc.fromBuffer('extensions_type', buffer))

// ABI Serialization
rsn.contract('arisen.token', (error, arisen_token) => {
  create = {issuer: 'inita', maximum_supply: '1.0000 RIX'}
  buffer = arisen_token.fc.toBuffer('create', create)
  assert.deepEqual(create, arisen_token.fc.fromBuffer('create', buffer))
})
```

Use Node v10+ for `package-lock.json`.

# Related Libraries

These libraries are integrated into `arisenjs` seamlessly so you probably do not
need to use them directly.  They are exported here giving more API access or
in some cases may be used standalone.

```javascript
var {format, api, ecc, json, Fcbuffer} = Rsn.modules
```
* format [./format.md](./docs/format.md)
  * Blockchain name validation
  * Asset string formatting

* arisenjs-api [[Github](https://github.com/arisen/arisenjs-api), [NPM](https://www.npmjs.org/package/arisenjs-api)]
  * Remote API to an Arisen blockchain node (nodrsn)
  * Use this library directly if you need read-only access to the decentralized banking network
    (don't need to sign transactions).

* arisenjs-ecc [[Github](https://github.com/arisen/arisenjs-ecc), [NPM](https://www.npmjs.org/package/arisenjs-ecc)]
  * Bank Account's Private Key, Public Key, Signature, AES, Encryption / Decryption
  * Validate public or Bank Account's Private Keys
  * Encrypt or decrypt with Arisen compatible checksums
  * Calculate a shared secret

* json {[api](https://github.com/ARISENIO/arisenjs-api/blob/master/src/api), [schema](https://github.com/ARISENIO/arisenjs/blob/master/src/schema)},
  * Blockchain definitions (api method names, blockchain schema)

* arisenjs-keygen [[Github](https://github.com/arisen/arisenjs-keygen), [NPM](https://www.npmjs.org/package/arisenjs-keygen)]
  * Bank Account's Private Key storage and key management

* Fcbuffer [[Github](https://github.com/arisen/arisenjs-fcbuffer), [NPM](https://www.npmjs.org/package/fcbuffer)]
  * Binary serialization used by the decentralized banking network
  * Clients sign the binary form of the bank transaction
  * Allows client to know what it is signing


# Browser

```bash
git clone https://github.com/ARISENIO/arisenjs.git
cd arisenjs
npm install
npm run build_browser
# builds: ./dist/rsn.js load with ./dist/index.html

npm run build_browser_test
# builds: ./dist/test.js run with ./dist/test.html
```

```html
<script src="rsn.js"></script>
<script>
var rsn = Rsn()
//...
</script>
```

# Environment

Node and browser (es2015)
