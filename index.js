const app = require('express')();
const cors = require('cors');
const db = require('./db');
const questions = require('./questions');
const getStats = require('./getStats');
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/users', (req, res) => {
  const limit = 20;
  const page = req.query.page || 1;
  const pageOffset = page <= 1 ? 0 : page * limit;
  const sortDirection = req.query.sortDirection || 'desc';
  const sortCode = sortDirection === 'desc' ? -1 : 1;
  const sortField = req.query.sortField || '_create_at';

  db.getUsers(pageOffset, limit, sortField, sortCode)
    .then(users => res.send(users))
    .catch(() => res.send('There has been an error connecting to the database'));
});

app.get('/user/:id', (req, res) => {
  if (!req.params.id) return res.send('No results. You must include a userId.');

  // TODO: add getUserById implementation
});

app.post('/user/answer', (req, res) => {
  const answerData = req.body;

  questions.updateQuestion(answerData.questionId, answerData.isCorrect, answerData.milliseconds);

  if (!answerData.userId) {
    console.log('creating new user!');

    return db.createNewUser().then(user => {
      const updatedUserData = Object.assign({}, answerData, { userId: user._id });

      return db.handleAnswerEvent(updatedUserData)
        .then(user => {
          res.send(user);
        })
        .catch(err => {
          res.send('There has been an error updating the user');
        });
    });
  }

  db.handleAnswerEvent(answerData)
    .then(user => res.send(user))
    .catch(() => res.send('There has been an error updating the user'));
});

app.get('/questions', (req, res) => {
  questions.getAllQuestions()
    .then(questions => res.send(questions))
    .catch(() => res.send('There has been an error getting questions'));
});

app.get('/stats', (req, res) => {
  res.send(getStats());
});

app.listen(3001, () => {
  console.log('Server listening on PORT 3001')
});

