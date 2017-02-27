const MONGO_URI = process.env.MONGO_URI;
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

if (!MONGO_URI) throw('MONGO_URI environment variable must be set');

const getUsers = (pageOffset, limit, sortField, sortCode) =>
  MongoClient.connect(MONGO_URI)
    .then(db => {
      const collection = db.collection('users');
      const fieldsToRetrieve = {
        username: 1,
        totalCorrect: 1,
        totalIncorrect: 1,
        skill: 1,
        _created_at: 1,
        _updated_at: 1
      };

      return collection
        .find({}, fieldsToRetrieve)
        .skip(pageOffset)
        .limit(limit)
        .sort([sortField, sortCode])
        .toArray()
        .then(users => {
          db.close();
          return users;
        });
    });

const createNewUser = (username = 'Random User') => {
  const newDoc = {
    username: username,
    totalCorrect: 0,
    totalIncorrect: 0,
    correctIds: [],
    incorrectIds: [],
    _created_at: new Date(),
    _updated_at: new Date()
  };

  return getDbAndCollectionHandle('users').then(({collection, db}) => {
    return collection.insertOne(newDoc, { returnOriginal: false }).then(res => {
      db.close();
      return res.ops[0];
    })
  });
};

const handleAnswerEvent = (answerData) => {
  const query = {_id: ObjectID(answerData.userId)};
  const changeSet = {
    $inc: answerData.isCorrect ? {totalCorrect: 1} : {totalIncorrect: 1},
    $set: {_updated_at: new Date()},
    $addToSet: answerData.isCorrect ? { correctIds: answerData.questionId } : { incorrectIds: answerData.questionId },
    $pull: answerData.isCorrect ? { incorrectIds: answerData.questionId } : { correctIds: answerData.questionId }
  };
  const options = { returnOriginal: false };

  return getDbAndCollectionHandle('users').then(({collection, db}) => {
    return collection.findOneAndUpdate(query, changeSet, options).then(res => {
        db.close();
        return res.value;
      })
  });
};

module.exports = {
  createNewUser,
  getUsers,
  handleAnswerEvent
};
