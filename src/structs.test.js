/* eslint-env mocha */
const assert = require('assert')
const Fcbuffer = require('fcbuffer')
const ByteBuffer = require('bytebuffer')

const Rsn = require('.')

describe('shorthand', () => {

  it('authority', () => {
    const rsn = Rsn()
    const {authority} = rsn.fc.structs

    const pubkey = 'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    const auth = {threshold: 1, keys: [{key: pubkey, weight: 1}]}

    assert.deepEqual(authority.fromObject(pubkey), auth)
    assert.deepEqual(
      authority.fromObject(auth),
      Object.assign({}, auth, {accounts: [], waits: []})
    )
  })

  it('PublicKey sorting', () => {
    const rsn = Rsn()
    const {authority} = rsn.fc.structs

    const pubkeys = [
      'RSN7wBGPvBgRVa4wQN2zm5CjgBF6S7tP7R3JavtSa2unHUoVQGhey',
      'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    ]

    const authSorted = {threshold: 1, keys: [
      {key: pubkeys[1], weight: 1},
      {key: pubkeys[0], weight: 1}
    ], accounts: [], waits: []}

    const authUnsorted = {threshold: 1, keys: [
      {key: pubkeys[0], weight: 1},
      {key: pubkeys[1], weight: 1}
    ], accounts: [], waits: []}

    // assert.deepEqual(authority.fromObject(pubkey), auth)
    assert.deepEqual(authority.fromObject(authUnsorted), authSorted)
  })

  it('public_key', () => {
    const rsn = Rsn()
    const {structs, types} = rsn.fc
    const PublicKeyType = types.public_key()
    const pubkey = 'RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    // 02c0ded2bc1f1305fb0faac5e6c03ee3a1924234985427b6167ca569d13df435cf
    assertSerializer(PublicKeyType, pubkey)
  })

  it('symbol', () => {
    const rsn = Rsn()
    const {types} = rsn.fc
    const Symbol = types.symbol()
    assertSerializer(Symbol, '4,RIX', '4,RIX', 'RIX')
  })

  it('extended_symbol', () => {
    const rsn = Rsn({defaults: true})
    const esType = rsn.fc.types.extended_symbol()
    // const esString = esType.toObject()
    assertSerializer(esType, '4,RIX@contract')
  })

  it('asset', () => {
    const rsn = Rsn()
    const {types} = rsn.fc
    const aType = types.asset()
    assertSerializer(aType, '1.0001 RIX')
  })

  it('extended_asset', () => {
    const rsn = Rsn({defaults: true})
    const eaType = rsn.fc.types.extended_asset()
    assertSerializer(eaType, eaType.toObject())
  })

  it('signature', () => {
    const rsn = Rsn()
    const {types} = rsn.fc
    const SignatureType = types.signature()
    const signatureString = 'SIG_K1_JwxtqesXpPdaZB9fdoVyzmbWkd8tuX742EQfnQNexTBfqryt2nn9PomT5xwsVnUB4m7KqTgTBQKYf2FTYbhkB5c7Kk9EsH'
    //const signatureString = 'SIG_K1_Jzdpi5RCzHLGsQbpGhndXBzcFs8vT5LHAtWLMxPzBdwRHSmJkcCdVu6oqPUQn1hbGUdErHvxtdSTS1YA73BThQFwV1v4G5'
    assertSerializer(SignatureType, signatureString)
  })

})

if(process.env['NODE_ENV'] === 'development') {

  describe('Rsnio Abi', () => {

    it('Rsnio token contract parses', (done) => {
      const rsn = Rsn()

      rsn.contract('arisen.token', (error, arisen_token) => {
        assert(!error, error)
        assert(arisen_token.transfer, 'arisen.token contract')
        assert(arisen_token.issue, 'arisen.token contract')
        done()
      })
    })

  })
}

describe('Action.data', () => {
  it('json', () => {
    const rsn = Rsn({forceActionDataHex: false})
    const {structs, types} = rsn.fc
    const value = {
      account: 'arisen.token',
      name: 'transfer',
      data: {
        from: 'inita',
        to: 'initb',
        quantity: '1.0000 RIX',
        memo: ''
      },
      authorization: []
    }
    assertSerializer(structs.action, value)
  })

  it('force hex', () => {
    const rsn = Rsn({forceActionDataHex: true})
    const {structs, types} = rsn.fc
    const value = {
      account: 'arisen.token',
      name: 'transfer',
      data: {
        from: 'inita',
        to: 'initb',
        quantity: '1.0000 RIX',
        memo: ''
      },
      authorization: []
    }
    assertSerializer(structs.action, value, value)
  })

  it('unknown type', () => {
    const rsn = Rsn({forceActionDataHex: false})
    const {structs, types} = rsn.fc
    const value = {
      account: 'arisen.token',
      name: 'mytype',
      data: '030a0b0c',
      authorization: []
    }
    assertSerializer(structs.action, value)
  })
})

function assertSerializer (type, value, fromObjectResult = null, toObjectResult = fromObjectResult) {
  const obj = type.fromObject(value) // tests fromObject
  const buf = Fcbuffer.toBuffer(type, value) // tests appendByteBuffer
  const obj2 = Fcbuffer.fromBuffer(type, buf) // tests fromByteBuffer
  const obj3 = type.toObject(obj) // tests toObject

  if(!fromObjectResult && !toObjectResult) {
    assert.deepEqual(value, obj3, 'serialize object')
    assert.deepEqual(obj3, obj2, 'serialize buffer')
    return
  }

  if(fromObjectResult) {
    assert(fromObjectResult, obj, 'fromObjectResult')
    assert(fromObjectResult, obj2, 'fromObjectResult')
  }

  if(toObjectResult) {
    assert(toObjectResult, obj3, 'toObjectResult')
  }
}
