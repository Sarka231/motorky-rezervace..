const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, "reservations.json");

app.use(express.json());
app.use(express.static(__dirname));

function loadReservations() {
    try {
        if (!fs.existsSync(FILE)) {
            return [];
        }

        const content = fs.readFileSync(FILE, "utf8").trim();
        if (!content) {
            return [];
        }

        return JSON.parse(content);
    } catch (error) {
        console.error("Chyba při čtení reservations.json:", error);
        return [];
    }
}

function saveReservations(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

function normalizeText(value) {
    return String(value || "").trim();
}

function isValidTimeRange(from, to) {
    return from < to;
}

function hasTimeConflict(existing, incoming) {
    const sameBike = normalizeText(existing.bike) === normalizeText(incoming.bike);
    const sameDate = normalizeText(existing.date) === normalizeText(incoming.date);

    if (!sameBike || !sameDate) {
        return false;
    }

    const existingFrom = normalizeText(existing.from);
    const existingTo = normalizeText(existing.to);
    const incomingFrom = normalizeText(incoming.from);
    const incomingTo = normalizeText(incoming.to);

    return incomingFrom < existingTo && incomingTo > existingFrom;
}

app.get("/reservations", (req, res) => {
    const reservations = loadReservations();
    res.json(reservations);
});

app.post("/reserve", (req, res) => {
    const teacher = normalizeText(req.body.teacher);
    const bike = normalizeText(req.body.bike);
    const date = normalizeText(req.body.date);
    const from = normalizeText(req.body.from);
    const to = normalizeText(req.body.to);

    if (!teacher || !bike || !date || !from || !to) {
        return res.status(400).json({
            error: "Vyplň všechna pole."
        });
    }

    if (!isValidTimeRange(from, to)) {
        return res.status(400).json({
            error: "Čas od musí být menší než čas do."
        });
    }

    const reservations = loadReservations();

    const newReservation = {
        teacher,
        bike,
        date,
        from,
        to
    };

    const conflict = reservations.find(existing =>
        hasTimeConflict(existing, newReservation)
    );

    if (conflict) {
        return res.status(409).json({
            error: `Motorka ${bike} je v tomto termínu již rezervovaná.`
        });
    }

    reservations.push(newReservation);
    saveReservations(reservations);

    return res.json({
        success: true,
        message: "Rezervace byla úspěšně uložena."
    });
});

app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});