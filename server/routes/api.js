const Router = require("koa-router");

const router = new Router({
    prefix: "/api",
});

router.post("/search", async ctx => {
    const { keyword } = ctx.request.body;
    console.log(keyword);
});

module.exports = router;
