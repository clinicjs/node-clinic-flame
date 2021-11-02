const test = require('tap').test
const path = require('path')
const getLoggingPaths = require('../collect/get-logging-paths.js')

test('Collect - logging path - identifier', function (t) {
  const paths = getLoggingPaths({ identifier: 1062 })

  t.strictSame(paths, {
    '/': '1062.clinic-flame',
    '/systeminfo': path.normalize('1062.clinic-flame/1062.clinic-flame-systeminfo'),
    '/samples': path.normalize('1062.clinic-flame/1062.clinic-flame-samples'),
    '/inlinedfunctions': path.normalize('1062.clinic-flame/1062.clinic-flame-inlinedfunctions'),
    '/0x-data/': path.normalize('1062.clinic-flame/1062.clinic-flame-0x-data')
  })
  t.end()
})

test('Collect - logging path - path', function (t) {
  const paths = getLoggingPaths({ path: path.normalize('/root/1062.clinic-flame') })

  t.strictSame(paths, {
    '/': path.normalize('/root/1062.clinic-flame'),
    '/systeminfo': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-systeminfo'),
    '/samples': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-samples'),
    '/inlinedfunctions': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-inlinedfunctions'),
    '/0x-data/': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-0x-data')
  })
  t.end()
})

test('Collect - logging path - supports 0x path templates', function (t) {
  const paths = getLoggingPaths({ identifier: '{pid}' })
  t.strictSame(paths, {
    '/': path.normalize('{pid}.clinic-flame'),
    '/systeminfo': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-systeminfo'),
    '/samples': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-samples'),
    '/inlinedfunctions': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-inlinedfunctions'),
    '/0x-data/': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-0x-data')
  })
  t.end()
})
