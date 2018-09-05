# node-clinic-flame

[![npm version][npm-version]][npm-url] [![Stability Stable][stability-stable]][stability-docs]
[![Downloads][npm-downloads]][npm-url] [![Code style][lint-standard]][lint-standard-url]

Programmable interface to [clinic][clinic-url] flame. Learn more about clinic: https://clinicjs.org/

## Example

```js
const ClinicFlame = require('@nearform/flame')
const flame = new ClinicFlame()

flame.collect(['node', './path-to-script.js'], function (err, filepath) {
  if (err) throw err

  flame.visualize(filepath, filepath + '.html', function (err) {
    if (err) throw err
  })
})
```

## Documentation

```js
const ClinicFlame = require('@nearform/flame')
const flame = new ClinicFlame()
```

#### `flame.collect(args, callback)`

Starts a process by using [0x](https://github.com/davidmarkclements/0x)

0x will produce a file in the current working directory, with the process PID in its filename. The filepath relative to the current working directory will be the value in the callback.

stdout, stderr, and stdin will be relayed to the calling process. As will the `SIGINT` event.

#### `flame.visualize(dataFilename, outputFilename, callback)`

Will consume the datafile specified by `dataFilename`, this datafile will be produced by the sampler using `flame.collect`.

`flame.visualize` will then output a standalone HTML file to `outputFilename`. When completed the `callback` will be called with no extra arguments, except a possible error.

## License
[GPL 3.0](LICENSE)

[stability-stable]: https://img.shields.io/badge/stability-stable-green.svg?style=flat-square
[stability-docs]: https://nodejs.org/api/documentation.html#documentation_stability_index
[npm-version]: https://img.shields.io/npm/v/@nearform/flame.svg?style=flat-square
[npm-url]: https://www.npmjs.org/@nearform/flame
[npm-downloads]: http://img.shields.io/npm/dm/@nearform/flame.svg?style=flat-square
[lint-standard]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[lint-standard-url]: https://github.com/feross/standard
[clinic-url]: https://github.com/nearform/node-clinic
