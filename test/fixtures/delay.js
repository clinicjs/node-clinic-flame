const syncWait = ms => {
  const end = Date.now() + ms
  while (Date.now() < end) continue
}

function delayOneSecond () {
  syncWait(1000)
  console.log('return after one second')
  return false
}

function delayTwoSecond () {
  syncWait(2000)
  console.log('return after two seconds')
  return false
}

delayOneSecond()
delayTwoSecond()
