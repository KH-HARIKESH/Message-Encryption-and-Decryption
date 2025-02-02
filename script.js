document.addEventListener('DOMContentLoaded', function() {
    const EC = elliptic.ec;
    const ec = new EC('p256');

    document.getElementById('encrypt-button').addEventListener('click', function() {
        const textToEncrypt = document.getElementById('text-to-encrypt').value;

        // Generate a random key pair
        const keyPair = ec.genKeyPair();
        const publicKey = keyPair.getPublic().encode('hex');
        const privateKey = keyPair.getPrivate('hex');

        // Use the private key to derive a shared secret
        const sharedSecret = keyPair.derive(ec.keyFromPublic(publicKey, 'hex').getPublic()).toString(16);

        // Use the shared secret as a symmetric key for AES encryption
        const encrypted = CryptoJS.AES.encrypt(textToEncrypt, sharedSecret).toString();

        document.getElementById('encrypted-text').value = encrypted;

        // Send data to the server to store in the database
        fetch('/store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cipherText: encrypted, key: privateKey })
        })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));

        // Create a Blob with the encrypted text and key
        const fileContent = `Cipher Text: ${encrypted}\nKey: ${privateKey}`;
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `encrypted_data_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Store the download URL in the button's data attribute
        document.getElementById('send-mail-button').setAttribute('data-download-url', url);

        // Show the "Send Mail" button
        document.getElementById('send-mail-button').style.display = 'inline-block';
    });

    document.getElementById('send-mail-button').addEventListener('click', function() {
        const downloadUrl = document.getElementById('send-mail-button').getAttribute('data-download-url');
        const subject = 'Encrypted Data';
        //const body = `Please find the encrypted data at the following link:\n${downloadUrl}`;
        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}`;

        // Use window.open to open the Gmail compose link
        window.open(gmailLink, '_blank');
    });

    document.getElementById('decrypt-button').addEventListener('click', function() {
        const cipherText = document.getElementById('text-to-decrypt').value;
        const key = document.getElementById('decryption-key').value;

        try {
            // Generate key pair from private key
            const keyPair = ec.keyFromPrivate(key, 'hex');

            // Use the public key derived from the private key to derive the shared secret
            const sharedSecret = keyPair.derive(keyPair.getPublic()).toString(16);

            // Decrypt the message using the shared secret
            const decrypted = CryptoJS.AES.decrypt(cipherText, sharedSecret).toString(CryptoJS.enc.Utf8);

            if (!decrypted) {
                throw new Error('Invalid decryption');
            }

            document.getElementById('decrypted-text').value = decrypted;
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('decrypted-text').value = 'Invalid cipher text or key';
        }
    });
});
