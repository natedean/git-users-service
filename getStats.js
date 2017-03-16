const getCollection = require('./db').getCollection;

let cachedStats;

const getStats = () => cachedStats;

const _aggregateStats = () => {
  return getCollection('users').then(({collection, db}) => {
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
};


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

const getTableCounts = () => {
  const usersCountPromise = getCollection('users').then(({ collection, db }) => {
    return collection.find({}).count().then(res => {
      db.close();
      return res;
    });
  });

  const questionsCountPromise = getCollection('questions').then(({ collection, db }) => {
    return collection.find({}).count().then(res => {
      db.close();
      return res;
    });
  });

  return Promise.all([usersCountPromise, questionsCountPromise])
    .then(([usersCount, questionsCount]) => {
      return { usersCount, questionsCount };
    });
};

// get amount of users for each individual _created_at Y-m-d in the collection
//aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_created_at' } }, count: { $sum: 1 }  }  },{  $sort: { _id: -1 }  } ]);

const _pollStats = () => {
  _aggregateStats().then((aggregateStats) => {
    console.log('setting aggregateStats', JSON.stringify(aggregateStats));

    // save locally for fast retrieval
    cachedStats = Object.assign({}, cachedStats, aggregateStats);

    getTableCounts().then(tableCounts => {
      return Object.assign({}, aggregateStats, tableCounts);
    }).then(allStats => {
      saveDailyStatsToDb(allStats);
    });
  });
};

_pollStats();
setInterval(_pollStats, 100000);

module.exports = getStats;

function _roundValues(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = parseFloat(obj[key]).toFixed(2);
    return acc;
  }, {});
}
