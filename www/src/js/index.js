/**
 * Debounce functions for better performance
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Function} fn The function to debounce
 */
function debounce(fn) {
  // Setup a timer
  var timeout;
  // Return a function to run debounced
  return function () {
    // Setup the arguments
    var context = this;
    var args = arguments;
    // If there's a timer, cancel it
    if (timeout) {
      window.cancelAnimationFrame(timeout);
    }
    // Setup the new requestAnimationFrame()
    timeout = window.requestAnimationFrame(function () {
      fn.apply(context, args);
    });
  };
}

function isScrolledIntoView(el) {
  const rect = el.getBoundingClientRect();
  const elemTop = rect.top;
  const elemBottom = rect.bottom;
  // Only completely visible elements return true:
  // var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
  // Partially visible elements return true:
  const isVisible = elemTop < window.innerHeight && elemBottom >= 0;
  return isVisible;
}

function setActiveToc() {
  const PADDING_TOP = 64;

  if (!tableOfContentsEl) {
    return;
  }
  for (const el of document.querySelectorAll('h2, h3, h4')) {
    if (!isScrolledIntoView(el)) {
      continue;
    }

    const elId = el.id;
    const href = `#${elId}`;
    tableOfContentsEl.querySelectorAll(`a.active`).forEach((aEl) => {
      if (aEl.getAttribute('href') !== href) aEl.classList.remove('active');
    });

    const tocEl = tableOfContentsEl.querySelector(`a[href="${href}"]`);
    // only add the active class once, which will also prevent scroll from re-triggering while scrolling to the same element
    if (!tocEl || tocEl.classList.contains('active')) {
      return;
    }
    tocEl.classList.add('active');

    // // update nav on desktop
    // if (window.innerWidth >= 860) {
    //   tocEl.scrollIntoView({behavior: 'smooth'});
    // }
      //   {
      //   top:
      //     tocEl.getBoundingClientRect().top + gridTocEl.scrollTop - PADDING_TOP,
      //   behavior: 'smooth',
      // });
    return;
  }
}

const gridBodyEl = document.getElementById('grid-body');
const tableOfContentsEl = document.querySelector('.sub-navigation .toc');
const gridTocEl = document.querySelector('.grid-toc');
gridBodyEl.addEventListener('scroll', debounce(setActiveToc));
window.addEventListener('scroll', debounce(setActiveToc));

document.getElementById('toc-drawer-button').addEventListener('click', (e) => {
  e.preventDefault();
  /*If hidden-mobile class is enabled that means we are on desktop do overflow normal but we
    if we are at mobile fixed body position, so that its not scrollable(which currently causing bug) and navbar  handling its
    owns scroll. Case to consider there are chance use can open navbar using toggle button and user when click on any link
    body postion should be unset
    */
  const ishiddenMobileClassEnabled = gridTocEl.classList.toggle(
    'hidden-mobile',
  );
});
gridTocEl.addEventListener('click', (e) => {
  gridTocEl.classList.add('hidden-mobile');
  document.body.style.position = '';
});
/* May not be needed:
  window.addEventListener('DOMContentLoaded', (event) => {
    if (!window.location.hash) {
      return;
    }
    const elNeedingScroll = document.getElementById(window.location.hash.substring(1));
    if (!elNeedingScroll) {
      return;
    }
    elNeedingScroll.scrollIntoView();
    elNeedingScroll.classList.add('highlighted');
  });
  */

window.addEventListener('DOMContentLoaded', (event) => {
  if (!tableOfContentsEl) {
    return;
  }
  setActiveToc();
  document
    .querySelectorAll('.markdown-body h3, .markdown-body h4')
    .forEach((headerEl) => {
      const linkEl = document.createElement('a');
      // linkEl.setAttribute('target', "_blank");
      linkEl.setAttribute('href', '#' + headerEl.id);
      linkEl.classList.add('header-link');
      linkEl.innerText = '#';
      headerEl.appendChild(linkEl);
    });
});


// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
