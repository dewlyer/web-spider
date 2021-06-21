const cheerio = require("cheerio");
const workSheetsFromFile = require("./source").workSheetsFromFile;
const {saveDataToJSONFile, clearDataFile} = require("./target");
const {createPromiseListByData, createAgentPromise, getContextBySelector} = require("./query");

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
    // if (href) {
    //   const p = await createAgentPromise(href);
    //   if (p && p.text) {
    //     text = getContextBySelector(pres.text, '.ch-table td:not(.ch-table-right))');
    //   }
    // }
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

function getSheetData() {
  let processIndex = 0;
  clearDataFile();
  workSheetsFromFile.forEach(({data}) => {
    data.forEach((line, index) => {
      if (index > 2) {
        return;
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
      Promise.all([getIntroCtn(intro), getCollegesCtn(colleges), getMajorCtn(major)])
        .then(([introCtn, collegesCtn, majorCtn]) => {
          // console.log(introCtn);
          // console.log(colleges);
          // console.log(collegesCtn);
          // console.log(major);
          // console.log(majorCtn);
          result.intro = introCtn;
          result.colleges = collegesCtn;
          result.major = majorCtn;
          return getAllMajorDetails(majorCtn);
        })
        .then(promiseList => {
          promiseList.forEach(({data, categoryIndex, listIndex}) => {
            try {
              result.major[categoryIndex]["list"][listIndex]["text"] = data;
            } catch (e) {
              console.log(e)
            }
          })
        })
        .catch((error) => console.log(error))
        .finally(() => {
          saveDataToJSONFile(result)
          processIndex++;
          console.log(`web spider process end: index ${processIndex}`)
        });
    });
  });
}

module.exports = {
  getSheetData
}
