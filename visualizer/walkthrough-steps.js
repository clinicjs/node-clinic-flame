const link = require('@clinic/clinic-common/base/link.js')

const docs = link({
  label: 'Clinic Flame Documentation',
  href: 'https://clinicjs.org/documentation/flame/',
  target: '_blank',
  leftIcon: '<svg style="width: 20px; margin-right: 0px;" class="icon" viewBox="0 0 64 64" fill="currentColor"><path d="M42,21.13H23.37a1,1,0,0,0-1,1V40.75a1,1,0,0,0,1,1H42a1,1,0,0,0,1-1V32.88H33.85a1.46,1.46,0,1,1,0-2.91H43V22.1A1,1,0,0,0,42,21.13Z"></path><path d="M60.23,21.21A8.58,8.58,0,0,0,56,14.75C48.93,10.42,42,6,35.45,2a6.38,6.38,0,0,0-6.9,0C22,6,15.07,10.45,8,14.75a8.63,8.63,0,0,0-4.21,6.46,165.32,165.32,0,0,0,0,21.58A8.58,8.58,0,0,0,8,49.25C15.07,53.55,22,58,28.55,62a6.38,6.38,0,0,0,6.9,0C42,58,48.93,53.55,56,49.25a8.5,8.5,0,0,0,4.21-6.46A165.32,165.32,0,0,0,60.23,21.21ZM45.9,40.75A3.88,3.88,0,0,1,42,44.63H23.37a3.88,3.88,0,0,1-3.87-3.88V22.1a3.88,3.88,0,0,1,3.87-3.88H42A3.88,3.88,0,0,1,45.9,22.1Z"></path></svg>'
})

const flame = '<svg style="width:40px; margin: -4px 8px 0 -4px;" class="icon" viewBox="0 0 64 64" fill="#ffaa2b"><path d="M61.23,21.21A8.58,8.58,0,0,0,57,14.75C49.93,10.42,43,6,36.45,2a6.38,6.38,0,0,0-6.9,0C23,6,16.07,10.45,9,14.75a8.63,8.63,0,0,0-4.21,6.46,165.32,165.32,0,0,0,0,21.58A8.58,8.58,0,0,0,9,49.25C16.07,53.55,23,58,29.55,62a6.38,6.38,0,0,0,6.9,0C43,58,49.93,53.55,57,49.25a8.5,8.5,0,0,0,4.21-6.46A165.32,165.32,0,0,0,61.23,21.21Zm-21-2.77H42.2a1.45,1.45,0,1,1,0,2.9H40.26a1.45,1.45,0,1,1,0-2.9Zm0,5.81h5.82a1.46,1.46,0,0,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91Zm0,5.81h5.82a1.46,1.46,0,0,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91Zm0,5.81H49a1.46,1.46,0,1,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91ZM16.05,24.25h3.87a1.46,1.46,0,0,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91Zm0,5.81H27.67a1.46,1.46,0,0,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91Zm0,5.81H32.51a1.46,1.46,0,1,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91ZM49,44.59H16.05a1.45,1.45,0,1,1,0-2.9H49a1.45,1.45,0,1,1,0,2.9Z"></path></svg>'
const WalkthroughSteps = [
  {
    attachTo: '#flame-main',
    msg: `
    <div>
      <h4 class="welcome-step">
        ${flame}
        Welcome to Clinic.js Flame!
      </h4>
      <p>This is a Flamegraph. Each block represents the time spent executing calls to a function. The wider the block, the more time was spent.</p>
      <p>Blocks sit on the function that called them, so the stack below each block shows its stack trace.</p>
      <p>Double clicking on a block will expand it and its children.</p>
    </div>
    `
  },
  {
    attachTo: '#flame-main .highlighter-box',
    msg: `
    <div>
      <h4>A hot function</h4>
      <p>This is a "hot" function - a lot of time was spent at the top of the stack, running the code inside this function. The brighter the colour on the exposed top of a block, the "hotter" it is compared to the rest of the profile.</p>
      <p>This might signify a problem: for example, it might be a slow function that can be optimised, or that is called very many times by functions below it.</p>
    </div>`
  },
  {
    attachTo: '#toolbar',
    msg: `
    <div>
      <h4>About this function</h4>
      <p>The "hottest" function in the profile is selected by default.</p>
      <p>Here, we can see the function name and file location (or equivalent), so we can inspect the underlying code and decide if this function is something we can and should optimise.</p>
    </div>`
  },
  {
    attachTo: '#selection-controls',
    msg: `
    <div>
      <h4>Selection controls</h4>
      <p>One good way to start using a Clinic.js Flame profile is to cycle through the "hottest" frames in order. Then, for each one, we can look down the stack and work out why a relatively high amount of time is spent here.</p>
      <p>These buttons locate and select the next or previous hottest block in the flamegraph.</p>
    </div>`
  },
  {
    attachTo: '#stack-bar',
    msg: `
    <div>
      <h4>Functions by heat</h4>
      <p>This bar shows the "heat" of every block (the time spent in that function and not any functions it calls), in order; and shows where the currently selected block sits in this ranking.</p>
      <p>Moving to the next hottest block using the selection controls below moves this selection one block to the right.</p>
    </div>`
  },
  {
    attachTo: '#filters-bar .center-col',
    msg: `
    <div>
      <h4>Functions by code area</h4>
      <p>Blocks are colour-coded by position in the Node.js application's architecture:</p>
      <ul>
        <li>Functions from this application's own code are highlighted in white</li>
        <li>Dependencies in node_modules are blue</li>
        <li>Calls to Node.js APIs are shown in grey</li>
        <li>Activity in the <a href="https://clinicjs.org/documentation/flame/09-advanced-controls/#v8">V8 JavaScript engine</a>
          is hidden by default, to reduce complexity</li>
      </ul>
      <p>These code areas can be hidden or shown using these checkboxes.</p>
    </div>`
  },
  {
    attachTo: '#filters-bar .right-col',
    msg: `
    <div>
      <h4>Advanced options</h4>
      <p>Typing part of a function name, file path or equivalent into this search box highlights every matching block.</p>
      <p>Advanced options can also be accessed here.</p>
      <p>For more infomation and detailed walkthroughs, see:</p> ${docs.outerHTML}
   </div>`
  }
]

module.exports = WalkthroughSteps
