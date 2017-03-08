const getCollection = require('./db').getCollection;

let cachedStats;

const getStats = () => cachedStats;

const _aggregateStats = () => {
  return getCollection('users').then(({collection, db}) => {
    return new Promise((resolve, reject) => {

      const projectionOne = {
        $project: {
          totalCorrect: 1,
          percentCorrect: { $divide: [ '$totalCorrect', { $add: ['$totalCorrect', '$totalIncorrect'] }  ] }
        }
      };

      const group = {
        $group: {
          _id: null,
          avgTotalCorrect: { $avg: '$totalCorrect'  },
          avgPercentCorrect: { $avg: '$percentCorrect' }
        }
      };

      const projectionTwo = {
        $project: {
          _id: 0,
          avgTotalCorrect: 1,
          avgPercentCorrect: 1
        }
      };

      collection.aggregate([projectionOne, group, projectionTwo], (err, result) => {
        db.close();

        return resolve(Object.assign({}, result[0]));
      });
    });
  });
};

// get amount of users for each individual _created_at Y-m-d in the collection
//aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_created_at' } }, count: { $sum: 1 }  }  },{  $sort: { _id: -1 }  } ]);

const _pollStats = () => {
  _aggregateStats().then((stats) => {
    console.log('setting stats', JSON.stringify(stats));
    cachedStats = Object.assign({}, cachedStats, stats);
  });
};

_pollStats();
setInterval(_pollStats, 100000);

module.exports = getStats;
