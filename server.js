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

function isReservationVisible(reservation) {
    const endDateTime = new Date(`${reservation.date}T${reservation.to}:00`);
    if (isNaN(endDateTime.getTime())) {
        return true;
    }

    const visibleUntil = new Date(endDateTime);
    visibleUntil.setDate(visibleUntil.getDate() + 2);

    return new Date() <= visibleUntil;
}

function getVisibleReservations() {
    const allReservations = loadReservations();
    return allReservations.filter(isReservationVisible);
}

app.get("/reservations", (req, res) => {
    const reservations = getVisibleReservations();
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

    const allReservations = loadReservations();

    const newReservation = {
        teacher,
        bike,
        date,
        from,
        to
    };

    const conflict = allReservations.find(existing =>
        hasTimeConflict(existing, newReservation)
    );

    if (conflict) {
        return res.status(409).json({
            error: `Motorka ${bike} je v tomto termínu již rezervovaná.`
        });
    }

    allReservations.push(newReservation);
    saveReservations(allReservations);

    return res.json({
        success: true,
        message: "Rezervace byla úspěšně uložena."
    });
});

app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});