const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const morgan = require('morgan');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const db = new sqlite3.Database('./database.db'); // This will create or open the SQLite database file

// Use morgan for logging
app.use(morgan('dev'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Increase the body size limit
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Create a table to store encrypted data if it doesn't exist
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS encrypted_data (id INTEGER PRIMARY KEY, cipher_text TEXT, key TEXT)');
});

// Generate ECC key pair (OpenSSL)
app.get('/generate-keys', (req, res) => {
    exec('openssl ecparam -name prime256v1 -genkey -noout -out private_key.pem && openssl ec -in private_key.pem -pubout -out public_key.pem', (err) => {
        if (err) {
            return res.status(500).send('Error generating keys');
        }
        res.send('Keys generated successfully');
    });
});

// Endpoint to store encrypted data
app.post('/store', (req, res) => {
    const { cipherText, key } = req.body;
    db.run('INSERT INTO encrypted_data (cipher_text, key) VALUES (?, ?)', [cipherText, key], function(err) {
        if (err) {
            return res.status(500).send('Error storing data');
        }
        res.send('Data stored successfully');
    });
});

// Endpoint to retrieve encrypted data (for decryption)
app.get('/retrieve/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT cipher_text, key FROM encrypted_data WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).send('Error retrieving data');
        }
        res.json(row);
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
