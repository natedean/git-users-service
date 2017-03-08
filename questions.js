const getCollection = require('./db').getCollection;
const ObjectID = require('mongodb').ObjectID;

const getAllQuestions = () => {
  return getCollection('questions').then(({ collection, db }) => {
    return collection.find({}).toArray().then(questions => {
      db.close();

      // probably poll for avgQuestionSpeed and save somewhere so we don't incur this overhead every time.
      const avgQuestionSpeed = questions.reduce((acc, question) => acc + question.totalTime, 0) / questions.length;

      return questions.map(question => {
        const { _id, answers, totalTime, totalCorrect, totalIncorrect, text } = question;
        const totalAttempts = totalCorrect + totalIncorrect;
        const correctnessIndex = totalAttempts / totalCorrect;
        const speedIndex = (totalTime / totalAttempts) / avgQuestionSpeed;
        const difficulty = parseFloat(correctnessIndex + speedIndex).toFixed(4);

        return Object.assign({}, { _id, answers, text, difficulty, correctnessIndex, speedIndex });
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
