const { Sql, Schema } = require("../sql");

const schema = new Schema(
    {
        title: String,
        keyword: Array,
        content: String,
    },
    { minimize: false, versionKey: false }
);

module.exports = {
    msgModel: Sql({
        schema,
        collectionName: "msg",
    }),
};
