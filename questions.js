const getCollection = require('./db').getCollection;
const ObjectID = require('mongodb').ObjectID;

const getAllQuestions = () => {
  return getCollection('questions').then(({ collection, db }) => {
    return collection.find({}).toArray().then(questions => {
      db.close();

      const avgQuestionSpeed = questions.reduce((acc, question) => acc + question.totalTime, 0) / questions.length;

      console.log('avgQuestionSpeed', avgQuestionSpeed);

      return questions.map(question => {
        const { _id, answers, totalTime, totalCorrect, totalIncorrect, text } = question;
        const totalAttempts = totalCorrect + totalIncorrect;
        const correctnessIndex = parseFloat(totalCorrect / totalAttempts).toFixed(5);
        const speedIndex = parseFloat((totalTime / totalAttempts) / avgQuestionSpeed).toFixed(5);
        const difficulty = parseFloat(correctnessIndex + speedIndex).toFixed(5);

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
