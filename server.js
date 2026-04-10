const express = require("express");
const app = express();
const fs = require("fs");

app.use(express.json());
app.use(express.static("."));

const FILE = "reservations.json";

function load() {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

app.get("/reservations", (req, res) => {
    res.json(load());
});

app.post("/reserve", (req, res) => {
    const reservations = load();
    reservations.push(req.body);
    save(reservations);
    res.json({ status: "ok" });
});

app.listen(3000, () => console.log("Server běží na http://localhost:3000"));


