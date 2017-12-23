const fetch     = require('node-fetch');
const cheerio   = require('cheerio');

const URL = 'https://coinmarketcap.com';
const SELECTOR_COINS    = 'table#currencies tbody tr';
const SELECTOR_MARKETS  = '#markets-table tbody tr';

const coinMarks = (slc = -1) => 
  fetch(URL)
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => $(SELECTOR_COINS).map((i, el) => scrapCoin($(el))).get())
    .then(coins => coins.slice(slc))
    .then(coins => Promise.all(coins.map(coin => {
      return fetch(URL + coin.link)
        .then(res => res.text())
        .then(html => cheerio.load(html))
        .then($ => scrapExtras($, coin))
    })))
    
module.exports = coinMarks;
    
    
  function scrapCoin(el){
    
    const elems = {
      symbol: el.find('span.currency-symbol'),
      link:   el.find('a.currency-name-container'),
      price:  el.find('a.price'),
      cap:    el.find('td.market-cap'),
      logo:   el.find('div.currency-logo-sprite')
    };
    
    return {
      symbol: elems.symbol.text(),
      name:   elems.link.text(),
      link:   elems.link.attr('href'),
      logo:   elems.logo.css('background-image'),
      cap: {
        usd: elems.cap.attr('data-usd'),
        btc: elems.cap.attr('data-btc')
      },
      price: {
        usd: elems.price.attr('data-usd'),
        btc: elems.price.attr('data-btc')
      }
    }
  }
  
  function scrapExtras($, coin){
    const elems = {
      logo: $('img.currency-logo-32x32'),
      web:  $('span.glyphicon.glyphicon-link').next()
    }
    coin.logo = elems.logo.attr('src');
    coin.web  = elems.web && elems.web.attr('href');
    coin.markets = $(SELECTOR_MARKETS).map((i, el) => scrapMarket($(el))).get();
    return coin;
  }
  
  function scrapMarket(el){
    
    const elems = {
      link:     el.find('a').eq(0),
      exchange: el.find('a').eq(1),
      volume:   el.find('span.volume'),
      price:    el.find('span.price'),
      pcvolume: el.find('td').eq(5)
    };
    
    return {
      link:       elems.link.attr('href'),
      name:       elems.link.text(),
      market:     elems.exchange.text(),
      marketLink: elems.exchange.attr('href'),
      volume: {
        usd: elems.volume.attr('data-usd'),
        btc: elems.volume.attr('data-btc'),
        pc:  elems.pcvolume.text()
      },
      price: {
        usd: elems.price.attr('data-usd'),
        btc: elems.price.attr('data-btc')
      }
    }
  }