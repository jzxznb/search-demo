const { Sql, Schema } = require("../sql");

const schema = new Schema(
    {
        title: String,
        keywords: Array,
        content: String,
    },
    { minimize: false, versionKey: false }
);

module.exports = {
    articleModel: Sql({
        schema,
        collectionName: "msg",
    }),
};
