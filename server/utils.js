const jieba = require("nodejieba");
//概率检索算法
function getCorrelationByBm25(keywordList, data, keyCut) {
    const b = 0.75;
    const k1 = 1.5;
    let ave = 0;
    const keyMap = {};
    for (let i = 0; i < keyCut.length; i++) {
        const key = keyCut[i];
        if (keyMap[key]) {
            keyMap[key] = keyMap[key] + 1;
        } else {
            keyMap[key] = 1;
        }
    }
    for (let i = 0; i < data.length; i++) {
        ave += (data[i]?.all || "").length;
    }
    ave = parseInt(ave / data.length);
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < keywordList.length; j++) {
            sum += getRelation(keywordList[j], data[i], keyMap, { k1, b, ave, queryLength: keyCut.length });
        }
        // console.log("sum", sum);
        data[i].bm25 = sum;
    }
    return data;
}
function getRelation(item, data, keyMap, { k1, b, ave, queryLength }) {
    const k = k1 * (1 - b + b * ((data?.all?.length || 0) / ave));
    const wordTime = (data?.fenciMap?.[item?.word] || 0) / (data.length || 1);
    const sd = ((k1 + 1) * wordTime) / (k + wordTime);
    const queryTime = (keyMap[item?.word] || 0) / queryLength;
    const sq = ((k1 + 1) * queryTime) / (k1 * queryTime);
    // console.log(sd, sq, item.weight, sd * sq * item.weight);
    return sd * sq * item.weight;
}

//布尔检索算法
function getKeyfromQuerFormulation(keyword = "") {
    try {
        const sign1 = ["&", "|", "(", ")"];
        const sign1List = [];
        const sign2List = [];
        let str = "";
        for (let i = 0; i < keyword.length; i++) {
            if (!sign1.includes(keyword[i])) {
                str += keyword[i];
            } else {
                str && sign1List.push(str);
                if (keyword[i] === "(" || keyword[i] === ")") {
                    sign1List.push(keyword[i]);
                }
                str = "";
            }
            if (sign1.includes(keyword[i])) sign2List.push(keyword[i]);
        }
        str && sign1List.push(str);
        const c1 = getCaculateList(sign1List);
        const c2 = getCaculateList(sign2List);
        return getFindWord(c1, c2);
    } catch (error) {
        console.log(error);
    }
}

function getFindWord(c1, c2) {
    try {
        const map = {
            "|": "$or",
            "&": "$and",
        };
        let left = c1.shift();
        if (c1.length !== c2.length) return;
        if (c1.length === 0) {
            return left[0] === "!"
                ? { "keyword.word": { $not: { $in: [left.slice(1)] } } }
                : { "keyword.word": { $in: [left] } };
        }
        for (let i = 0; i < c1.length; i++) {
            const sign = c2[i];
            const right = c1[i];
            const obj = {
                [map[sign]]: [
                    typeof left === "string"
                        ? left[0] === "!"
                            ? { "keyword.word": { $not: { $in: [left.slice(1)] } } }
                            : { "keyword.word": { $in: [left] } }
                        : left,
                    right[0] === "!"
                        ? { "keyword.word": { $not: { $in: [right.slice(1)] } } }
                        : { "keyword.word": { $in: [right] } },
                ],
            };
            left = obj;
        }
        return left;
    } catch (error) {
        console.log(error);
        return {};
    }
}

function getCaculateList(list) {
    const middle = [];
    const res = [];
    for (let i = 0; i < list.length; i++) {
        if (list[i] !== ")") {
            middle.push(list[i]);
        } else {
            const index = middle.lastIndexOf("(");
            const data = middle.splice(index);
            data.shift();
            res.push(...data);
        }
    }
    res.push(...middle);
    return res;
}

//向量检索算法
function getSimilarity(search, data) {
    const searchKeyList = (search || []).map(item => item.word);
    return data.map(item => {
        const keywordList = item.keyword.filter(item => (searchKeyList || []).includes(item.word));
        const similarity = getSimilaritybyPearson(search, keywordList);
        return {
            title: item.title,
            // keyword: item.keyword,
            content: item.content,
            similarity,
        };
    });
}

function getSimilaritybyPearson(search = [], item = []) {
    const len = search.length;
    let averageSearch = 0,
        averageItem = 0;
    for (let i = 0; i < len; i++) {
        averageSearch += search[i]?.weight || 0;
        averageItem += item[i]?.weight || 0;
    }
    averageSearch = averageSearch / len;
    averageItem = averageItem / len;
    let sumX = 0,
        sumY = 0,
        sumXY = 0;
    for (let i = 0; i < len; i++) {
        const x = search[i]?.weight || 0 - averageSearch;
        const y = item[i]?.weight || 0 - averageItem;
        sumXY += x * y;
        sumX += Math.pow(x, 2);
        sumY += Math.pow(y, 2);
    }
    return sumXY / Math.sqrt(sumX * sumY);
}

//机器学习预测向量值
function getPredictionMatrix({ old_matrix, k, lr, lamda }) {
    const len = old_matrix[0].length;
    const dimension = old_matrix.length;
    const p = initRandomArray(dimension, k);
    const q = initRandomArray(len, k);
    for (let times = 0; times < 200; times += 1) {
        for (let m = 0; m < dimension; m += 1) {
            for (let n = 0; n < len; n++) {
                const real_value = old_matrix[m][n];
                if (real_value !== 0) {
                    const error = getError(real_value, p[m], q[n]);
                    resize(p[m], lr, error, q[n], lamda);
                    resize(q[n], lr, error, p[m], lamda);
                }
            }
        }
    }
    const res = [];
    for (let m = 0; m < dimension; m += 1) {
        const dimensionList = [];
        for (let n = 0; n < len; n += 1) {
            let value = 0;
            const pm = p[m];
            const qn = q[n];
            for (let i = 0; i < k; i++) {
                value += pm[i] * qn[i];
            }
            dimensionList.push(Number(value.toFixed(2)));
        }
        res.push(dimensionList);
    }
    return res;
}

function resize(list, lr, error, list2, lamda = 0) {
    const k = list.length;
    for (let i = 0; i < k; i += 1) {
        list[i] -= lr * 2 * (-error * list2[i] + lamda * list[i]);
    }
}

function getError(real_value, pm, qn) {
    const len = pm.length;
    let prediction = 0;
    for (let i = 0; i < len; i += 1) {
        prediction += pm[i] * qn[i];
    }
    return real_value - prediction;
}

function initRandomArray(a, b) {
    const list = [];
    for (let i = 0; i < a; i += 1) {
        const listK = [];
        for (let j = 0; j < b; j += 1) {
            listK.push(Math.random());
        }
        list.push(listK);
    }
    return list;
}

module.exports = {
    getSimilarity,
    getKeyfromQuerFormulation,
    getCorrelationByBm25,
};
