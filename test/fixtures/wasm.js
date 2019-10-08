var f = require('murmur3hash-wasm')
var tenKb = require('crypto').randomBytes(10 * 1024)
var start = Date.now()
var result = 0
while (Date.now() < start + 1000) {
  result ^= f(tenKb, Math.floor(Math.random() * (1 << 31)))
}
console.log(result)
