const cheerio = require("cheerio");
const workSheetsFromFile = require("./source").workSheetsFromFile;
const {saveDataToJSONFile, clearDataFile} = require("./target");
const {createPromiseListByData, createAgentPromise, getContextBySelector} = require("./query");

let querySheetQueue = [];
let finishSheetQueue = [];

async function getIntroCtn(url) {
  const pres = await createAgentPromise(url);
  if (!pres || !pres.text) {
    return "";
  }
  const $result = getContextBySelector(pres.text, '.yxk-detail-con');
  return $result.eq(1).html();
}

async function getCollegesCtn(url) {
  const pres = await createAgentPromise(url);
  if (!pres || !pres.text) {
    return "";
  }
  const data = [];
  const $title = getContextBySelector(pres.text, ".yxk-second-title");
  const $result = getContextBySelector(pres.text, '.yxk-detail-con');
  $title.each((index, item) => {
    const $item = cheerio.load(item);
    const $targetResult = $result.eq(index);
    const key = $item.text();
    const value = !$targetResult.length ? "" : $targetResult.html();
    data.push({key, value})
  })
  return data;
}

async function getMajorCtn(url) {
  const pres = await createAgentPromise(url);
  if (!pres) {
    return "";
  }
  const {host, protocol} = pres.request;
  if (!pres.text) {
    return "";
  }
  const $ = cheerio.load(pres.text);
  const $result = $('.yxk-zyjs-tab');
  return $result.map((index, item) => {
    const $key = $(item).find(".tab-item");
    const $value = $(item).find(".tab-content li a");
    const category = $key.text()
    const list = $value.map((i, el) => {
      try {
        const name = $(el).text();
        const href = $(el).attr("href");
        const text = `${protocol}//${host}${href}`;
        return {name, text};
      } catch (e) {
        throw e;
      }
    }).toArray();
    return {category, list};
  }).toArray();
}

function getAllMajorDetails(majorCtn) {
  const selector = ".ch-table tr:nth-child(2) td:not(.ch-table-right)";
  try {
    const promiseAll = [];
    if (!majorCtn) {
      return Promise.resolve([]);
    }
    majorCtn.forEach((category, categoryIndex) => {
      category.list.forEach((list, listIndex) => {
        const p = createPromiseListByData(list, categoryIndex, listIndex, selector);
        promiseAll.push(p);
      })
    })
    return Promise.all(promiseAll)
  } catch (e) {
    console.log(e);
  }
}

async function finishQueueItem() {
  const finishItem = querySheetQueue.pop();
  finishSheetQueue.push(finishItem);
  console.log("Finish Task Num: ", finishSheetQueue.length);
  if (querySheetQueue.length > 0) {
    return await getSheetQueue();
  } else {
    return true;
  }
}

async function getSheetQueue() {
  try {
    const queueIndex = querySheetQueue.length - 1;
    const queueCurrent = querySheetQueue[queueIndex];
    if (!queueCurrent) {
      return await finishQueueItem();
    }
    const {intro, colleges, major, result} = queueCurrent;
    const pIntroCtn = getIntroCtn(intro);
    const pCollegesCtn = getCollegesCtn(colleges);
    const pMajorCtn = getMajorCtn(major);
    const [introCtn, collegesCtn, majorCtn] =
      await Promise.allSettled([pIntroCtn, pCollegesCtn, pMajorCtn]);
    // console.log(introCtn);
    // console.log(colleges);
    // console.log(collegesCtn);
    // console.log(major);
    // console.log(majorCtn);
    if (introCtn.value) {
      result.intro = introCtn.value;
    }
    if (collegesCtn.value) {
      result.colleges = collegesCtn.value;
    }
    if (majorCtn.value) {
      result.major = majorCtn.value;
      const promiseList = await getAllMajorDetails(majorCtn.value);
      if (promiseList && promiseList.length) {
        promiseList.forEach(({data, categoryIndex, listIndex}) => {
          try {
            result.major[categoryIndex]["list"][listIndex]["text"] = data;
          } catch (e) {
            console.log(e)
          }
        });
      }
    }
    return await finishQueueItem();
  } catch (error) {
    console.log(error)
  }
}

function getSheetData() {
  clearDataFile();
  workSheetsFromFile.forEach(({data}) => {
    querySheetQueue = data.reverse().map((line) => {
      if (line[0] === "字段") {
        return null;
      }
      const school = line[0];
      const intro = line[5];
      const colleges = line[6];
      const major = line[7];
      const result = {
        school,
        intro: "",
        colleges: [],
        major: ""
      };
      return {intro, colleges, major, result};
    });
  });
  getSheetQueue().finally(() => {
    const data = finishSheetQueue.map((item) => item.result);
    saveDataToJSONFile(data);
  });
}

module.exports = {
  getSheetData
}
