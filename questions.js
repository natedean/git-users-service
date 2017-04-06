const getCollection = require('./db').getCollection;
const ObjectID = require('mongodb').ObjectID;


// at some point set up polling for the questions bank, because it won't change that often...
// we could get avgQuestionSpeed from an .aggregate method
// the rest of the avgs from an aggregate too....
let questions;

const getAvgQuestionSpeedFromDb = getCollection('questions').then(({ collection, db }) => {
  return new Promise((resolve, reject) => {

    const projection = {
      $project: {
        _id: 0,
        avgResponseTime: { $divide: ['$totalTime', { $add: ['$totalCorrect', '$totalIncorrect'] }]}
      }
    };

    const group = {
      $group: {
        _id: null,
        avgTime: {$avg: '$avgResponseTime'}
      }
    };

    return collection.aggregate([projection, group], (err, res) => {
      const roundedAvg = parseFloat(res[0].avgTime * 0.001).toFixed(4);
      db.close();
      return resolve(roundedAvg);
    });
  });
});

Promise.resolve(getAvgQuestionSpeedFromDb).then(xs => console.dir(xs));

const getAllQuestions = () => {
  return getCollection('questions').then(({ collection, db }) => {
    return collection.find({}).toArray().then(questions => {
      db.close();

      // probably poll for avgQuestionSpeed and save somewhere so we don't incur this overhead every time.
      const avgQuestionSpeed = questions.reduce((acc, question) => acc + question.totalTime, 0) / questions.length;

      return questions.map(question => {
        const { _id, answers, totalTime, totalCorrect, totalIncorrect, text, helpers } = question;
        const totalAttempts = totalCorrect + totalIncorrect;
        const correctnessIndex = totalAttempts / totalCorrect;
        const speedIndex = (totalTime / totalAttempts) / avgQuestionSpeed;
        const difficulty = correctnessIndex + speedIndex;

        return {
          _id,
          answers,
          text,
          helpers,
          correctnessIndex: round(correctnessIndex),
          speedIndex: round(speedIndex),
          difficulty: round(difficulty)
        };

      });
    });
  });
};

const updateQuestion = (id, isCorrect, milliseconds) => {
  if (!id || !milliseconds) return;

  const cappedMilliseconds = milliseconds < 30000 ? milliseconds : 30000;

  const query = {_id: ObjectID(id)};
  const changeSet = {
    $inc: getUpdateQuestionChangeset(isCorrect, cappedMilliseconds)
  };

  return getCollection('questions').then(({ collection, db }) => {
    return collection.findOneAndUpdate(query, changeSet).then(res => {
      db.close();
    })
  });
};

module.exports = {
  getAllQuestions,
  updateQuestion
};

function getUpdateQuestionChangeset(isCorrect, cappedMilliseconds) {
  if (isCorrect) {
    return { totalTime: cappedMilliseconds, totalCorrect: 1 }
  } else {
    return { totalIncorrect: 1 }
  }
}

function round(x) {
  return parseFloat(x).toFixed(4);
}
