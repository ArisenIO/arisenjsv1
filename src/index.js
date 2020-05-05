const ecc = require('arisenjs-ecc')
const Fcbuffer = require('fcbuffer')
const RsnApi = require('arisenjs-api')
const assert = require('assert')

const Structs = require('./structs')
const AbiCache = require('./abi-cache')
const writeApiGen = require('./write-api')
const format = require('./format')
const schema = require('./schema')
const pkg = require('../package.json')

const Rsn = (config = {}) => {
  config = Object.assign({}, {
    httpEndpoint: 'https://greatchains.arisennodes.io',
    debug: false,
    verbose: false,
    broadcast: true,
    sign: true
  }, config)

  const defaultLogger = {
    log: config.verbose ? console.log : null,
    error: console.error
  }
  config.logger = Object.assign({}, defaultLogger, config.logger)

  return createRsn(config)
}

module.exports = Rsn

Object.assign(
  Rsn,
  {
    version: pkg.version,
    modules: {
      format,
      api: RsnApi,
      ecc,
      json: {
        api: RsnApi.api,
        schema
      },
      Fcbuffer
    },

    /** @deprecated */
    Testnet: function (config) {
      console.error('deprecated, change Rsn.Testnet(..) to just Rsn(..)')
      return Rsn(config)
    },

    /** @deprecated */
    Localnet: function (config) {
      console.error('deprecated, change Rsn.Localnet(..) to just Rsn(..)')
      return Rsn(config)
    }
  }
)


function createRsn(config) {
  const network = config.httpEndpoint != null ? RsnApi(config) : null
  config.network = network

  const abiCache = AbiCache(network, config)
  config.abiCache = abiCache

  if(!config.chainId) {
    config.chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'
  }

  if(network) {
    checkChainId(network, config.chainId, config.logger)
  }

  if(config.mockTransactions != null) {
    if(typeof config.mockTransactions === 'string') {
      const mock = config.mockTransactions
      config.mockTransactions = () => mock
    }
    assert.equal(typeof config.mockTransactions, 'function', 'config.mockTransactions')
  }

  const {structs, types, fromBuffer, toBuffer} = Structs(config)
  const eos = mergeWriteFunctions(config, RsnApi, structs)

  Object.assign(eos, {fc: {
    structs,
    types,
    fromBuffer,
    toBuffer,
    abiCache
  }})

  Object.assign(eos, {modules: {
    format
  }})

  if(!config.signProvider) {
    config.signProvider = defaultSignProvider(eos, config)
  }

  return eos
}

/**
  Merge in write functions (operations).  Tested against existing methods for
  name conflicts.

  @arg {object} config.network - read-only api calls
  @arg {object} RsnApi - api[RsnApi] read-only api calls
  @return {object} - read and write method calls (create and sign transactions)
  @throw {TypeError} if a funciton name conflicts
*/
function mergeWriteFunctions(config, RsnApi, structs) {
  const {network} = config

  const merge = Object.assign({}, network)

  const writeApi = writeApiGen(RsnApi, network, structs, config, schema)
  throwOnDuplicate(merge, writeApi, 'Conflicting methods in RsnApi and Transaction Api')
  Object.assign(merge, writeApi)

  return merge
}

function throwOnDuplicate(o1, o2, msg) {
  for(const key in o1) {
    if(o2[key]) {
      throw new TypeError(msg + ': ' + key)
    }
  }
}

/**
  The default sign provider is designed to interact with the available public
  keys (maybe just one), the bank transaction, and the decentralized banking network to figure out
  the minimum set of signing keys.

  If only one key is available, the decentralized banking network API calls are skipped and that
  key is used to sign the bank transaction.
*/
const defaultSignProvider = (eos, config) => async function({sign, buf, transaction}) {
  const {keyProvider} = config

  if(!keyProvider) {
    throw new TypeError('This transaction requires a config.keyProvider for signing')
  }

  let keys = keyProvider
  if(typeof keyProvider === 'function') {
    keys = keyProvider({transaction})
  }

  // keyProvider may return keys or Promise<keys>
  keys = await Promise.resolve(keys)

  if(!Array.isArray(keys)) {
    keys = [keys]
  }

  keys = keys.map(key => {
    try {
      // normalize format (WIF => PVT_K1_base58privateKey)
      return {private: ecc.PrivateKey(key).toString()}
    } catch(e) {
      // normalize format (EOSKey => PUB_K1_base58publicKey)
      return {public: ecc.PublicKey(key).toString()}
    }
    assert(false, "expecting public or Bank Account's Private Keys from keyProvider")
  })

  if(!keys.length) {
    throw new Error('missing key, check your keyProvider')
  }

  // simplify default signing #17
  if(keys.length === 1 && keys[0].private) {
    const pvt = keys[0].private
    return sign(buf, pvt)
  }

  // offline signing assumes all keys provided need to sign
  if(config.httpEndpoint == null) {
    const sigs = []
    for(const key of keys) {
      sigs.push(sign(buf, key.private))
    }
    return sigs
  }

  const keyMap = new Map()

  // keys are either public or Bank Account's Private Keys
  for(const key of keys) {
    const isPrivate = key.private != null
    const isPublic = key.public != null

    if(isPrivate) {
      keyMap.set(ecc.privateToPublic(key.private), key.private)
    } else {
      keyMap.set(key.public, null)
    }
  }

  const pubkeys = Array.from(keyMap.keys())

  return eos.getRequiredKeys(transaction, pubkeys).then(({required_keys}) => {
    if(!required_keys.length) {
      throw new Error('missing required keys for ' + JSON.stringify(transaction))
    }

    const pvts = [], missingKeys = []

    for(let requiredKey of required_keys) {
      // normalize (EOSKey.. => PUB_K1_Key..)
      requiredKey = ecc.PublicKey(requiredKey).toString()

      const wif = keyMap.get(requiredKey)
      if(wif) {
        pvts.push(wif)
      } else {
        missingKeys.push(requiredKey)
      }
    }

    if(missingKeys.length !== 0) {
      assert(typeof keyProvider === 'function',
        "keyProvider function is needed for Bank Account's Private Key lookup")

      // const pubkeys = missingKeys.map(key => ecc.PublicKey(key).toStringLegacy())
      keyProvider({pubkeys: missingKeys})
        .forEach(pvt => { pvts.push(pvt) })
    }

    const sigs = []
    for(const pvt of pvts) {
      sigs.push(sign(buf, pvt))
    }

    return sigs
  })
}

function checkChainId(network, chainId, logger) {
  network.getInfo({}).then(info => {
    if(info.chain_id !== chainId) {
      if(logger.error) {
        logger.error(
          'chainId mismatch, signatures will not match transaction authority. ' +
          `expected ${chainId} !== actual ${info.chain_id}`
        )
      }
    }
  }).catch(error => {
    if(logger.error) {
      logger.error(error)
    }
  })
}
