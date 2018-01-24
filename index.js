const fetch     = require('node-fetch');
const cheerio   = require('cheerio');

const URL = 'https://coinmarketcap.com';
const SELECTOR_COINS    = 'table#currencies tbody tr';
const SELECTOR_MARKETS  = '#markets-table tbody tr';
const SELECTOR_HISTORY  = 'div#historical-data table tbody tr'
const SELECTOR_EXCHANGE = 'div#markets table tbody tr';
const SELECTOR_ALLCOINS = 'table#currencies-all tbody tr';
const SELECTOR_RECENT   = 'table#trending-recently-added tbody tr';

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

module.exports.single = (coinLink) => 
  fetch(URL + coinLink)
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => scrapSingle($))
    
module.exports.singleHistory = (coinLink) =>
  fetch(URL + coinLink + '/historical-data/?start=20130428&end=' + getHistoryEndDate())
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => scrapSingle($, true))
    
module.exports.exchange = (exchangeLink) =>
  fetch(URL + exchangeLink)
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => $(SELECTOR_EXCHANGE).map((i, el) => scrapExchange($(el))).get())
    .then(arr => arr.filter((pair, index) => pair.name && index === arr.findIndex(p => p.name === pair.name)))
    .then(coins => Promise.all(coins.map(coin => {
      return fetch(URL + coin.link)
        .then(res => res.text())
        .then(html => cheerio.load(html))
        .then($ => scrapSingle($, coin))
    })))
    
module.exports.all = (slc = 0) => 
  fetch(URL + '/all/views/all/')
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => $(SELECTOR_ALLCOINS).map((i, el) => scrapSingleFromAll($(el))).get())
    .then(coins => coins.slice(slc))
    
module.exports.recent = () =>
  fetch(URL + '/new/')
    .then(res => res.text())
    .then(html => cheerio.load(html))
    .then($ => $(SELECTOR_RECENT).map((i, el) => scrapRecent($(el))).get())
    
    
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
  
  function scrapRecent(el){
    const elems = {
      link: el.find('td.currency-name a'),
      img: el.find('td.currency-name img'),
      symbol: el.find('td').eq(1),
      listed: el.find('td').eq(2),
      supply: el.find('td.circulating-supply')
    };
    
    return {
      name:   elems.img.attr('alt'),
      supply: elems.supply.attr('data-supply'),
      listed: daysAgoToTimestamp(elems.listed.text()),
      symbol: elems.symbol.text(),
      link:   elems.link.attr('href'),
      id:     elems.link.attr('href').split('/').filter(v => v.length).pop(),
    }
  }
  
  function scrapSingleFromAll(el){
    const elems = {
      link:   el.find('a.currency-name-container'),
      supply: el.find('td.circulating-supply').children().first(),
      symbol: el.find('td.col-symbol'),
    };
    
    return {
      name:   elems.link.text(),
      supply: parseInt(Number(elems.supply.attr('data-supply'))),
      symbol: elems.symbol.text(),
      link:   elems.link.attr('href'),
      id:     elems.link.attr('href').split('/').filter(v => v.length).pop()
    }
  }
  
  function scrapSingle($, history){
    const elems = {
      symbol: $('h1.text-large small.bold.hidden-xs'),
      // link:   $('a.currency-name-container'),
      rank:   $('span.glyphicon.glyphicon-star').next(),
      price:  $('span#quote_price'),
      cap:    $('span[data-currency-market-cap]'),
      logo:   $('img.currency-logo-32x32'),
      web:    $('span.glyphicon.glyphicon-link').next(),
    };
    
    return scrapExtras($, {
      symbol: elems.symbol.text().replace('(', '').replace(')', ''),
      name:   elems.logo.attr('alt'),
      rank:   elems.rank.text().replace(' Rank ', ''),
      // link:   elems.link.attr('href'),
      logo:   elems.logo.attr('src'),
      cap: {
        usd: elems.cap.attr('data-usd'),
        //btc: elems.cap.attr('data-btc')
      },
      price: {
        usd: elems.price.attr('data-usd'),
        //btc: elems.price.attr('data-btc')
      },
      web: elems.web && elems.web.attr('href')
    }, history)
  }
  
  function scrapHistory(el){
    el = el.find('td');
    const elems = {
      date: el.eq(0),
      open: el.eq(1),
      high: el.eq(2),
      low:  el.eq(3),
      close:  el.eq(4),
      volume: el.eq(5),
      cap:    el.eq(6)
    }
    
    return {
      date: new Date(elems.date.text()).getTime(),
      price: {
        usd: {
          open: Number(elems.open.text()),
          high: Number(elems.high.text()),
          low:  Number(elems.low.text()),
          close: Number(elems.close.text()),
        }
      },
      volume: elems.volume.attr('data-format-value'),
      cap:    elems.cap.attr('data-format-value')
    }
  }
  
  function scrapExchange(el){
    const elems = {
      link: el.find('td a.market-name'),
      price: el.find('td span.price'),
    }
    
    return {
      name: elems.link.text(),
      link: elems.link.attr('href'),
      price: {
        usd: elems.price.attr('data-usd'),
        btc: elems.price.attr('data-btc')
      }
    }
  }
  
  function scrapExtras($, coin, history = false){
    if(!history)
      coin.markets = $(SELECTOR_MARKETS).map((i, el) => scrapMarket($(el))).get();
    else
      coin.history = $(SELECTOR_HISTORY).map((i, el) => scrapHistory($(el))).get();
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
  
  
  function getHistoryEndDate(){
    const currentDate = new Date();
    const arr = [ currentDate.getFullYear() ];
    
    let month = currentDate.getMonth() + 1;
    if(month.length < 2)
      month = '0' + month;
    arr.push(month);
    
    let day = currentDate.getDate();
    if(day.length < 2)
      day = '0' + day;
    arr.push(day);
    
    
    return arr.join('');
  }
  
  function daysAgoToTimestamp(ago){
    ago = ago.toLocaleLowerCase();
    if(ago === 'today')
      return new Date().getTime();
      
    return new Date().setDate(new Date().getDate() - parseInt(ago));
  }