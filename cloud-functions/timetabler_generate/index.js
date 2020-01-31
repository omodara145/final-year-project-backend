const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./hackathon-justice-firebase-adminsdk-4abkg-9f0e9b2f4f.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hackathon-justice.firebaseio.com"
});
const firestore = admin.firestore();

class PriorityQueue {
    constructor(compareFn) {
        this.heap = [];
        if (compareFn) {
            this.compareFn = compareFn;
        } else {
            // ascending order by default
            this.compareFn = (a, b) => b - a;
        }
    }

    isEmpty() {
        return this.size() === 0;
    }

    size() {
        return this.heap.length;
    }

    peek() {
        if (this.isEmpty()) {
            throw new Error("Empty heap");
        }
        return this.heap[0];
    }

    add(item) {
        this.heap.push(item);
        this.siftUp();
    }

    remove() {
        if (this.isEmpty()) {
            throw new Error("Empty heap");
        }
        const item = this.heap[0];
        this.heap[0] = this.heap[this.size() - 1];
        this.heap.pop();
        this.siftDown();
        return item;
    }

    siftUp() {
        let index = this.size() - 1;
        while (
            this.hasParent(index) &&
            this.compareFn(this.heap[index], this.parent(index)) > 0
            ) {
            this.swap(index, this.getParentIndex(index));
            index = this.getParentIndex(index);
        }
    }

    siftDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let swapIndex = this.getLeftChildIndex(index);

            // if right child exists and right child has a higher priority, swap it
            if (
                this.hasRightChild(index) &&
                this.compareFn(this.leftChild(index), this.rightChild(index)) < 0
            ) {
                swapIndex = this.getRightChildIndex(index);
            }

            // if current index has higher priority that swapIndex, heap property restored
            if (this.compareFn(this.heap[index], this.heap[swapIndex]) > 0) {
                break;
            } else {
                this.swap(index, swapIndex);
            }
            index = swapIndex;
        }
    }

    swap(index1, index2) {
        let temp = this.heap[index1];
        this.heap[index1] = this.heap[index2];
        this.heap[index2] = temp;
    }

    getLeftChildIndex(index) {
        return 2 * index + 1;
    }

    getRightChildIndex(index) {
        return 2 * index + 2;
    }

    getParentIndex(index) {
        return Math.floor((index - 1) / 2);
    }

    hasLeftChild(index) {
        return this.getLeftChildIndex(index) < this.size();
    }

    hasRightChild(index) {
        return this.getRightChildIndex(index) < this.size();
    }

    hasParent(index) {
        return index !== 0 && this.getParentIndex(index) >= 0;
    }

    leftChild(index) {
        return this.heap[this.getLeftChildIndex(index)];
    }

    rightChild(index) {
        return this.heap[this.getRightChildIndex(index)];
    }

    parent(index) {
        return this.heap[this.getParentIndex(index)];
    }
}

const getUser = async (docId) => {
    const usersCollectionRef = firestore.collection('timetabler_users');


    const data = await usersCollectionRef.doc(docId).get();
    return data.data();

};


exports.timetabler_generate = async (req, res) => {

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

    if (!req.body.docId) {
        return res.status(200).send({statusCode: 400, message: 'docId required'});
    }


    if (!req.body.department) {
        return res.status(200).send({statusCode: 400, message: 'department required'});
    }
    const {department, semester, docId} = req.body;

    const snapshot = await coursesCollectionRef.where('department', '==', department).where('semester', '==', semester).get();

    if (snapshot.size === 0) {
        return res.status(200).send(
            {
                statusCode: 400,
                message: 'No courses'
            });
    }
    const data = [];
    snapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        data.push({
            docId: doc.id,
            ...doc.data()
        });
    });

    let queue = new PriorityQueue((a, b) => a.units - b.units);

    for (let temp of data) {
        queue.add(temp);
    }

    let timetable = [[], [], [], [], []];
    let idx = 0;
    while (!queue.isEmpty()) {
        let n = queue.size();
        let courses = [];
        for (let i = 0; i < n; i++) {
            if (!queue.isEmpty()) {
                let temp = queue.remove();
                temp.units--;
                courses.push(temp)
            }
        }
        for (let course of courses) {
            addToTimetable(timetable, idx, course.course_code);
            if (course.units > 0) {
                addToTimetable(timetable, idx, course.course_code);
                course.units--;
            }
            idx = (idx + 1) % 5;
            if (course.units > 0) {
                queue.add(course);
            }
        }
    }

    //
    const user = await getUser(docId);
    if (!user) {
        return res.status(200).send(
            {
                statusCode: 400,
                message: 'User does not exist'
            });
    }

    let table = {
        Monday: timetable[0],
        Tuesday: timetable[1],
        Wednesday: timetable[2],
        Thursday: timetable[3],
        Friday: timetable[4],
    };

    user.timetable = table;
    await firestore.collection('timetabler_users').doc(docId).set(user);
    return res.status(200).send(
        {
            statusCode: 200,
            message: 'Timetable generated successfully',
            data: table,

        });


};

function addToTimetable(timetable, i, course_code) {
    timetable[i].push(course_code);
}
