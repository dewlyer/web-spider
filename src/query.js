const superagent = require('superagent');
const cheerio = require("cheerio");

async function createPromiseListByData(list, categoryIndex, listIndex, selector) {
  const promise = {
    data: "",
    categoryIndex,
    listIndex
  }
  const p = await createAgentPromise(list.text)
  if (!p || !p.text) {
    return promise;
  }
  const r = getContextBySelector(p.text, selector);
  promise.data = r.html();
  return promise;
}

function getContextBySelector(text, selector) {
  const $ = cheerio.load(text);
  return $(selector);
}

function createAgentPromise(url) {
  return new Promise(resolve => {
    superagent.get(url).end((err, pres) => resolve(pres));
  });
}

module.exports = {
  createPromiseListByData,
  getContextBySelector,
  createAgentPromise
}
