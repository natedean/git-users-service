const MONGO_URI = process.env.MONGO_URI;
const MongoClient = require('mongodb').MongoClient;

if (!MONGO_URI) throw('MONGO_URI environment variable must be set');

const getUsers = (pageOffset, limit, sortField, sortCode) =>
  MongoClient.connect(MONGO_URI)
    .then(db => {
      const collection = db.collection('users');
      const fieldsToRetrieve = { username: 1, gtScore: 1, _created_at: 1, _updated_at: 1 };

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

const createNewUser = (username) => {
  const newDoc = {
    username: username,
    gtScore: 0,
    _created_at: new Date(),
    _updated_at: new Date()
  };

  return getDbAndCollectionHandle('users').then(({collection, db}) => {
    return collection.insertOne(newDoc, { returnOriginal: false }).then(res => {
      console.log('inserted!', username);
      db.close();
      return updateUser(username);
    })
  });
};

const updateUser = (username) => {
  // assuming usernames are unique... just incrementing gtScore by one at the moment
  return getDbAndCollectionHandle('users').then(({collection, db}) => {
    return collection.findOneAndUpdate({username: username}, {$inc: {gtScore: 1}, $set: {_updated_at: new Date()}}, { returnOriginal: false })
      .then(res => {
        db.close();

        if (!res.value) { return createNewUser(username) }

        console.log('not inserting');

        return res;
      })
  });
};

module.exports = {
  getUsers,
  updateUser
};

function getDbAndCollectionHandle(collectionName) {
  return MongoClient.connect(MONGO_URI)
    .then(db => ({
      collection: db.collection(collectionName),
      db
    }));
}

