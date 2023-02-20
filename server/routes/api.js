const Router = require("koa-router");
const jieba = require("nodejieba");
const { getSimilarity, getKeyfromQuerFormulation, getCorrelationByBm25 } = require("../utils");
const { msgModel } = require("../schema/msg.schema");

const router = new Router({
    prefix: "/api",
});

router
    .post("/searchByProbability", async ctx => {
        try {
            const { keyword } = ctx.request.body;
            const keywordList = jieba.extract(keyword, 10);
            const { data, total, code, msg } = await msgModel.find({
                "keyword.word": { $in: keywordList.map(item => item.word) },
            });
            const exclude = ["，", ",", "：", ":", "“", "。", "”", "、", "；", " ", "！", "？", "　", "\n"];
            const res = getCorrelationByBm25(
                keywordList,
                data.map(item => {
                    const str = `${item.title}${item.title}${item.content}`;
                    const fenci = jieba.cut(str).filter(item => !exclude.includes(item));
                    const fenciMap = {};
                    for (let i = 0; i < fenci.length; i++) {
                        const key = fenci[i];
                        if (fenciMap[key]) {
                            fenciMap[key] = fenciMap[key] + 1;
                        } else {
                            fenciMap[key] = 1;
                        }
                    }
                    return {
                        title: item.title,
                        keyword: item.keyword,
                        content: item.content,
                        all: `${item.title}${item.title}${item.content}`,
                        length: fenci.length,
                        fenciMap,
                    };
                }),
                jieba.cut(keyword).filter(item => !exclude.includes(item))
            );
            // console.log(res);
            ctx.response.body = {
                code: "success",
                msg: "返回概率检索完毕",
                data: (res || [])
                    .map(item => ({ title: item.title, content: item.content, bm25: item.bm25 }))
                    .sort((a, b) => b.bm25 - a.bm25),
                total,
            };
        } catch (error) {
            console.log(error);
            ctx.response.body = {
                code: "error",
                msg: `${error}`,
                total: 0,
                data: [],
            };
        }
    })
    .post("/searchByBoolean", async ctx => {
        try {
            const { keyword } = ctx.request.body;
            const filter = getKeyfromQuerFormulation(keyword);
            console.log("检索树:\n", JSON.stringify(filter), "\n");
            const { data, code, msg, total } = await msgModel.find(filter, null, null, { keyword: 0 });
            ctx.response.body = {
                code,
                msg,
                total,
                data,
            };
        } catch (error) {
            ctx.response.body = {
                code: "error",
                msg: `${error}`,
                data: [],
                total: 0,
            };
        }
    })
    .post("/searchByVector", async ctx => {
        try {
            const { keyword, threshold = 0.8 } = ctx.request.body;
            const keywordList = jieba.extract(keyword, 10);
            const { data, total, code, msg } = await msgModel.find({
                "keyword.word": { $in: keywordList.map(item => item.word) },
            });
            const similarity = getSimilarity(keywordList, data);
            const res = similarity
                .sort((a, b) => b.similarity - a.similarity)
                .filter(item => item.similarity >= threshold);
            ctx.response.body = {
                code: "success",
                msg: "查询成功",
                total: (res || []).length,
                data: res,
            };
        } catch (error) {
            ctx.response.body = {
                code: "error",
                msg: `${error}`,
                total: 0,
                data: [],
            };
        }
    })
    .post("/insert", async ctx => {
        try {
            const { title, keyword, content } = ctx.request.body;
            const res = await msgModel.insert({
                title,
                keyword: jieba.extract(`${title}${title}${content}`, 20),
                content,
            });
            ctx.response.body = {
                msg: "导入成功",
                code: "success",
            };
        } catch (error) {
            ctx.response.body = {
                msg: `${error}`,
                code: "error",
            };
        }
    });

module.exports = router;
