/* eslint-env mocha */
const assert = require('assert')
const fs = require('fs')

const Rsn = require('.')
const {ecc} = Rsn.modules
const {Keystore} = require('rsnjs-keygen')

const wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

describe('version', () => {
  it('exposes a version number', () => {
    assert.ok(Rsn.version)
  })
})

describe('offline', () => {
  const headers = {
    expiration: new Date().toISOString().split('.')[0], // Don't use `new Date` in production
    ref_block_num: 1,
    ref_block_prefix: 452435776,
    net_usage_words: 0,
    max_cpu_usage_ms: 0,
    delay_sec: 0,
    context_free_actions: [],
    transaction_extensions: []
  }


  it('multi-signature', async function() {
    const transactionHeaders = (expireInSeconds, callback) => {
      callback(null/*error*/, headers)
    }
    const rsn = Rsn({
      keyProvider: [
        ecc.seedPrivate('key1'),
        ecc.seedPrivate('key2')
      ],
      httpEndpoint: null,
      transactionHeaders
    })

    const trx = await rsn.nonce(1, {authorization: 'inita'})

    assert.equal(trx.transaction.signatures.length, 2, 'signature count')
  })

  it('transaction', async function() {
    const rsn = Rsn({
      keyProvider: wif,
      httpEndpoint: null
    })

    const trx = await rsn.transaction({
      expiration: new Date().toISOString().split('.')[0], // Don't use `new Date` in production
      ref_block_num: 1,
      ref_block_prefix: 452435776,
      actions: [{
        account: 'arisen.null',
        name: 'nonce',
        authorization:[{
          actor: 'inita',
          permission: 'active'
        }],
        data: '0131' //hex
      }]
    })

    assert.equal(trx.transaction.signatures.length, 1, 'signature count')
  })

  it('transactionHeaders object', async function() {
    const rsn = Rsn({
      keyProvider: wif,
      httpEndpoint: null,
      transactionHeaders: headers
    })

    const memo = ''
    const trx = await rsn.transfer('few', 'many', '100.0000 RSN', memo)

    assert.deepEqual({
      expiration: trx.transaction.transaction.expiration,
      ref_block_num: trx.transaction.transaction.ref_block_num,
      ref_block_prefix: trx.transaction.transaction.ref_block_prefix,
      net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: [],
      transaction_extensions: []
    }, headers)

    assert.equal(trx.transaction.signatures.length, 1, 'signature count')
  })

  it('abi', async function() {
    const rsn = Rsn({httpEndpoint: null})

    const abiBuffer = fs.readFileSync(`docker/contracts/arisen.bios/arisen.bios.abi`)
    const abiObject = JSON.parse(abiBuffer)

    assert.deepEqual(abiObject, rsn.fc.abiCache.abi('arisen.bios', abiBuffer).abi)
    assert.deepEqual(abiObject, rsn.fc.abiCache.abi('arisen.bios', abiObject).abi)

    const bios = await rsn.contract('arisen.bios')
    assert(typeof bios.newaccount === 'function', 'unrecognized contract')
  })

})

