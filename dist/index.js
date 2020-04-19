"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const app = express();
const port = process.env.PORT || 3005;
app.use(express.json());
app.listen(port, () => {
    console.log(`> Ready On Server http://${(process as any).env.HOST}:${port}`);
});
app.get('/get', (_req, res, _next) => {
    res.json({
        version: process.env.VERSION || '0.0.1',
    });
});
app.post('/post', function (request, response) {
    response.send(request.body);
});
//# sourceMappingURL=index.js.map
