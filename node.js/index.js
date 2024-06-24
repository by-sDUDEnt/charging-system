const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 3000;

// MongoDB connection URL and Database Name
const url = 'mongodb://localhost:27017';
const dbName = 'mydatabase';
let db;

// Connect to MongoDB
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
    db = client.db(dbName);
    console.log('Connected to MongoDB');
});

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Handle GET requests
app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

// Handle GET requests with a parameter
app.get('/data', (req, res) => {
    const { id } = req.query;
    res.send(`Received GET request with id: ${id}`);
});

// Handle POST requests
app.post('/data', (req, res) => {
    const { data } = req.body;
    const collection = db.collection('data');

    collection.insertOne({ data: data }, (err, result) => {
        if (err) {
            res.status(500).send('Error inserting data');
            return;
        }
        res.send(`Received POST request with data: ${data}`);
    });
});

// Endpoint to get battery data
app.get('/batteries', (req, res) => {
    const collection = db.collection('batteries');
    collection.find({}).toArray((err, batteries) => {
        if (err) {
            res.status(500).send('Error fetching batteries data');
            return;
        }
        res.json(batteries);
    });
});

// View stats
app.get('/stats', (req, res) => {
    const collection = db.collection('stats');
    collection.findOne({}, (err, stats) => {
        if (err) {
            res.status(500).send('Error fetching stats');
            return;
        }
        res.json(stats);
    });
});

// Pause charging
app.post('/batteries/:id/pause', (req, res) => {
    const { id } = req.params;
    const collection = db.collection('batteries');
    collection.updateOne(
        { _id: ObjectId(id) },
        { $set: { charging: false } },
        (err, result) => {
            if (err) {
                res.status(500).send('Error pausing charging');
                return;
            }
            res.send(`Charging paused for battery ID: ${id}`);
        }
    );
});

// Resume charging
app.post('/batteries/:id/resume', (req, res) => {
    const { id } = req.params;
    const collection = db.collection('batteries');
    collection.updateOne(
        { _id: ObjectId(id) },
        { $set: { charging: true } },
        (err, result) => {
            if (err) {
                res.status(500).send('Error resuming charging');
                return;
            }
            res.send(`Charging resumed for battery ID: ${id}`);
        }
    );
});

// Add charged battery to stats
app.post('/batteries/:id/chargeComplete', (req, res) => {
    const { id } = req.params;
    const batteriesCollection = db.collection('batteries');
    const statsCollection = db.collection('stats');

    batteriesCollection.updateOne(
        { _id: ObjectId(id) },
        { $set: { charging: false, charged: true } },
        (err, result) => {
            if (err) {
                res.status(500).send('Error updating battery status');
                return;
            }

            statsCollection.updateOne(
                {},
                { $inc: { chargedBatteries: 1 } },
                { upsert: true },
                (err, result) => {
                    if (err) {
                        res.status(500).send('Error updating stats');
                        return;
                    }
                    res.send(`Battery ID: ${id} marked as charged`);
                }
            );
        }
    );
});

// Add halted battery to stats
app.post('/batteries/:id/halt', (req, res) => {
    const { id } = req.params;
    const batteriesCollection = db.collection('batteries');
    const statsCollection = db.collection('stats');

    batteriesCollection.updateOne(
        { _id: ObjectId(id) },
        { $set: { charging: false, halted: true } },
        (err, result) => {
            if (err) {
                res.status(500).send('Error updating battery status');
                return;
            }

            statsCollection.updateOne(
                {},
                { $inc: { haltedBatteries: 1 } },
                { upsert: true },
                (err, result) => {
                    if (err) {
                        res.status(500).send('Error updating stats');
                        return;
                    }
                    res.send(`Battery ID: ${id} marked as halted`);
                }
            );
        }
    );
});

// Change current number of batteries charging
app.post('/batteries/:id/updateChargingCount', (req, res) => {
    const { id } = req.params;
    const { increment } = req.body;
    const statsCollection = db.collection('stats');

    statsCollection.updateOne(
        {},
        { $inc: { currentChargingBatteries: increment } },
        { upsert: true },
        (err, result) => {
            if (err) {
                res.status(500).send('Error updating charging count');
                return;
            }
            res.send(`Updated charging count for battery ID: ${id}`);
        }
    );
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});