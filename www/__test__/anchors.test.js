const fs = require('fs');
const path = require('path');

const cheerio = require('cheerio');

const $ = cheerio.load(fs.readFileSync(path.join('_site', 'index.html')));

function escapeRegExp(string) {
  return string.replace(/[.*+?^$%&{}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

describe('each anchor link should have a corresponding anchor', () => {
  $('a').each(function (i, link) {
    const href = $(link).attr('href');
    // link must include # and must not be an external link
    if (href.includes('#') && !href.includes('https://') && !href.includes('http://')) {
      // let's try to only get the #ID selector by removing anything else
      let anchor = escapeRegExp(href.slice(href.indexOf('#')));

      test(`there is a link to ${href} so expect there to be an item with the ID ${anchor} on the page`, () => {
        expect($(anchor).length).toBe(1);
      });
    }
  });
});
