const syncWait = ms => {
  const end = Date.now() + ms
  while (Date.now() < end) continue
}

function delayOneSecond () {
  syncWait(1000)
  console.log('return after one second')
}

function delayTwoSecond () {
  syncWait(2000)
  console.log('return after two seconds')
}

delayOneSecond()
delayTwoSecond()
