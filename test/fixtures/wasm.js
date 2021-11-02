const f = require('murmur3hash-wasm')
const tenKb = require('crypto').randomBytes(10 * 1024)
const start = Date.now()
let result = 0
while (Date.now() < start + 1000) {
  result ^= f(tenKb, Math.floor(Math.random() * (1 << 31)))
}
console.log(result)