// some transactions that don't broadcast may require Api lookups
if(process.env['NODE_ENV'] === 'development') {

  // describe('networks', () => {
  //   it('testnet', (done) => {
  //     const rsn = Rsn()
  //     rsn.getBlock(1, (err, block) => {
  //       if(err) {
  //         throw err
  //       }
  //       done()
  //     })
  //   })
  // })

  describe('Contracts', () => {
    it('Messages do not sort', async function() {
      const local = Rsn()
      const opts = {sign: false, broadcast: false}
      const tx = await local.transaction(['currency', 'arisen.token'], ({currency, arisen_token}) => {
        // make sure {account: 'arisen.token', ..} remains first
        arisen_token.transfer('inita', 'initd', '1.1000 RSN', '')

        // {account: 'currency', ..} remains second (reverse sort)
        currency.transfer('inita', 'initd', '1.2000 CUR', '')

      }, opts)
      assert.equal(tx.transaction.transaction.actions[0].account, 'arisen.token')
      assert.equal(tx.transaction.transaction.actions[1].account, 'currency')
    })
  })

  describe('Contract', () => {
    function deploy(contract, account = 'inita') {
      it(`deploy ${contract}@${account}`, async function() {
        this.timeout(4000)
        // console.log('todo, skipping deploy ' + `${contract}@${account}`)
        const config = {binaryen: require("binaryen"), keyProvider: wif}
        const rsn = Rsn(config)

        const wasm = fs.readFileSync(`docker/contracts/${contract}/${contract}.wasm`)
        const abi = fs.readFileSync(`docker/contracts/${contract}/${contract}.abi`)


        await rsn.setcode(account, 0, 0, wasm)
        await rsn.setabi(account, JSON.parse(abi))

        const code = await rsn.getAbi(account)

        const diskAbi = JSON.parse(abi)
        delete diskAbi.____comment
        if(!diskAbi.error_messages) {
          diskAbi.error_messages = []
        }

        assert.deepEqual(diskAbi, code.abi)
      })
    }

    // When ran multiple times, deploying to the same account
    // avoids a same contract version deploy error.
    // TODO: undeploy contract instead (when API allows this)

    deploy('arisen.msig')
    deploy('arisen.token')
    deploy('arisen.bios')
    deploy('arisen.system')
  })

  describe('Contracts Load', () => {
    function load(name) {
      it(name, async function() {
        const rsn = Rsn()
        const contract = await rsn.contract(name)
        assert(contract, 'contract')
      })
    }
    load('arisen')
    load('arisen.token')
  })

  describe('transactions', () => {
    const signProvider = ({sign, buf}) => sign(buf, wif)
    const promiseSigner = (args) => Promise.resolve(signProvider(args))

    it('usage', () => {
      const rsn = Rsn({signProvider})
      rsn.transfer()
    })

    // A keyProvider can return private keys directly..
    it('keyProvider private key', () => {

      // keyProvider should return an array of keys
      const keyProvider = () => {
        return [wif]
      }

      const rsn = Rsn({keyProvider})

      return rsn.transfer('inita', 'initb', '1.0000 RSN', '', false).then(tr => {
        assert.equal(tr.transaction.signatures.length, 1)
        assert.equal(typeof tr.transaction.signatures[0], 'string')
      })
    })

    it('keyProvider multiple private keys (get_required_keys)', () => {

      // keyProvider should return an array of keys
      const keyProvider = () => {
        return [
          '5K84n2nzRpHMBdJf95mKnPrsqhZq7bhUvrzHyvoGwceBHq8FEPZ',
          wif
        ]
      }

      const rsn = Rsn({keyProvider})

      return rsn.transfer('inita', 'initb', '1.2740 RSN', '', false).then(tr => {
        assert.equal(tr.transaction.signatures.length, 1)
        assert.equal(typeof tr.transaction.signatures[0], 'string')
      })
    })

    // If a keystore is used, the keyProvider should return available
    // public keys first then respond with private keys next.
    it('keyProvider public keys then private key', () => {
      const pubkey = ecc.privateToPublic(wif)

      // keyProvider should return a string or array of keys.
      const keyProvider = ({transaction, pubkeys}) => {
        if(!pubkeys) {
          assert.equal(transaction.actions[0].name, 'transfer')
          return [pubkey]
        }

        if(pubkeys) {
          assert.deepEqual(pubkeys, [pubkey])
          return [wif]
        }
        assert(false, 'unexpected keyProvider callback')
      }

      const rsn = Rsn({keyProvider})

      return rsn.transfer('inita', 'initb', '9.0000 RSN', '', false).then(tr => {
        assert.equal(tr.transaction.signatures.length, 1)
        assert.equal(typeof tr.transaction.signatures[0], 'string')
      })
    })

    it('keyProvider from rsnjs-keygen', () => {
      const keystore = Keystore('uid')
      keystore.deriveKeys({parent: wif})
      const rsn = Rsn({keyProvider: keystore.keyProvider})
      return rsn.transfer('inita', 'initb', '12.0000 RSN', '', true)
    })

    it('keyProvider return Promise', () => {
      const rsn = Rsn({keyProvider: new Promise(resolve => {resolve(wif)})})
      return rsn.transfer('inita', 'initb', '1.6180 RSN', '', true)
    })

    it('signProvider', () => {
      const customSignProvider = ({buf, sign, transaction}) => {

        // All potential keys (RSN6MRy.. is the pubkey for 'wif')
        const pubkeys = ['RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV']

        return rsn.getRequiredKeys(transaction, pubkeys).then(res => {
          // Just the required_keys need to sign
          assert.deepEqual(res.required_keys, pubkeys)
          return sign(buf, wif) // return hex string signature or array of signatures
        })
      }
      const rsn = Rsn({signProvider: customSignProvider})
      return rsn.transfer('inita', 'initb', '2.0000 RSN', '', false)
    })

    it('create asset', async function() {
      const rsn = Rsn({signProvider})
      const pubkey = 'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      const auth = {authorization: 'arisen.token'}
      await rsn.create('arisen.token', '10000 ' + randomAsset(), auth)
      await rsn.create('arisen.token', '10000.00 ' + randomAsset(), auth)
    })

    it('newaccount (broadcast)', () => {
      const rsn = Rsn({signProvider})
      const pubkey = 'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      const name = randomName()

      return rsn.transaction(tr => {
        tr.newaccount({
          creator: 'arisen',
          name,
          owner: pubkey,
          active: pubkey
        })

        tr.buyrambytes({
          payer: 'arisen',
          receiver: name,
          bytes: 8192
        })

        tr.delegatebw({
          from: 'arisen',
          receiver: name,
          stake_net_quantity: '10.0000 RSN',
          stake_cpu_quantity: '10.0000 RSN',
          transfer: 0
        })
      })
    })

    it('mockTransactions pass', () => {
      const rsn = Rsn({signProvider, mockTransactions: 'pass'})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '').then(transfer => {
        assert(transfer.mockTransaction, 'transfer.mockTransaction')
      })
    })

    it('mockTransactions fail', () => {
      const logger = { error: null }
      const rsn = Rsn({signProvider, mockTransactions: 'fail', logger})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '').catch(error => {
        assert(error.indexOf('fake error') !== -1, 'expecting: fake error')
      })
    })

    it('transfer (broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '')
    })

    it('transfer custom token precision (broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transfer('inita', 'initb', '1.618 PHI', '')
    })

    it('transfer custom authorization (broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '', {authorization: 'inita@owner'})
    })

    it('transfer custom authorization sorting (no broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '',
        {authorization: ['initb@owner', 'inita@owner'], broadcast: false}
      ).then(({transaction}) => {
        const ans = [
          {actor: 'inita', permission: 'owner'},
          {actor: 'initb', permission: 'owner'}
        ]
        assert.deepEqual(transaction.transaction.actions[0].authorization, ans)
      })
    })

    it('transfer (no broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '', {broadcast: false})
    })

    it('transfer (no broadcast, no sign)', () => {
      const rsn = Rsn({signProvider})
      const opts = {broadcast: false, sign: false}
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '', opts).then(tr =>
        assert.deepEqual(tr.transaction.signatures, [])
      )
    })

    it('transfer sign promise (no broadcast)', () => {
      const rsn = Rsn({signProvider: promiseSigner})
      return rsn.transfer('inita', 'initb', '1.0000 RSN', '', false)
    })

    it('action to unknown contract', done => {
      const logger = { error: null }
      Rsn({signProvider, logger}).contract('unknown432')
      .then(() => {throw 'expecting error'})
      .catch(error => {
        done()
      })
    })

    it('action to contract', () => {
      return Rsn({signProvider}).contract('arisen.token').then(token => {
        return token.transfer('inita', 'initb', '1.0000 RSN', '')
          // transaction sent on each command
          .then(tr => {
            assert.equal(1, tr.transaction.transaction.actions.length)

            return token.transfer('initb', 'inita', '1.0000 RSN', '')
              .then(tr => {assert.equal(1, tr.transaction.transaction.actions.length)})
          })
      }).then(r => {assert(r == undefined)})
    })

    it('action to contract atomic', async function() {
      let amt = 1 // for unique transactions
      const rsn = Rsn({signProvider})

      const trTest = arisen_token => {
        assert(arisen_token.transfer('inita', 'initb', amt + '.0000 RSN', '') == null)
        assert(arisen_token.transfer('initb', 'inita', (amt++) + '.0000 RSN', '') == null)
      }

      const assertTr = tr =>{
        assert.equal(2, tr.transaction.transaction.actions.length)
      }

      //  contracts can be a string or array
      await assertTr(await rsn.transaction(['arisen.token'], ({arisen_token}) => trTest(arisen_token)))
      await assertTr(await rsn.transaction('arisen.token', arisen_token => trTest(arisen_token)))
    })

    it('action to contract (contract tr nesting)', function () {
      this.timeout(4000)
      const tn = Rsn({signProvider})
      return tn.contract('arisen.token').then(arisen_token => {
        return arisen_token.transaction(tr => {
          tr.transfer('inita', 'initb', '1.0000 RSN', '')
          tr.transfer('inita', 'initc', '2.0000 RSN', '')
        }).then(() => {
          return arisen_token.transfer('inita', 'initb', '3.0000 RSN', '')
        })
      })
    })

    it('multi-action transaction (broadcast)', () => {
      const rsn = Rsn({signProvider})
      return rsn.transaction(tr => {
        assert(tr.transfer('inita', 'initb', '1.0000 RSN', '') == null)
        assert(tr.transfer({from: 'inita', to: 'initc', quantity: '1.0000 RSN', memo: ''}) == null)
      }).then(tr => {
        assert.equal(2, tr.transaction.transaction.actions.length)
      })
    })

    it('multi-action transaction no inner callback', () => {
      const rsn = Rsn({signProvider})
      return rsn.transaction(tr => {
        tr.transfer('inita', 'inita', '1.0000 RSN', '', cb => {})
      })
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/Callback during a transaction/.test(error), error)
      })
    })

    it('multi-action transaction error rollback', () => {
      const rsn = Rsn({signProvider})
      return rsn.transaction(tr => {throw 'rollback'})
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/rollback/.test(error), error)
      })
    })

    it('multi-action transaction Promise.reject rollback', () => {
      const rsn = Rsn({signProvider})
      return rsn.transaction(tr => Promise.reject('rollback'))
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/rollback/.test(error), error)
      })
    })

    it('custom transfer', () => {
      const rsn = Rsn({signProvider})
      return rsn.transaction(
        {
          actions: [
            {
              account: 'arisen',
              name: 'transfer',
              data: {
                from: 'inita',
                to: 'initb',
                quantity: '13.0000 RSN',
                memo: '爱'
              },
              authorization: [{
                actor: 'inita',
                permission: 'active'
              }]
            }
          ]
        },
        {broadcast: false}
      )
    })

    it('custom contract transfer', async function() {
      const rsn = Rsn({signProvider})
      await rsn.contract('currency').then(currency =>
        currency.transfer('currency', 'inita', '1.0000 CUR', '')
      )
    })
  })

  it('Transaction ABI cache', async function() {
    const rsn = Rsn()
    assert.throws(() => rsn.fc.abiCache.abi('arisen'), /not cached/)
    const abi = await rsn.fc.abiCache.abiAsync('arisen')
    assert.deepEqual(abi, await rsn.fc.abiCache.abiAsync('arisen', false/*force*/))
    assert.deepEqual(abi, rsn.fc.abiCache.abi('arisen'))
  })

  it('Transaction ABI lookup', async function() {
    const rsn = Rsn()
    const tx = await rsn.transaction(
      {
        actions: [
          {
            account: 'currency',
            name: 'transfer',
            data: {
              from: 'inita',
              to: 'initb',
              quantity: '13.0000 CUR',
              memo: ''
            },
            authorization: [{
              actor: 'inita',
              permission: 'active'
            }]
          }
        ]
      },
      {sign: false, broadcast: false}
    )
    assert.equal(tx.transaction.transaction.actions[0].account, 'currency')
  })

} // if development

const randomName = () => {
  const name = String(Math.round(Math.random() * 1000000000)).replace(/[0,6-9]/g, '')
  return 'a' + name + '111222333444'.substring(0, 11 - name.length) // always 12 in length
}

const randomAsset = () =>
  ecc.sha256(String(Math.random())).toUpperCase().replace(/[^A-Z]/g, '').substring(0, 7)
