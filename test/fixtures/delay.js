const syncWait = ms => {
  const end = Date.now() + ms
  while (Date.now() < end) continue
}

function delayOneSecond () {
  syncWait(1000)
}

function delayTwoSecond () {
  syncWait(2000)
}

delayOneSecond()
delayTwoSecond()
