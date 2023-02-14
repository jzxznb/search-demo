const mongoose = require("mongoose");
const default_url = "mongodb://127.0.0.1:27017/search_demo";

class SqlClass {
    schema = {};
    url = "";
    collectionName = "";
    model = {};
    constructor({ schema = {}, collectionName = "" }) {
        this.schema = schema;
        this.collectionName = collectionName;
        this.model = mongoose.model(this.collectionName, this.schema);
    }

    async insert(info) {
        try {
            const Model = this.model;
            const newInfo = new Model(info);
            await newInfo.save();
            return { ...newInfo, code: "success", msg: "添加成功" };
        } catch (error) {
            console.log("mongoose-insert-error");
            return { msg: `${error}`, code: "error" };
        }
    }

    async insertMany(arr) {
        console.log(arr);
        try {
            const data = await this.model.insertMany(arr);
        } catch (error) {}
    }

    async find(filter = {}, pageSize = 10, currentPage = 0, projection = {}, sort = {}) {
        try {
            const pro1 = this.model
                .find(filter, projection)
                .sort(sort)
                .limit(pageSize)
                .skip(currentPage * pageSize);
            const pro2 = this.model.countDocuments(filter);
            const [data, total] = await Promise.all([pro1, pro2]);
            return {
                data,
                total,
                code: "success",
                msg: "查找成功",
            };
        } catch (error) {
            console.log("mongoose-find-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }

    async findOne(filter = {}) {
        try {
            const data = await this.model.findOne(filter);
            return {
                data,
                msg: "查找成功",
                code: "success",
            };
        } catch (error) {
            console.log("mongoose-findone-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }

    async updateOne(filter, doc, options = { new: true }) {
        try {
            if (!filter || !doc) throw new Error("请确保数据完整");
            const data = await this.model.findOneAndUpdate(filter, doc, options);
            return {
                data,
                code: "success",
                msg: "修改成功",
            };
        } catch (error) {
            console.log("mongoose-update-one-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }

    async removeMany(filter) {
        try {
            if (!filter) throw new Error("请确保数据完整");
            const res = await this.model.deleteMany(filter);
            return res;
        } catch (error) {
            console.log("mongoose-removeMany-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }

    async removeOne(filter) {
        try {
            if (!filter) throw new Error("请确保数据完整");
            const { deletedCount } = await this.model.deleteOne(filter);
            return deletedCount === 1
                ? { code: "success", msg: "删除成功" }
                : { code: "error", msg: "删除失败: 数据可能不存在" };
        } catch (error) {
            console.log("mongoose-removeOne-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }

    async aggregate() {
        try {
            const data = await this.model.aggregate(...arguments);
            return {
                msg: "查找成功",
                data,
                code: "success",
            };
        } catch (error) {
            console.log("mongoose-aggregate-error", error);
            return { msg: `${error}`, code: "error" };
        }
    }
}

const Sql = options => new SqlClass(options);

function connectDB(url) {
    mongoose.set("strictQuery", false);
    mongoose.connect(url || default_url, { useUnifiedTopology: true, useNewUrlParser: true }).then(res => {
        console.log("------------连接数据库成功---------");
    });
}

module.exports = {
    Sql,
    connectDB,
    Schema: mongoose.Schema,
};
