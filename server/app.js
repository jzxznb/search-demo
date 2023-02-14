const Koa = require("koa");
const app = new Koa();
const bodyparser = require("koa-bodyparser");
const apiRouter = require("./routes/api");
const { connectDB } = require("./sql");

connectDB();
// middlewares
app.use(
    bodyparser({
        enableTypes: ["json", "form", "text"],
    })
);

// logger
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// routes
app.use(apiRouter.routes(), apiRouter.allowedMethods());

module.exports = app;
