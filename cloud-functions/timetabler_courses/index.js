const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./hackathon-justice-firebase-adminsdk-4abkg-9f0e9b2f4f.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hackathon-justice.firebaseio.com"
});
const firestore = admin.firestore();

exports.timetabler_courses = async (req, res) => {

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
    const coursesCollectionRef = firestore.collection('timetabler_courses');
    if (!req.body.semester) {
        return res.status(200).send({statusCode: 400, message: 'semester required'});
    }


    if (!req.body.department) {
        return res.status(200).send({statusCode: 400, message: 'department required'});
    }
    const {department, semester} = req.body;

    const snapshot = await coursesCollectionRef.where('department', '==', department).where('semester', '==', semester).get();

    if (snapshot.size > 0) {
        const data = [];
        snapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            data.push({
                docId: doc.id,
                ...doc.data()
            });
        });
        return res.status(200).send({
            statusCode: 200,
            message: 'Courses fetched successful',
            data: data
        });
    } else {
        return res.status(200).send(
            {
                statusCode: 400,
                message: 'No courses'
            });
    }


};
