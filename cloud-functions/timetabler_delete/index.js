const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./hackathon-justice-firebase-adminsdk-4abkg-9f0e9b2f4f.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hackathon-justice.firebaseio.com"
});
const firestore = admin.firestore();

exports.timetabler_delete = async (req, res) => {

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

    if (!req.body.docId) {
        return res.status(200).send({statusCode: 400, message: 'docId required'});
    }

    const {docId} = req.body;

    const resp = await usersCollectionRef.doc(docId).get();
    if (!resp.exists) {
        return res.status(200).send({statusCode: 400, message: 'User doesnt exist'});
    }

    const user = resp.data();
    user.timetable = false;
    await usersCollectionRef.doc(docId).set(user);
    return res.status(200).send({statusCode: 200, message: 'Timetable deleted successfully'});

};
