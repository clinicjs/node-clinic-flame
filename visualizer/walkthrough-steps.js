const link = require('@nearform/clinic-common/base/link.js')

const matchImg = require('./assets/images/pexels-photo-750225')
const octopusImg = require('./assets/images/cdba9817085171.562b56f8b69cd')

const docs = link({
  label: 'Docs',
  href: 'https://clinicjs.org/documentation/flame/',
  target: '_blank',
  rightIcon: `<svg style="width:20px; margin-right: 5px;" class="Icon__Svg-sc-1vaf90b-0 ekOBdq" viewBox="0 0 64 64" fill="currentColor"><path d="M42,21.13H23.37a1,1,0,0,0-1,1V40.75a1,1,0,0,0,1,1H42a1,1,0,0,0,1-1V32.88H33.85a1.46,1.46,0,1,1,0-2.91H43V22.1A1,1,0,0,0,42,21.13Z"></path><path d="M60.23,21.21A8.58,8.58,0,0,0,56,14.75C48.93,10.42,42,6,35.45,2a6.38,6.38,0,0,0-6.9,0C22,6,15.07,10.45,8,14.75a8.63,8.63,0,0,0-4.21,6.46,165.32,165.32,0,0,0,0,21.58A8.58,8.58,0,0,0,8,49.25C15.07,53.55,22,58,28.55,62a6.38,6.38,0,0,0,6.9,0C42,58,48.93,53.55,56,49.25a8.5,8.5,0,0,0,4.21-6.46A165.32,165.32,0,0,0,60.23,21.21ZM45.9,40.75A3.88,3.88,0,0,1,42,44.63H23.37a3.88,3.88,0,0,1-3.87-3.88V22.1a3.88,3.88,0,0,1,3.87-3.88H42A3.88,3.88,0,0,1,45.9,22.1Z"></path></svg>`
})

const flame = `<svg style="width:40px" class="Icon__Svg-sc-1vaf90b-0 ekOBdq" viewBox="0 0 64 64" fill="#ffaa2b"><path d="M61.23,21.21A8.58,8.58,0,0,0,57,14.75C49.93,10.42,43,6,36.45,2a6.38,6.38,0,0,0-6.9,0C23,6,16.07,10.45,9,14.75a8.63,8.63,0,0,0-4.21,6.46,165.32,165.32,0,0,0,0,21.58A8.58,8.58,0,0,0,9,49.25C16.07,53.55,23,58,29.55,62a6.38,6.38,0,0,0,6.9,0C43,58,49.93,53.55,57,49.25a8.5,8.5,0,0,0,4.21-6.46A165.32,165.32,0,0,0,61.23,21.21Zm-21-2.77H42.2a1.45,1.45,0,1,1,0,2.9H40.26a1.45,1.45,0,1,1,0-2.9Zm0,5.81h5.82a1.46,1.46,0,0,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91Zm0,5.81h5.82a1.46,1.46,0,0,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91Zm0,5.81H49a1.46,1.46,0,1,1,0,2.91H40.26a1.46,1.46,0,0,1,0-2.91ZM16.05,24.25h3.87a1.46,1.46,0,0,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91Zm0,5.81H27.67a1.46,1.46,0,0,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91Zm0,5.81H32.51a1.46,1.46,0,1,1,0,2.91H16.05a1.46,1.46,0,1,1,0-2.91ZM49,44.59H16.05a1.45,1.45,0,1,1,0-2.9H49a1.45,1.45,0,1,1,0,2.9Z"></path></svg>`
const WalkthroughSteps = [
  {
    msg: `
    <div>
      <div class="welcome-step">
        ${flame}
        Hello, and welcome to Flame!
        </div>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </div>
    `
  },
  {
    attachTo: '#flame-main',
    msg: `
    <div>
      <div class="welcome-step">
        ${flame}
        Hello, and welcome to Flame!
        </div>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </div>
    `
  },
  {
    attachTo: '#selection-controls .hotness-selector:nth-child(1)',
    msg: `
    <div>
      <p>Do you like Flame?</p>
      <img style="width:370px; height: 207px; display:block;" src="${matchImg}" />
      ${docs.outerHTML}
    </div>`
  },
  {
    attachTo: '#selection-controls .hotness-selector:nth-child(4)',
    msg: `
    <div>
      <p>This is just another example :)</p>
      <div class="scrollable scroll-container">
        <p>Some looong content</p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        <img style="width:330px; height: 247px; display:block;" src="${octopusImg}" />
      </div>
      ${docs.outerHTML}
    </div>`
  },
  {
    attachTo: '#search-box',
    msg: `
    <div class="">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      <iframe width="437" height="246" src="https://www.youtube.com/embed/KvVCafGmrWA" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      ${docs.outerHTML}
    </div>`
  },
  {
    attachTo: '.walkthrough-button',
    msg: `
    <div>
      <p>This is just another example :)</p>
      <div class="scrollable scroll-container">
        <p>Some looong content</p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        <img style="width:343px; height: 257px; display:block;" src="${octopusImg}" />
      </div>
      ${docs.outerHTML}
    </div>`
  }
]

module.exports = WalkthroughSteps
