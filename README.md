# node-clinic-flame

Programmable interface to clinic flame. Learn more about clinic: https://clinicjs.org/

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

