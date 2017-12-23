const puppeteer = require('puppeteer');


const SELECTOR_CURRENCY_SWITCH  = '#currency-switch-button';
const SELECTOR_CURRENCY_BTC     = ".price-toggle[data-currency='btc']";

async function run(){
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({width: 1000, height: 5000})

  await page.goto('https://coinmarketcap.com/');
  await page.click(SELECTOR_CURRENCY_SWITCH);
  await page.click(SELECTOR_CURRENCY_BTC);
  await page.waitFor(1000);
  
  let links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table#currencies tbody tr')).map((elem) => {
        let elems = {
          link:   elem.children[1].children[2],
          //symbol: elem.children[1].children[1],
          //cap:    elem.children[2],
          //price:  elem.children[3].children[0]
        }
        //console.log(elem);
        return {
          link:   elems.link.href,
          //name:   elems.link.textContent,
          //symbol: elems.symbol.textContent,
          //cap:    elems.cap.textContent,
          //price:  elems.price.textContent,
        }
          
        //return elem.getElementsByClassName('.currency-name')[0].textContent;
      });
  });
  console.log(links);
  
  
  await page.screenshot({ path: 'imgs/coin.png' });

  browser.close();
}