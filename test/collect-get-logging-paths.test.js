const test = require('tap').test
const path = require('path')
const getLoggingPaths = require('../collect/get-logging-paths.js')

test('Collect - logging path - identifier', function (t) {
  const paths = getLoggingPaths({ identifier: 1062 })

  t.strictDeepEqual(paths, {
    '/': '1062.clinic-flame',
    '/systeminfo': path.normalize('1062.clinic-flame/1062.clinic-flame-systeminfo'),
    '/0x-data/': path.normalize('1062.clinic-flame/1062.clinic-flame-0x-data')
  })
  t.end()
})

test('Collect - logging path - path', function (t) {
  const paths = getLoggingPaths({ path: path.normalize('/root/1062.clinic-flame') })

  t.strictDeepEqual(paths, {
    '/': path.normalize('/root/1062.clinic-flame'),
    '/systeminfo': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-systeminfo'),
    '/0x-data/': path.normalize('/root/1062.clinic-flame/1062.clinic-flame-0x-data')
  })
  t.end()
})

test('Collect - logging path - defaults to 0x path templates', function (t) {
  const paths = getLoggingPaths()
  t.strictDeepEqual(paths, {
    '/': path.normalize('{pid}.clinic-flame'),
    '/systeminfo': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-systeminfo'),
    '/0x-data/': path.normalize('{pid}.clinic-flame/{pid}.clinic-flame-0x-data')
  })
  t.end()
})
