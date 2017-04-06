const getCollection = require('./db').getCollection;

const POLL_INTERVAL = 30 * 60 * 1000;
let cachedStats;

const getCachedStats = () => cachedStats;

const setCachedStats = (newStats) => {
  cachedStats = Object.assign({}, cachedStats, newStats);
};

const getColumnAvgsFromDb = getCollection('users').then(({collection, db}) => {
  return new Promise((resolve, reject) => {

    const projectionOne = {
      $project: {
        _id: 0,
        totalCorrect: 1,
        totalAttempts: { $add: ['$totalCorrect', '$totalIncorrect'] }
      }
    };

    const match = {
      $match: {
        totalAttempts: { $ne: null, $gt: 5 }
      }
    };

    const projectionTwo = {
      $project: {
        totalCorrect: 1,
        totalAttempts: 1,
        correctRatio: { $divide: [ '$totalCorrect', '$totalAttempts' ] }
      }
    };

    const group = {
      $group: {
        _id: null,
        avgTotalCorrect: { $avg: '$totalCorrect'  },
        avgTotalAttempts: { $avg: '$totalAttempts' },
        avgCorrectRatio: { $avg: '$correctRatio' }
      }
    };

    const projectionThree = {
      $project: {
        _id: 0,
        avgTotalCorrect: 1,
        avgTotalAttempts: 1,
        avgCorrectRatio: 1
      }
    };

    collection.aggregate([projectionOne, match, projectionTwo, group, projectionThree], (err, res) => {
      db.close();

      return resolve(Object.assign({}, _roundValues(res[0])));
    });
  });
});


const saveDailyStatsToDb = (stats) => {
  const date = new Date();
  const dateString = date.toLocaleDateString();

  getCollection('dailyStats').then(({collection, db}) => {
    const update = Object.assign({}, stats, { dateString, _updated_at: date });
    collection.findOneAndUpdate(
        { dateString },
        { $set: update },
        { $sort: { date: 1 }, upsert: true, returnNewDocument: true }
      ).then(res => { db.close(); })
      .catch(err => { db.close(); });
  });
};


const getUsersCountFromDb = getCollection('users').then(({ collection, db }) => {
  return collection.find({}).count().then(res => {
    db.close();
    return res;
  });
});

const getQuestionsCountFromDb = getCollection('questions').then(({ collection, db }) => {
  return collection.find({}).count().then(res => {
    db.close();
    return res;
  });
});

const pollDbForStats = () => {
  Promise.all([getColumnAvgsFromDb, getUsersCountFromDb, getQuestionsCountFromDb])
    .then(([columnAvgs, usersCount, questionsCount]) => {
      const stats = Object.assign({}, columnAvgs, { usersCount, questionsCount });

      console.log('retrieved stats from db, ready to cache.', JSON.stringify(stats));

      setCachedStats(stats);
      saveDailyStatsToDb(stats);
    });
};

pollDbForStats();
setInterval(pollDbForStats, POLL_INTERVAL);

function _roundValues(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = parseFloat(obj[key]).toFixed(2);
    return acc;
  }, {});
}

module.exports = { getCachedStats };

