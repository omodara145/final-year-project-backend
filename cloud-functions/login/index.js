const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./hackathon-justice-firebase-adminsdk-4abkg-9f0e9b2f4f.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hackathon-justice.firebaseio.com"
});
const firestore = admin.firestore();

exports.timetabler_login = async (req, res) => {

    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    } else {
        // Set CORS headers for the main request
        res.set('Access-Control-Allow-Origin', '*');
    }

    switch (req.method) {
        case 'POST':
            handlePOST(req, res);
            break;
        default:
            res.status(405).send({statusCode: 405, message: 'Method not allowed'});
            break;
    }

};

const handlePOST = async (req, res) => {
    const usersCollectionRef = firestore.collection('timetabler_users');

    if (!req.body.email) {
        return res.status(200).send({statusCode: 400, message: 'email required'});
    }

    if (!req.body.password) {
        return res.status(200).send({statusCode: 400, message: 'password required'});
    }
    const {email, password} = req.body;

    const snapshot = await usersCollectionRef.where('email', '==', email).where('password', '==', password).get();

    if (snapshot.size > 0) {
        const user = [];
        snapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            user.push({
                docId: doc.id,
                ...doc.data()
            });
            return res.status(200).send({
                statusCode: 200,
                message: 'Login successful',
                data: user[0]
            });
        });
    } else {
        return res.status(200).send(
            {
                statusCode: 400,
                message: 'User does not exist'
            });
    }


};
