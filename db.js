const MONGO_URI = process.env.MONGO_URI;
const MongoClient = require('mongodb').MongoClient;

if (!MONGO_URI) throw('MONGO_URI environment variable must be set');

const getUsers = (pageOffset, limit) =>
  MongoClient.connect(MONGO_URI)
    .then(db => {
      const collection = db.collection('users');
      const fieldsToRetrieve = { username: 1, gtScore: 1, _created_at: 1, _updated_at: 1 };

      return collection.find({}, fieldsToRetrieve).skip(pageOffset).limit(limit).toArray()
        .then(users => {
          db.close();
          console.log(users.length);
          return users;
        });
    });

module.exports = {
  getUsers
};